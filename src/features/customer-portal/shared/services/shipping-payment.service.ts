import { httpClient } from '@/src/shared/lib/http/http-client';
import type {
  BankAccount,
  CreateShipPaymentRequest,
  ShipCodePaymentItem,
  ShipCodePaymentListResult,
  ShipCodePaymentQuery,
  ShipPaymentResult,
} from '../types/shipping-payment.types';

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

const unwrapResult = (value: unknown): unknown => {
  const source = toRecord(value);
  return source.result ?? source.data ?? value;
};

const mapShipCodePaymentItem = (value: unknown): ShipCodePaymentItem => {
  const source = toRecord(value);
  const feeBreakdown = toRecord(source.feeBreakdown ?? source.fee_breakdown);

  return {
    shipCode: toString(source.shipCode ?? source.ship_code),
    customerId: toString(source.customerId ?? source.customer_id),
    customerName: toString(source.customerName ?? source.customer_name),
    totalPriceShip: toNumber(source.totalPriceShip ?? source.total_price_ship),
    totalWeight: toNumber(source.totalWeight ?? source.total_weight),
    totalForeignInboundFeeVndPreview: toNumber(
      source.totalForeignInboundFeeVndPreview ?? source.total_foreign_inbound_fee_vnd_preview,
    ),
    isReadyForPayment: Boolean(source.isReadyForPayment ?? source.is_ready_for_payment),
    payment: Boolean(source.payment),
    routeSummaries: toArray(source.routeSummaries ?? source.route_summaries).map((item) => {
      const route = toRecord(item);
      return {
        routeId: toNumber(route.routeId ?? route.route_id),
        routeName: toString(route.routeName ?? route.route_name),
        routeCode: toString(route.routeCode ?? route.route_code),
        totalWeight: toNumber(route.totalWeight ?? route.total_weight),
        priceShip: toNumber(route.priceShip ?? route.price_ship),
        totalPriceShip: toNumber(route.totalPriceShip ?? route.total_price_ship),
      };
    }),
    feeBreakdown: {
      internationalShippingFee: toNumber(
        feeBreakdown.internationalShippingFee ?? feeBreakdown.international_shipping_fee,
      ),
      surchargePreview: toNumber(feeBreakdown.surchargePreview ?? feeBreakdown.surcharge_preview),
      foreignInboundFeeVndPreview: toNumber(
        feeBreakdown.foreignInboundFeeVndPreview ?? feeBreakdown.foreign_inbound_fee_vnd_preview,
      ),
      shipWebDebtPreview: toNumber(
        feeBreakdown.shipWebDebtPreview ?? feeBreakdown.ship_web_debt_preview,
      ),
      unpaidOrderChargePreview: toNumber(
        feeBreakdown.unpaidOrderChargePreview ?? feeBreakdown.unpaid_order_charge_preview,
      ),
      domesticShippingFeePreview: toNumber(
        feeBreakdown.domesticShippingFeePreview ?? feeBreakdown.domestic_shipping_fee_preview,
      ),
      domesticShippingFeeDetail: toRecord(
        feeBreakdown.domesticShippingFeeDetail ?? feeBreakdown.domestic_shipping_fee_detail,
      ),
      previewSubtotal: toNumber(feeBreakdown.previewSubtotal ?? feeBreakdown.preview_subtotal),
      note: toString(feeBreakdown.note) || undefined,
    },
    customerBalance: toNumber(source.customerBalance ?? source.customer_balance),
    warehouseShips: toArray(source.warehouseShips ?? source.warehouse_ships),
    createdAt: toString(source.createdAt ?? source.created_at) || undefined,
    updatedAt: toString(source.updatedAt ?? source.updated_at) || undefined,
    paidAt: toString(source.paidAt ?? source.paid_at) || undefined,
    carrierCode: toString(source.carrierCode ?? source.carrier_code) || undefined,
    carrierName: toString(source.carrierName ?? source.carrier_name) || undefined,
    address: toString(source.address) || undefined,
    phoneNumber: toString(source.phoneNumber ?? source.phone_number) || undefined,
    note: toString(source.note) || undefined,
  };
};

const mapListResult = (
  value: unknown,
  fallbackPage: number,
  fallbackSize: number,
): ShipCodePaymentListResult => {
  const result = unwrapResult(value);
  const source = toRecord(result);
  const rawContent = Array.isArray(result) ? result : toArray(source.content);
  const content = rawContent.map(mapShipCodePaymentItem);
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

export const getShipCodePayments = async (
  query: ShipCodePaymentQuery = {},
): Promise<ShipCodePaymentListResult> => {
  const page = query.page ?? 1;
  const size = query.size ?? 20;
  const response = await httpClient.get(`${BASE_URL}/ship-code/payment`, {
    params: {
      payment: query.payment ?? false,
      page,
      size,
      keyword: query.keyword?.trim() || undefined,
      dateFrom: query.dateFrom || undefined,
      dateTo: query.dateTo || undefined,
    },
  });

  return mapListResult(response.data, page, size);
};

export const createShipPayment = async (
  shipCode: string,
  payload: CreateShipPaymentRequest,
): Promise<ShipPaymentResult> => {
  const response = await httpClient.post(
    `${BASE_URL}/ship-code/${encodeURIComponent(shipCode)}/payment`,
    payload,
  );
  return unwrapResult(response.data) as ShipPaymentResult;
};

export const getBankAccounts = async (): Promise<BankAccount[]> => {
  const response = await httpClient.get('/customer-portal/bank-accounts');
  return toArray(unwrapResult(response.data)).map((item) => {
    const source = toRecord(item);
    return {
      id: toString(source.id),
      accountNumber: toString(source.accountNumber ?? source.account_number),
      accountHolder: toString(source.accountHolder ?? source.account_holder),
      bankName: toString(source.bankName ?? source.bank_name),
      isProxyPayment: Boolean(source.isProxyPayment ?? source.is_proxy_payment),
      isRevenue: Boolean(source.isRevenue ?? source.is_revenue),
    };
  });
};
