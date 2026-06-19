export interface RouteSummary {
  routeId: number;
  routeName: string;
  routeCode: string;
  totalWeight: number;
  priceShip: number;
  totalPriceShip: number;
}

export interface FeeBreakdown {
  internationalShippingFee: number;
  surchargePreview: number;
  foreignInboundFeeVndPreview: number;
  shipWebDebtPreview: number;
  unpaidOrderChargePreview: number;
  domesticShippingFeePreview: number;
  domesticShippingFeeDetail?: {
    fee?: number;
    totalNetWeight?: number;
    routeId?: string | number;
    routeName?: string;
    chargeMode?: string;
    unitPrice?: number;
    appliedMinWeight?: number;
    appliedMaxWeight?: number;
    configured?: boolean;
  };
  previewSubtotal: number;
  note?: string;
}

export interface ShipCodePaymentItem {
  shipCode: string;
  customerId: string;
  customerName: string;
  totalPriceShip: number;
  totalWeight: number;
  totalForeignInboundFeeVndPreview: number;
  isReadyForPayment: boolean;
  payment: boolean;
  routeSummaries: RouteSummary[];
  feeBreakdown: FeeBreakdown;
  customerBalance: number;
  warehouseShips?: unknown[];
  createdAt?: string;
  updatedAt?: string;
  paidAt?: string;
  carrierCode?: string;
  carrierName?: string;
  address?: string;
  phoneNumber?: string;
  note?: string;
}

export interface ShipCodePaymentListResult {
  content: ShipCodePaymentItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ShipCodePaymentQuery {
  payment?: boolean;
  page?: number;
  size?: number;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateShipPaymentRequest {
  isUseBalance: boolean;
  bankId: string;
  customerVoucherId?: string;
  systemVoucherIds?: string[];
}

export interface ShipPaymentResult {
  payment_id: string;
  action_at: string;
  amount: string;
  collected_amount: string;
  content: string;
  deposit_percent: null;
  is_merged_payment: boolean;
  payment_code: string;
  payment_type: string;
  qr_code: string | null;
  customer_id: string;
  order_id: string | null;
  staff_id: string;
  collect_weight: null;
  paid_time: string | null;
  status: string;
  snap_exchange_rate: null;
  purpose: string;
  paymentCalculation?: Record<string, unknown>;
}

export interface BankAccount {
  id: string;
  accountNumber: string;
  accountHolder: string;
  bankName: string;
  isProxyPayment: boolean;
  isRevenue: boolean;
}

export const ShipPaymentErrorCode = {
  DRAFT_DOMESTIC_NO_SALE_ASSIGNED: 'DRAFT_DOMESTIC_NO_SALE_ASSIGNED',
  PARTIAL_SHIPMENT_ALREADY_PENDING: 'PARTIAL_SHIPMENT_ALREADY_PENDING',
  VOUCHER_NOT_OWNED_OR_NOT_FOUND: 'VOUCHER_NOT_OWNED_OR_NOT_FOUND',
  SHIP_ORDER_ACCESS_DENIED: 'SHIP_ORDER_ACCESS_DENIED',
  DOMESTIC_TRACKING_NOT_IN_VN_WAREHOUSE: 'DOMESTIC_TRACKING_NOT_IN_VN_WAREHOUSE',
} as const;
