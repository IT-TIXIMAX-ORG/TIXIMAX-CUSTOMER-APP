export interface CustomerAddress {
  addressId: string;
  addressName: string | null;
  province: string | null;
  ward: string | null;
  streetAddress: string | null;
}

export interface SupportStaff {
  accountId?: string | null;
  staffId?: string | null;
  staffCode?: string | null;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
}

export interface CustomerProfile {
  accountId: string;
  name: string;
  email: string;
  phone: string;
  isVerify: boolean;
  phoneVerified: boolean;
  profileCompletionLevel: number;
  hasPassword: boolean;
  avatarUrl?: string;
  customerCode: string;
  balance: number;
  totalWeight: number;
  totalAmount: number;
  totalOrders: number;
  realtimeOrders: number;
  voucherCount: number;
  hasAddress: boolean;
  addresses: CustomerAddress[];
  dedicatedStaff: SupportStaff | null;
  source: string;
}

export interface CustomerOrder {
  orderId: string;
  orderCode: string;
  orderType: string;
  status: string;
  routeName: string | null;
  routeId?: string | number | null;
  routeCurrency?: string | null;
  currency?: string | null;
  finalPriceOrder: number | null;
  priceShip: number | null;
  estimatedShippingFee?: number | null;
  exchangeRate: number | null;
  leftoverMoney: number | null;
  priceBeforeFee: number | null;
  insuranceFee: number | null;
  quantityCheckFee?: number | null;
  paymentAfterAuction?: number | null;
  totalLinks: number;
  createdAt: string;
  staff?: SupportStaff | null;
  staffCs?: SupportStaff | null;
  cancelReason?: string | null;
  checkRequired: boolean;
}

export interface CustomerOrderLink {
  orderLinkId: string;
  productName: string | null;
  productLink: string | null;
  website?: string | null;
  imageUrl: string | null;
  purchaseImageUrl?: string | null;
  warehouseImageUrl?: string | null;
  warehouseCheckImageUrl?: string | null;
  trackingCode: string | null;
  shipmentCode: string | null;
  status: string | null;
  orderStatus?: string | null;
  quantity: number | null;
  shipWeb?: number | null;
  extraCharge?: number | null;
  purchaseFee?: number | null;
  warehouseLength?: number | null;
  warehouseWidth?: number | null;
  warehouseHeight?: number | null;
  warehouseDim?: number | null;
  warehouseNetWeight?: number | null;
  warehouseBillableWeight?: number | null;
  finalPriceVnd: number | null;
  unitPriceVnd?: number | null;
  priceWeb?: number | null;
  totalWeb?: number | null;
  productTypeName: string | null;
  note: string | null;
  milestones?: CustomerOrderLinkMilestone[];
}

export interface CustomerOrderLinkMilestone {
  status: string;
  orderStatus?: string | null;
  label: string;
  timestamp: string | null;
}

export interface CustomerShipmentEstimateItem {
  shipmentCode: string;
  linkCount: number;
  totalNetWeight: number | null;
  totalBillableWeight: number | null;
  chargeableWeight: number | null;
  priceShipPerKg: number | null;
  estimatedFee: number | null;
  minWeightApplied: number;
  hasWarehouseData: boolean;
}

export interface CustomerOrderShippingEstimation {
  algorithm: string;
  totalShipmentGroups: number;
  totalLinkCount: number;
  totalNetWeight: number | null;
  totalBillableWeight: number | null;
  totalChargeableWeight: number | null;
  totalEstimatedFee: number | null;
  shipmentGroups: CustomerShipmentEstimateItem[];
}

export interface CustomerBankAccount {
  id: string;
  accountHolder: string;
  accountNumber: string;
  bankName: string;
  isProxyPayment: boolean;
  isRevenue: boolean;
}

export interface CustomerPaymentSession {
  id?: string | number;
  paymentId?: string | number;
  paymentCode?: string | null;
  paymentMethod?: 'BANK_TRANSFER' | string | null;
  paymentType?: string | null;
  purpose?: string | null;
  amount?: number | null;
  qrCode?: string | null;
  content?: string | null;
  status?: string | null;
  bankAccount?: CustomerBankAccount | null;
  createdAt?: string | null;
  actionAt?: string | null;
}

export interface CustomerOrderPaymentTransaction {
  transactionId: string;
  transactionCode: string;
  paymentId: string | null;
  paymentCode: string | null;
  type: string | null;
  purpose: string | null;
  status: string | null;
  paymentMethod: string | null;
  amount: number | null;
  createdAt: string;
}

export interface CustomerOrderProductPaymentRecord {
  paymentId: string;
  paymentCode: string;
  status: string | null;
  purpose: string | null;
  paymentType: string | null;
  amountVnd: number | null;
  collectedAmountVnd: number | null;
  depositPercent: number | null;
  depositAmountVnd: number | null;
  actionAt: string | null;
  paidTime: string | null;
  qrCode?: string | null;
  qrUrl?: string | null;
  paymentUrl?: string | null;
  content?: string | null;
  bankAccount?: CustomerBankAccount | null;
}

export interface CustomerOrderProductPaymentSummary {
  status: 'DA_THANH_TOAN' | 'CHUA_THANH_TOAN';
  isPaid: boolean;
  expectedAmountVnd: number | null;
  paidAmountVnd: number | null;
  paidAt: string | null;
  totalPaymentAmountVnd?: number | null;
  totalCollectedAmountVnd?: number | null;
  totalDepositAmountVnd?: number | null;
  outstandingAmountVnd?: number | null;
  payments?: CustomerOrderProductPaymentRecord[];
  transactions: CustomerOrderPaymentTransaction[];
}

export interface CustomerOrderLog {
  logId: string;
  action: string | null;
  note: string | null;
  linkId: string | null;
  actionCode: string | null;
  createdAt: string;
}


export interface CustomerAllingoDelivery {
  allingoOrderId: string;
  allingoServiceName?: string | null;
  allingoQuotedPrice?: number | null;
  allingoStatus?: string | null;
  shipCode?: string | null;
}

export interface CustomerOrderDetail extends CustomerOrder {
  orderLinks: CustomerOrderLink[];
  processLogs: CustomerOrderLog[];
  staff: SupportStaff | null;
  address: CustomerAddress | null;
  shippingEstimation?: CustomerOrderShippingEstimation | null;
  productPayment?: CustomerOrderProductPaymentSummary | null;
  shippingPayment?: CustomerOrderProductPaymentSummary | null;
  paymentSession?: CustomerPaymentSession | null;
  paymentSessions?: CustomerPaymentSession[];
  allingoDeliveries?: CustomerAllingoDelivery[];
}

export interface CustomerTransaction {
  id: string;
  transactionCode?: string;
  type: 'INCOME' | 'OUTCOME' | 'DEPOSIT' | 'WITHDRAW' | 'PAYMENT' | 'REFUND'; // Aligned with backend enums
  purpose?: string;
  amount: number;
  description: string;
  note?: string;
  createdAt: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | string;
  orderId?: string;
  orderCode?: string;
  beforeBalance?: number;
  afterBalance?: number;
  paymentMethod?: string;
  metadata?: any;
}

export interface PaginationResult<T> {
  content: T[];
  page: number;
  size: number;
  total: number;
}

export interface CustomerActiveOrderJourneyLink {
  linkId: string;
  parentLinkId: string | null;
  deliveredQuantity: number | null;
  trackingCode: string;
  shipmentCode: string | null;
  orderLinkStatus: string | null;
  productName: string | null;
  productLink: string | null;
  purchaseImage: string | null;
  purchaseTime: string | null;
  warehouseImage: string | null;
  warehouseCheckImage: string | null;
}

export interface CustomerActiveOrderJourneyShipmentGroup {
  shipmentCode: string;
  timestamp: string | null;
  links: CustomerActiveOrderJourneyLink[];
}

export interface CustomerActiveOrderJourneyPhase {
  phase: string;
  label: string;
  timestamp: string | null;
  shipmentGroups: CustomerActiveOrderJourneyShipmentGroup[];
}

export interface CustomerActiveOrderJourney {
  orderCode: string;
  orderStatus: string | null;
  orderCreatedAt: string;
  phases: CustomerActiveOrderJourneyPhase[];
}

export interface CustomerActiveOrderStatusCount {
  status: string | null;
  count: number;
}

export interface CustomerActiveOrderTrackingSummary {
  displayStatus: string | null;
  displayPhase: string | null;
  displayLabel: string | null;
  displayTimestamp: string | null;
  isMixed: boolean;
  totalLinks: number;
  activeLinks: number;
  cancelledLinks: number;
  orderMainStatus: string | null;
  showOrderMainStatus: boolean;
  linkStatusCounts: CustomerActiveOrderStatusCount[];
}

export interface CustomerActiveOrder {
  orderId: string;
  orderCode: string;
  finalPriceOrder: number | null;
  orderType: string | null;
  orderStatus: string | null;
  paymentAfterAuction: number | null;
  note: string | null;
  staffCs?: SupportStaff | null;
  cancelReason?: string | null;
  orderLinks: CustomerOrderLink[];
  trackingSummary?: CustomerActiveOrderTrackingSummary;
  journey: CustomerActiveOrderJourney;
}

export interface CustomerPortalResponse<T> {
  code: number;
  message: string | null;
  result: T;
}

export interface CustomerDomesticDeliveryItem {
  draftDomesticId: string;
  shipCode: string;
  address: string | null;
  phoneNumber: string | null;
  weight: number | null;
  carrierCode: string | null;
  carrierName: string | null;
  status: string;
  allingoOrderId: string | null;
  allingoServiceName: string | null;
  allingoQuotedPrice: number | null;
  allingoStatus: string | null;
  allingoTrackId: string | null;
  allingoPartnerName: string | null;
  allingoPartnerTrackId: string | null;
  allingoDriverName: string | null;
  allingoDriverPhone: string | null;
  allingoDriverPhotoUrl: string | null;
  allingoDriverLicensePlate: string | null;
  allingoBookedAt: string | null;
  allingoDeliveredAt: string | null;
  allingoFailureReason: string | null;
  allingoCancellationReason: string | null;
  allingoFeeDelivery: number | null;
  allingoFeeInsurance: number | null;
  allingoFeeCod: number | null;
  allingoFeeTotal: number | null;
  allingoFeeCurrency: string | null;
  allingoSyncedAt: string | null;
  shippingList: string[];
  createdAt: string;
}

export interface AllingoQuoteItem {
  serviceId: string;
  serviceName: string;
  partnerName: string;
  price: number;
  estimatedMinutes: number | null;
  type: string;
}

export interface AllingoBookResult {
  allingoOrderId: string;
  allingoServiceId: string;
  allingoServiceName: string;
  allingoQuotedPrice: number;
  allingoStatus: string;
}
