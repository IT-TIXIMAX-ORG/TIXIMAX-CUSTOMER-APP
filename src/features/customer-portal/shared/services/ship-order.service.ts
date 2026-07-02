import { httpClient } from '@/src/shared/lib/http/http-client';
import type {
  AllingoQuote,
  BookAllingoResponse,
  CancelAllingoRequest,
  CreateShipOrderRequest,
  DraftShipOrderSummary,
  ShipOrder,
  ShipOrderListQuery,
  ShipOrderListResponse,
  ShipOrderShippingListItem,
  ShipOrderStatus,
  ShipOrderSummaryItem,
  SyncAllingoResponse,
  UpdateShipOrderPayload,
} from '../types/ship-order.types';

const BASE_URL = '/customer-portal/ship-orders';

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const toArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const toString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
};

const toNullableString = (value: unknown): string | null => {
  const s = toString(value);
  return s ? s : null;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const unwrapResult = (value: unknown): unknown => {
  const source = toRecord(value);
  return source.result ?? source.data ?? value;
};

// Kiện trong summary có thể trả string[] hoặc object[] → chuẩn hóa về mảng tracking code.
const toTrackingCodeArray = (value: unknown): string[] =>
  toArray(value)
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      const record = toRecord(item);
      return toString(
        record.trackingCode ?? record.tracking_code ?? record.shipmentCode ?? record.code,
      ).trim();
    })
    .filter(Boolean);

const mapShippingListItem = (value: unknown): ShipOrderShippingListItem => {
  const source = toRecord(value);
  return {
    trackingCode: toString(source.trackingCode ?? source.tracking_code ?? source.code),
    status: toString(source.status),
    warehouseName: toString(source.warehouseName ?? source.warehouse_name ?? source.warehouse),
    shipPaymentStatus: toNullableString(source.shipPaymentStatus ?? source.ship_payment_status) ?? undefined,
    shipPaymentCode: toNullableString(source.shipPaymentCode ?? source.ship_payment_code) ?? undefined,
    partiallyPaid: typeof source.partiallyPaid === 'boolean' ? source.partiallyPaid : undefined,
    orderLinks: toArray(source.orderLinks ?? source.order_links).map((linkValue) => {
      const link = toRecord(linkValue);
      return {
        linkId: toNumber(link.linkId ?? link.id),
        status: toString(link.status),
        productName: toString(link.productName ?? link.product_name),
        quantity: toNumber(link.quantity),
        deliveredQuantity: toNullableNumber(link.deliveredQuantity ?? link.delivered_quantity),
      };
    }),
  };
};

const mapShipOrder = (value: unknown): ShipOrder => {
  const source = toRecord(value);
  return {
    shipOrderId: toString(source.shipOrderId ?? source.ship_order_id ?? source.id),
    shipCode: toString(source.shipCode ?? source.ship_code),
    draftDomesticId: toString(source.draftDomesticId ?? source.draft_domestic_id),
    shippingList: toArray(source.shippingList ?? source.shipping_list).map(mapShippingListItem),
    customerName: toNullableString(source.customerName ?? source.customer_name),
    customerCode: toNullableString(source.customerCode ?? source.customer_code),
    status: (toString(source.status) || 'PENDING') as ShipOrderStatus,
    carrierId: toNullableString(source.carrierId ?? source.carrier_id),
    carrierCode: toNullableString(source.carrierCode ?? source.carrier_code) ?? undefined,
    carrierName: toNullableString(source.carrierName ?? source.carrier_name),
    carrierTrackingCode: toNullableString(source.carrierTrackingCode ?? source.carrier_tracking_code),
    note: toNullableString(source.note),
    weight: toNullableNumber(source.weight),
    createdAt: toNullableString(source.createdAt ?? source.created_at),
    subCarrierNote: toNullableString(source.subCarrierNote ?? source.sub_carrier_note),
    address: toNullableString(source.address),
    phoneNumber: toNullableString(source.phoneNumber ?? source.phone_number),
    bookingTime: toNullableString(source.bookingTime ?? source.booking_time),
    allingoOrderId: toNullableString(source.allingoOrderId ?? source.allingo_order_id),
    allingoTrackId: toNullableString(source.allingoTrackId ?? source.allingo_track_id),
    allingoPartnerName: toNullableString(source.allingoPartnerName ?? source.allingo_partner_name),
    allingoServiceName: toNullableString(source.allingoServiceName ?? source.allingo_service_name),
    allingoQuotedPrice: toNullableNumber(source.allingoQuotedPrice ?? source.allingo_quoted_price),
    allingoStatus: (toNullableString(source.allingoStatus ?? source.allingo_status) as ShipOrder['allingoStatus']) ?? null,
    allingoDriverName: toNullableString(source.allingoDriverName ?? source.allingo_driver_name),
    allingoDriverPhone: toNullableString(source.allingoDriverPhone ?? source.allingo_driver_phone),
    allingoDriverPhotoUrl: toNullableString(source.allingoDriverPhotoUrl ?? source.allingo_driver_photo_url),
    allingoDriverLicensePlate: toNullableString(
      source.allingoDriverLicensePlate ?? source.allingo_driver_license_plate,
    ),
    allingoFeeTotal: toNullableNumber(source.allingoFeeTotal ?? source.allingo_fee_total),
    allingoBookedAt: toNullableString(source.allingoBookedAt ?? source.allingo_booked_at),
    allingoDeliveredAt: toNullableString(source.allingoDeliveredAt ?? source.allingo_delivered_at),
    allingoFailureReason: toNullableString(source.allingoFailureReason ?? source.allingo_failure_reason),
    allingoCancellationReason: toNullableString(
      source.allingoCancellationReason ?? source.allingo_cancellation_reason,
    ),
  };
};

const mapSummaryItem = (value: unknown): ShipOrderSummaryItem => {
  const source = toRecord(value);
  return {
    shipOrderId: toString(source.shipOrderId ?? source.ship_order_id ?? source.id),
    shipCode: toString(source.shipCode ?? source.ship_code),
    shippingList: toTrackingCodeArray(source.shippingList ?? source.shipping_list),
    status: (toString(source.status) || 'PENDING') as ShipOrderStatus,
    carrierId: toNullableString(source.carrierId ?? source.carrier_id),
    carrierCode: toNullableString(source.carrierCode ?? source.carrier_code) ?? undefined,
    carrierName: toNullableString(source.carrierName ?? source.carrier_name),
    allingoStatus: (toNullableString(source.allingoStatus ?? source.allingo_status) as AllingoStatusValue) ?? null,
    bookingTime: toNullableString(source.bookingTime ?? source.booking_time) ?? undefined,
  };
};

type AllingoStatusValue = ShipOrderSummaryItem['allingoStatus'];

const mapSummary = (value: unknown): DraftShipOrderSummary => {
  const source = toRecord(unwrapResult(value));
  return {
    draftDomesticId: toString(source.draftDomesticId ?? source.draft_domestic_id),
    shipCode: toString(source.shipCode ?? source.ship_code),
    draftStatus: toString(source.draftStatus ?? source.draft_status),
    totalKien: toTrackingCodeArray(source.totalKien ?? source.total_kien),
    claimedKien: toTrackingCodeArray(source.claimedKien ?? source.claimed_kien),
    availableKien: toTrackingCodeArray(source.availableKien ?? source.available_kien),
    shipOrders: toArray(source.shipOrders ?? source.ship_orders).map(mapSummaryItem),
  };
};

const mapListResponse = (
  value: unknown,
  fallbackPage: number,
  fallbackSize: number,
): ShipOrderListResponse => {
  const result = unwrapResult(value);
  const source = toRecord(result);
  const rawContent = Array.isArray(result) ? result : toArray(source.content);
  const content = rawContent.map(mapShipOrder);
  const size = toNumber(source.size, fallbackSize);
  const totalElements = toNumber(source.totalElements ?? source.total, content.length);
  return {
    content,
    page: toNumber(source.page ?? source.number, fallbackPage),
    size,
    totalElements,
    totalPages: toNumber(
      source.totalPages,
      size > 0 ? Math.max(1, Math.ceil(totalElements / size)) : 1,
    ),
  };
};

// ─── Summary (cho màn Tạo đơn giao) ──────────────────────────────────────────

export const getShipOrderSummary = async (
  draftDomesticId: string,
): Promise<DraftShipOrderSummary> => {
  const response = await httpClient.get(
    `/customer-portal/draft-domestics/${draftDomesticId}/ship-order-summary`,
  );
  return mapSummary(response.data);
};

// ─── Ship order CRUD ─────────────────────────────────────────────────────────

export const getCustomerShipOrders = async (
  query: ShipOrderListQuery = {},
): Promise<ShipOrderListResponse> => {
  const page = query.page ?? 1;
  const size = query.size ?? 20;
  const response = await httpClient.get(BASE_URL, {
    params: {
      draftDomesticId: query.draftDomesticId || undefined,
      status: query.status || undefined,
      page,
      size,
    },
  });
  return mapListResponse(response.data, page, size);
};

export const getCustomerShipOrderDetail = async (shipOrderId: string): Promise<ShipOrder> => {
  const response = await httpClient.get(`${BASE_URL}/${shipOrderId}`);
  return mapShipOrder(unwrapResult(response.data));
};

export const createCustomerShipOrder = async (
  payload: CreateShipOrderRequest,
): Promise<ShipOrder> => {
  const response = await httpClient.post(BASE_URL, payload);
  return mapShipOrder(unwrapResult(response.data));
};

export const updateCustomerShipOrder = async (
  shipOrderId: string,
  payload: UpdateShipOrderPayload,
): Promise<ShipOrder> => {
  const response = await httpClient.patch(`${BASE_URL}/${shipOrderId}`, payload);
  return mapShipOrder(unwrapResult(response.data));
};

export const cancelCustomerShipOrder = async (shipOrderId: string): Promise<void> => {
  await httpClient.delete(`${BASE_URL}/${shipOrderId}`);
};

// ─── Allingo (theo ship_order) ───────────────────────────────────────────────

export const getAllingoQuotes = async (shipOrderId: string): Promise<AllingoQuote[]> => {
  const response = await httpClient.get(`${BASE_URL}/${shipOrderId}/shipping-quotes`);
  return toArray(unwrapResult(response.data)).map((item) => {
    const source = toRecord(item);
    return {
      serviceId: toString(source.serviceId ?? source.service_id),
      serviceName: toString(source.serviceName ?? source.service_name),
      partnerName: toString(source.partnerName ?? source.partner_name),
      price: toNumber(source.price),
      estimatedMinutes: toNullableNumber(source.estimatedMinutes ?? source.estimated_minutes),
      type: toString(source.type),
    };
  });
};

export const bookAllingo = async (
  shipOrderId: string,
  payload: { serviceId: string },
): Promise<BookAllingoResponse> => {
  const response = await httpClient.post(`${BASE_URL}/${shipOrderId}/book-allingo`, payload);
  return unwrapResult(response.data) as BookAllingoResponse;
};

export const syncAllingo = async (shipOrderId: string): Promise<SyncAllingoResponse> => {
  const response = await httpClient.post(`${BASE_URL}/${shipOrderId}/sync-allingo`);
  return unwrapResult(response.data) as SyncAllingoResponse;
};

export const cancelAllingo = async (
  shipOrderId: string,
  payload: CancelAllingoRequest,
): Promise<void> => {
  await httpClient.post(`${BASE_URL}/${shipOrderId}/cancel-allingo`, payload);
};
