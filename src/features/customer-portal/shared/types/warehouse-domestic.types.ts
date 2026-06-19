export type WarehouseDomesticCarrier = 'ALL' | 'VNPOST' | 'OTHER' | 'JT' | string;
export type DraftDomesticStatus = 'WAIT_IMPORT' | 'DRAFT' | 'LOCKED' | 'EXPORTED' | string;

export interface WarehouseDomesticPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface Carrier {
  value: Exclude<WarehouseDomesticCarrier, 'ALL'> | string;
  label: string;
}

export interface DraftDomesticAvailableQuery {
  page: number;
  size: number;
  shipmentCode: string;
  status: string;
  carrier: WarehouseDomesticCarrier;
  startDate: string;
  endDate: string;
  routeId?: string;
  operationalRouteId?: string;
}

export interface DraftDomesticAddressQuery {
  page: number;
  size: number;
  shipmentCode: string;
  status: string;
  carrier: WarehouseDomesticCarrier;
}

export interface DraftDomesticOrderLinkItem {
  linkId: number;
  status: string;
  productName: string;
  quantity: number;
  deliveredQuantity: number;
}

export interface DraftDomesticShipmentItem {
  shipmentCode: string;
  status: string;
  operationalRouteId?: string;
  operationalRouteName?: string;
  parentRouteId?: string;
  parentRouteName?: string;
  orderLinks?: DraftDomesticOrderLinkItem[];
}

export interface DraftDomesticDeliveryAddress {
  addressId: number;
  addressName: string;
  province: string;
  ward: string;
  streetAddress: string;
  addressLine: string;
}

export interface DraftDomesticAvailableItem {
  customerCode: string;
  customerName: string;
  phoneNumber: string;
  address: string;
  deliveryAddress: DraftDomesticDeliveryAddress | null;
  routeName: string;
  operationalRouteId?: string;
  operationalRouteName?: string;
  parentRouteId?: string;
  parentRouteName?: string;
  shipmentCodes: string[];
  shipments: DraftDomesticShipmentItem[];
}

export interface DraftShippingListItem {
  trackingCode: string;
  status: string;
  warehouseName: string;
  shipPaymentStatus?: string;
  shipPaymentCode?: string;
  partialShipmentId?: string | number;
  partiallyPaid?: boolean;
}

export interface DraftDomesticAddressItem {
  id: number;
  shipCode: string;
  customerCode: string;
  customerName: string;
  phoneNumber: string;
  address: string;
  note?: string;
  weight: number;
  shippingList: DraftShippingListItem[];
  carrierTrackingCode?: string;
  vnpostTrackingCode?: string;
  carrier: string;
  status: DraftDomesticStatus;
  staffName: string;
  staffCode: string;
  payment?: boolean;
  allingoOrderId?: string | null;
  allingoServiceName?: string | null;
  allingoQuotedPrice?: number | null;
  allingoStatus?: string | null;
}

export interface DraftDomesticAddPayload {
  customerCode: string;
  phoneNumber: string;
  address: string;
  note?: string;
  carrierCode: Exclude<WarehouseDomesticCarrier, 'ALL'> | string;
  shippingList: string[];
  carrierTrackingCode?: string;
}

export interface DraftDomesticUpdateInfoPayload {
  phoneNumber: string;
  address: string;
  note?: string;
  carrierCode: Exclude<WarehouseDomesticCarrier, 'ALL'> | string;
}

export interface DraftDomesticShipmentMutationPayload {
  shippingCodes: string[];
}
