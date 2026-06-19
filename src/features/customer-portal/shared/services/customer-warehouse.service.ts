import { httpClient } from '@/src/shared/lib/http/http-client';
import type {
  Carrier,
  DraftDomesticAddPayload,
  DraftDomesticAddressItem,
  DraftDomesticAddressQuery,
  DraftDomesticAvailableItem,
  DraftDomesticAvailableQuery,
  DraftDomesticDeliveryAddress,
  DraftDomesticShipmentMutationPayload,
  DraftDomesticUpdateInfoPayload,
  WarehouseDomesticPage,
} from '../types/warehouse-domestic.types';

const BASE_URL = '/customer-portal/draft-domestics';

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toString = (value: unknown, fallback = '') => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
};

const toArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const toStringArray = (value: unknown): string[] =>
  toArray(value).map((item) => toString(item).trim()).filter(Boolean);

const unwrapResult = (value: unknown): unknown => {
  const source = toRecord(value);
  return source.result ?? source.data ?? value;
};

const buildAddressLine = (...parts: unknown[]) =>
  parts.map((part) => toString(part).trim()).filter(Boolean).join(', ');

const mapDeliveryAddress = (value: unknown): DraftDomesticDeliveryAddress | null => {
  const source = toRecord(value);
  if (!Object.keys(source).length) return null;

  const addressName = toString(source.addressName ?? source.address_name);
  const province = toString(source.province);
  const ward = toString(source.ward);
  const streetAddress = toString(source.streetAddress ?? source.street_address);
  const addressLine = buildAddressLine(streetAddress, ward, province) || addressName;
  if (!addressLine && !addressName) return null;

  return {
    addressId: toNumber(source.addressId ?? source.id),
    addressName,
    province,
    ward,
    streetAddress,
    addressLine,
  };
};

export const mapDraftDomesticAvailableItem = (value: unknown): DraftDomesticAvailableItem => {
  const source = toRecord(value);
  const customer = toRecord(source.customer);
  const deliveryAddress = mapDeliveryAddress(source.deliveryAddress ?? source.delivery_address);
  const legacyShipmentCodes = toStringArray(source.shipmentCode ?? source.shipmentCodes ?? source.code);
  const rawShipments = toArray(source.shipments);
  const rawOrderLinks = toArray(source.orderLinks ?? source.order_links);
  const shipmentsSource = rawShipments.length
    ? rawShipments
    : rawOrderLinks.map((orderLink) => {
        const link = toRecord(orderLink);
        return {
          shipmentCode: link.shipmentCode ?? link.trackingCode ?? link.code,
          status: link.status ?? link.orderStatus,
          orderLinks: [orderLink],
        };
      });

  const shipments = shipmentsSource.map((item) => {
    const shipment = toRecord(item);
    return {
      shipmentCode: toString(shipment.shipmentCode ?? shipment.shipment_code),
      status: toString(shipment.status),
      operationalRouteId:
        toString(shipment.operationalRouteId ?? shipment.operational_route_id) || undefined,
      operationalRouteName:
        toString(shipment.operationalRouteName ?? shipment.operational_route_name) || undefined,
      parentRouteId: toString(shipment.parentRouteId ?? shipment.parent_route_id) || undefined,
      parentRouteName:
        toString(shipment.parentRouteName ?? shipment.parent_route_name) || undefined,
      orderLinks: toArray(shipment.orderLinks ?? shipment.order_links).map((linkValue) => {
        const link = toRecord(linkValue);
        return {
          linkId: toNumber(link.linkId ?? link.id),
          status: toString(link.status),
          productName: toString(link.productName ?? link.product_name),
          quantity: toNumber(link.quantity),
          deliveredQuantity: toNumber(link.deliveredQuantity ?? link.delivered_quantity),
        };
      }),
    };
  });
  const firstRouteShipment = shipments.find((shipment) => shipment.operationalRouteName);
  const operationalRouteName = toString(
    source.operationalRouteName ?? source.operational_route_name,
    firstRouteShipment?.operationalRouteName ?? '',
  );
  const shipmentCodes = legacyShipmentCodes.length
    ? legacyShipmentCodes
    : shipments.map((shipment) => shipment.shipmentCode).filter(Boolean);

  return {
    customerCode: toString(source.customerCode ?? source.customer_code, toString(customer.customerCode)),
    customerName: toString(source.customerName ?? source.customer_name, toString(customer.name)),
    phoneNumber: toString(
      source.phoneNumber ?? source.phone_number ?? source.customerPhone ?? source.phone,
      toString(customer.phone),
    ),
    address:
      deliveryAddress?.addressLine ||
      toString(source.address ?? source.addressName ?? source.customerAddress ?? source.toAddress),
    deliveryAddress,
    routeName: operationalRouteName,
    operationalRouteId:
      toString(source.operationalRouteId ?? source.operational_route_id, firstRouteShipment?.operationalRouteId ?? '') ||
      undefined,
    operationalRouteName: operationalRouteName || undefined,
    parentRouteId:
      toString(source.parentRouteId ?? source.parent_route_id, firstRouteShipment?.parentRouteId ?? '') ||
      undefined,
    parentRouteName:
      toString(source.parentRouteName ?? source.parent_route_name, firstRouteShipment?.parentRouteName ?? '') ||
      undefined,
    shipmentCodes,
    shipments,
  };
};

export const mapDraftDomesticAddressItem = (value: unknown): DraftDomesticAddressItem => {
  const source = toRecord(value);
  const staff = toRecord(source.staff);
  const account = toRecord(staff.account);
  const staffCode = toString(source.staffCode ?? source.staff_code);
  const staffName =
    toString(source.staffName ?? source.staff_name) ||
    toString(staff.name ?? staff.fullName) ||
    toString(account.name ?? account.fullName) ||
    staffCode;

  return {
    id: toNumber(source.id ?? source.addressId ?? source.address_id),
    shipCode: toString(source.shipCode ?? source.ship_code),
    customerCode: toString(source.customerCode ?? source.customer_code),
    customerName: toString(source.customerName ?? source.customer_name),
    phoneNumber: toString(source.phoneNumber ?? source.phone_number),
    address: toString(source.address),
    note: toString(source.note) || undefined,
    weight: toNumber(source.weight ?? source.totalWeight ?? source.total_weight),
    shippingList: toArray(source.shippingList ?? source.shippingCodes ?? source.shipping_list).map((item) => {
      const shipment = toRecord(item);
      if (item && typeof item === 'object') {
        return {
          trackingCode: toString(
            shipment.trackingCode ?? shipment.tracking_code ?? shipment.shipmentCode ?? shipment.code,
          ),
          status: toString(shipment.status),
          warehouseName: toString(shipment.warehouseName ?? shipment.warehouse_name ?? shipment.warehouse),
          shipPaymentStatus:
            toString(shipment.shipPaymentStatus ?? shipment.ship_payment_status) || undefined,
          shipPaymentCode:
            toString(shipment.shipPaymentCode ?? shipment.ship_payment_code) || undefined,
          partialShipmentId:
            shipment.partialShipmentId != null
              ? toString(shipment.partialShipmentId ?? shipment.partial_shipment_id)
              : undefined,
          partiallyPaid:
            typeof shipment.partiallyPaid === 'boolean' ? shipment.partiallyPaid : undefined,
        };
      }
      return { trackingCode: toString(item), status: '', warehouseName: '' };
    }),
    carrierTrackingCode:
      toString(source.carrierTrackingCode ?? source.carrier_tracking_code) || undefined,
    vnpostTrackingCode:
      toString(
        source.vnpostTrackingCode ??
          source.vnPostTrackingCode ??
          source.carrierTrackingCode ??
          source.trackingCode,
      ) || undefined,
    carrier:
      toString(
        source.carrierCode ??
          source.carrier_code ??
          source.carrierName ??
          source.carrier_name ??
          source.carrier,
      ).toUpperCase() || toString(source.carrier),
    status: toString(source.status),
    staffName,
    staffCode,
    payment: Boolean(source.payment),
    allingoOrderId: source.allingoOrderId != null ? toString(source.allingoOrderId) : null,
    allingoServiceName: source.allingoServiceName != null ? toString(source.allingoServiceName) : null,
    allingoQuotedPrice: source.allingoQuotedPrice != null ? toNumber(source.allingoQuotedPrice) : null,
    allingoStatus: source.allingoStatus != null ? toString(source.allingoStatus) : null,
  };
};

const mapPage = <T>(
  value: unknown,
  mapper: (item: unknown) => T,
  fallbackPage: number,
  fallbackSize: number,
): WarehouseDomesticPage<T> => {
  const result = unwrapResult(value);
  const source = toRecord(result);
  const rawContent = Array.isArray(result) ? result : toArray(source.content);
  const content = rawContent.map(mapper);
  const size = toNumber(source.size, fallbackSize);
  const totalElements = toNumber(source.totalElements ?? source.total, content.length);

  return {
    content,
    totalElements,
    totalPages: toNumber(
      source.totalPages,
      size > 0 ? Math.max(1, Math.ceil(totalElements / size)) : 1,
    ),
    size,
    number: toNumber(source.number ?? source.page, fallbackPage),
  };
};

export const getCarriers = async (): Promise<Carrier[]> => {
  const response = await httpClient.get(`${BASE_URL}/carriers`);
  return toArray(unwrapResult(response.data)).map((item) => {
    const source = toRecord(item);
    const value = toString(source.value ?? source.code ?? source.carrierCode ?? source.id);
    return {
      value,
      label: toString(source.label ?? source.name ?? source.carrierName, value),
    };
  });
};

export const getAvailableShipments = async (
  query: DraftDomesticAvailableQuery,
): Promise<WarehouseDomesticPage<DraftDomesticAvailableItem>> => {
  const response = await httpClient.get(`${BASE_URL}/available-add`, {
    params: {
      page: query.page,
      size: query.size,
      shipmentCode: query.shipmentCode.trim() || undefined,
      status: query.status.trim() || undefined,
      carrier: query.carrier === 'ALL' ? undefined : query.carrier,
      startDate: query.startDate.trim() || undefined,
      endDate: query.endDate.trim() || undefined,
      routeId: query.routeId?.trim() || undefined,
      operationalRouteId: query.operationalRouteId?.trim() || undefined,
    },
  });

  return mapPage(response.data, mapDraftDomesticAvailableItem, query.page, query.size);
};

export const getDraftDomestics = async (
  query: DraftDomesticAddressQuery,
): Promise<WarehouseDomesticPage<DraftDomesticAddressItem>> => {
  const response = await httpClient.get(BASE_URL, {
    params: {
      page: query.page,
      size: query.size,
      shipmentCode: query.shipmentCode.trim() || undefined,
      status: query.status.trim() || undefined,
      carrier: query.carrier === 'ALL' ? undefined : query.carrier,
    },
  });

  return mapPage(response.data, mapDraftDomesticAddressItem, query.page, query.size);
};

export const createDraftDomestic = async (payload: DraftDomesticAddPayload): Promise<unknown> => {
  const response = await httpClient.post(BASE_URL, payload);
  return unwrapResult(response.data);
};

export const updateDraftInfo = async (
  draftId: number,
  payload: DraftDomesticUpdateInfoPayload,
): Promise<unknown> => {
  const response = await httpClient.put(`${BASE_URL}/${draftId}/info`, payload);
  return unwrapResult(response.data);
};

export const deleteDraft = async (draftId: number): Promise<void> => {
  await httpClient.delete(`${BASE_URL}/${draftId}`);
};

export const addDraftShipments = async (
  draftId: number,
  payload: DraftDomesticShipmentMutationPayload,
): Promise<unknown> => {
  const response = await httpClient.post(`${BASE_URL}/${draftId}/shipments/add`, payload);
  return unwrapResult(response.data);
};

export const removeDraftShipments = async (
  draftId: number,
  payload: DraftDomesticShipmentMutationPayload,
): Promise<unknown> => {
  const response = await httpClient.post(`${BASE_URL}/${draftId}/shipments/remove`, payload);
  return unwrapResult(response.data);
};
