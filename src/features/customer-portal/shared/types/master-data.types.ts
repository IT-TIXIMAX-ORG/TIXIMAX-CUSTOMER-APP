export interface RouteSummary {
  routeId: number;
  routeName: string;
  shippingFee: number;
  exchangeRate: number;
  destinationId?: number;
  unitBuyingPrice?: number;
}

export interface DestinationSummary {
  destinationId: number;
  destinationName: string;
}

export interface ProductTypeSummary {
  productTypeId: number;
  productTypeName: string;
  isFee?: boolean;
  extraCharge?: number;
}

export interface ReferralStaffOption {
  accountId: string;
  name: string;
  staffCode?: string;
  phone?: string;
}
