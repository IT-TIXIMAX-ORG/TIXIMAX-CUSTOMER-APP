export interface CustomerPurchaseLinkRequest {
  productLink: string;
  quantity: number;
  priceWeb?: number;
  shipWeb?: number;
  productName?: string;
  sku?: string;
  purchaseFee?: number;
  extraCharge?: number;
  purchaseImageId?: string;
  classify?: string;
  website?: string;
  productTypeId?: string;
  groupTag?: string;
  note?: string;
}

export interface CustomerPurchaseOrderRequest {
  addressId: string;
  destinationId?: string;
  routeId?: string;
  exchangeRate?: number;
  priceShip?: number;
  serviceType?: string;
  checkRequired?: boolean;
  purchaseLinks: CustomerPurchaseLinkRequest[];
}

export interface CustomerDepositLinkRequest {
  quantity: number;
  productName: string;
  differentFee?: number;
  extraCharge?: number;
  shipmentCode?: string;
  purchaseImageId?: string;
  productTypeId: string;
  note?: string;
}

export interface CustomerDepositOrderRequest {
  routeId: string;
  addressId: string;
  destinationId?: string;
  exchangeRate?: number;
  priceShip?: number;
  serviceType?: string;
  checkRequired: boolean;
  consignmentLinks: CustomerDepositLinkRequest[];
}
