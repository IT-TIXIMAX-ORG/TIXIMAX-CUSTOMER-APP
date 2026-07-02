// Ship Order types — luồng "1 draft LOCKED → N ship_orders".
// Port rút gọn từ FE-2 (chỉ phần customer portal dùng).

export type ShipOrderStatus = 'PENDING' | 'EXPORTED' | 'CANCELLED';

export type CarrierCode = 'VNPOST' | 'JT' | 'OTHER' | 'ALLINGO' | string;

export type AllingoStatus =
  | 'pending'
  | 'picked_up'
  | 'delivering'
  | 'delivered'
  | 'failed'
  | 'canceled';

export type PackageStatus =
  | 'CHO_GIAO'
  | 'DANG_GIAO'
  | 'DA_GIAO'
  | 'DA_NHAP_KHO_VN'
  | 'CHO_TRUNG_CHUYEN'
  | string;

export type ShipPaymentStatus = 'DA_THANH_TOAN_SHIP' | 'CHUA_THANH_TOAN_SHIP' | string;

// Allingo đã lấy hàng trở đi thì không cho khách hủy.
export const NON_CANCELLABLE_ALLINGO_STATUSES = new Set<string>([
  'picked_up',
  'delivering',
  'delivered',
]);

export const isAllingoCancellationLocked = (status?: string | null): boolean =>
  NON_CANCELLABLE_ALLINGO_STATUSES.has(status ?? '');

export interface ShipOrderOrderLink {
  linkId: number;
  status: string;
  productName: string;
  quantity: number;
  deliveredQuantity: number | null;
}

export interface ShipOrderShippingListItem {
  trackingCode: string;
  status: PackageStatus;
  warehouseName: string;
  shipPaymentStatus?: ShipPaymentStatus;
  shipPaymentCode?: string;
  partiallyPaid?: boolean;
  orderLinks: ShipOrderOrderLink[];
}

export interface ShipOrder {
  shipOrderId: string;
  shipCode: string; // vd "C01921-4-SO1"
  draftDomesticId: string;
  shippingList: ShipOrderShippingListItem[];
  customerName?: string | null;
  customerCode?: string | null;
  status: ShipOrderStatus;
  carrierId: string | null;
  carrierCode?: CarrierCode;
  carrierName?: string | null;
  carrierTrackingCode: string | null;
  note: string | null;
  weight: number | null;
  createdAt: string | null;

  // #1462
  subCarrierNote: string | null;
  address: string | null;
  phoneNumber: string | null;
  bookingTime: string | null;

  // Allingo (chỉ relevant khi carrierCode === 'ALLINGO')
  allingoOrderId: string | null;
  allingoTrackId: string | null;
  allingoPartnerName: string | null;
  allingoServiceName: string | null;
  allingoQuotedPrice: number | null;
  allingoStatus: AllingoStatus | null;
  allingoDriverName: string | null;
  allingoDriverPhone: string | null;
  allingoDriverPhotoUrl: string | null;
  allingoDriverLicensePlate: string | null;
  allingoFeeTotal: number | null;
  allingoBookedAt: string | null;
  allingoDeliveredAt: string | null;
  allingoFailureReason: string | null;
  allingoCancellationReason: string | null;
}

export interface CreateShipOrderRequest {
  draftDomesticId: number;
  shippingList: string[];
  carrierCode: CarrierCode;
  carrierTrackingCode?: string | null;
  note?: string | null;
  subCarrierNote?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
  bookingTime?: string | null;
}

export interface UpdateShipOrderPayload {
  shippingList?: string[]; // REPLACE toàn bộ tập kiện
  carrierCode?: CarrierCode;
  carrierTrackingCode?: string | null;
  subCarrierNote?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
  bookingTime?: string | null;
  note?: string | null;
}

export interface AllingoQuote {
  serviceId: string;
  serviceName: string;
  partnerName: string;
  price: number;
  estimatedMinutes: number | null;
  type: string;
}

export interface BookAllingoResponse {
  allingoOrderId: string;
  allingoTrackId: string;
  allingoServiceId: string;
  allingoServiceName: string;
  allingoQuotedPrice: number;
  allingoStatus: AllingoStatus;
}

export interface SyncAllingoResponse {
  allingoOrderId: string;
  allingoTrackId: string;
  allingoStatus: AllingoStatus;
  allingoDriverName: string | null;
  allingoDriverPhone: string | null;
  allingoDriverPhotoUrl: string | null;
  allingoDriverLicensePlate: string | null;
  allingoFeeTotal: number | null;
  allingoDeliveredAt: string | null;
  allingoFailureReason: string | null;
}

export interface CancelAllingoRequest {
  reason: string;
}

export interface ShipOrderSummaryItem {
  shipOrderId: string;
  shipCode: string;
  shippingList: string[]; // normalize về mảng tracking code
  status: ShipOrderStatus;
  carrierId: string | null;
  carrierCode?: CarrierCode;
  carrierName?: string | null;
  allingoStatus: AllingoStatus | null;
  bookingTime?: string | null;
}

export interface DraftShipOrderSummary {
  draftDomesticId: string;
  shipCode: string;
  draftStatus: string;
  totalKien: string[];
  claimedKien: string[];
  availableKien: string[];
  shipOrders: ShipOrderSummaryItem[];
}

export interface ShipOrderListResponse {
  content: ShipOrder[];
  totalElements: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface ShipOrderListQuery {
  draftDomesticId?: string;
  status?: ShipOrderStatus;
  page?: number;
  size?: number;
}

// Mã lỗi BE cần xử lý riêng ở UI.
export const SHIP_ORDER_ERROR_CODES = {
  ALLINGO_BOOKED_LOCK: 10938, // Đã book Allingo → không sửa carrier/kiện/địa chỉ
  EMPTY_SHIPPING_LIST: 10939, // shippingList rỗng khi update → dùng DELETE
  CUSTOMER_TRACKING_REQUIRED: 10942, // Khách tự book cần carrier tracking code
  WAREHOUSE_CLOSED: 10913,
  INVALID_STATUS: 1404,
  PACKAGE_NOT_READY: 1406,
} as const;

export type ShipOrderErrorCode =
  (typeof SHIP_ORDER_ERROR_CODES)[keyof typeof SHIP_ORDER_ERROR_CODES];
