import { httpClient } from '@/src/shared/lib/http/http-client';
import type {
  CustomerProfile,
  CustomerOrder,
  CustomerTransaction,
  PaginationResult,
  CustomerOrderDetail,
  CustomerActiveOrder,
  CustomerOrderShippingEstimation,
  CustomerShipmentEstimateItem,
  CustomerDomesticDeliveryItem,
  AllingoQuoteItem,
  AllingoBookResult,
  SupportStaff,
} from '../types/customer-portal.types';
import { SUPPORT_STAFF_PHONE } from '@/src/shared/constants/support';

export type CustomerActiveOrderDateField = 'created_at' | 'latest_progress_at' | 'payment_due_at';
export type CustomerActiveOrderSortBy = 'created_at' | 'latest_progress_at' | 'progress_rank' | 'main_status_priority';
export type CustomerActiveOrderSortOrder = 'asc' | 'desc';

export interface CustomerActiveOrderQuery {
  keyword?: string;
  type?: string;
  orderMainStatusIn?: string[];
  linkStatusIn?: string[];
  hasShipmentCode?: boolean;
  isMixedStatus?: boolean;
  dateField?: CustomerActiveOrderDateField;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: CustomerActiveOrderSortBy;
  sortOrder?: CustomerActiveOrderSortOrder;
}

export interface CustomerOrderQuery {
  keyword?: string;
  type?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

const toRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return {};
};

const readString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
};

const readNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || fallback;
  return fallback;
};

const unwrapPayload = (value: unknown): Record<string, unknown> => {
  const data = toRecord(value);
  const result = toRecord(data.result ?? data.data);
  return Object.keys(result).length ? result : data;
};

const normalizePaymentSession = (value: unknown): CustomerOrderDetail['paymentSession'] => {
  const data = toRecord(value);
  if (!Object.keys(data).length) return null;

  const bankAccount = toRecord(data.bankAccount ?? data.bank_account);
  const qrCode = readString(
    data.qrCode ??
      data.qr_code ??
      data.qrUrl ??
      data.qr_url ??
      data.qrImage ??
      data.qr_image ??
      data.paymentUrl ??
      data.payment_url,
  );

  return {
    id: readString(data.id) || undefined,
    paymentId: readString(data.paymentId ?? data.payment_id) || undefined,
    paymentCode: readString(data.paymentCode ?? data.payment_code) || null,
    paymentMethod: readString(data.paymentMethod ?? data.payment_method) || 'BANK_TRANSFER',
    paymentType: readString(data.paymentType ?? data.payment_type) || null,
    purpose: readString(data.purpose) || null,
    amount: data.amount === null || data.amount === undefined ? null : readNumber(data.amount),
    qrCode: qrCode || null,
    content: readString(data.content ?? data.addInfo ?? data.add_info) || null,
    status: readString(data.status) || null,
    bankAccount: Object.keys(bankAccount).length
      ? {
          id: readString(bankAccount.id),
          accountHolder: readString(bankAccount.accountHolder ?? bankAccount.account_holder),
          accountNumber: readString(bankAccount.accountNumber ?? bankAccount.account_number),
          bankName: readString(bankAccount.bankName ?? bankAccount.bank_name),
          isProxyPayment: Boolean(bankAccount.isProxyPayment ?? bankAccount.is_proxy_payment),
          isRevenue: Boolean(bankAccount.isRevenue ?? bankAccount.is_revenue),
        }
      : null,
    createdAt: readString(data.createdAt ?? data.created_at) || null,
    actionAt: readString(data.actionAt ?? data.action_at) || null,
  };
};

const getPaymentSessionKey = (session: CustomerOrderDetail['paymentSession']): string => {
  if (!session) return '';
  return readString(session.paymentId ?? session.id ?? session.paymentCode ?? session.qrCode);
};

const normalizePaymentSessions = (values: unknown[]): NonNullable<CustomerOrderDetail['paymentSessions']> => {
  const sessions = values
    .map((value) => normalizePaymentSession(value))
    .filter((session): session is NonNullable<CustomerOrderDetail['paymentSession']> =>
      Boolean(
        session &&
          (
            session.qrCode ||
            session.content ||
            session.paymentCode ||
            session.amount != null ||
            session.bankAccount
          ),
      ),
    );
  const seen = new Set<string>();
  return sessions.filter((session) => {
    const key = getPaymentSessionKey(session);
    if (key && seen.has(key)) return false;
    if (key) seen.add(key);
    return true;
  });
};

const readNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = readNumber(value, Number.NaN);
  return Number.isFinite(numeric) ? numeric : null;
};

const sumNullableNumbers = (values: Array<number | null>): number | null => {
  const validValues = values.filter((value): value is number => typeof value === 'number');
  if (validValues.length === 0) return null;
  return validValues.reduce((total, value) => total + value, 0);
};

const normalizeCustomerOrderShippingEstimation = (
  order: CustomerOrderDetail,
): CustomerOrderShippingEstimation | null => {
  const orderLinks = Array.isArray(order.orderLinks) ? order.orderLinks : [];
  if (orderLinks.length === 0) return order.shippingEstimation ?? null;

  const originalEstimation = order.shippingEstimation ?? null;
  const originalGroups = Array.isArray(originalEstimation?.shipmentGroups)
    ? originalEstimation.shipmentGroups
    : [];
  const originalGroupsByCode = new Map(
    originalGroups.map((group) => [String(group.shipmentCode || '').trim(), group]),
  );
  const groups = new Map<
    string,
    {
      shipmentCode: string;
      links: typeof orderLinks;
      totalNetWeight: number | null;
      totalBillableWeight: number | null;
    }
  >();

  orderLinks.forEach((link) => {
    const shipmentCode = String(link.shipmentCode || '').trim();
    const groupKey = shipmentCode || `__NO_SHIPMENT__${link.orderLinkId}`;
    const displayCode =
      shipmentCode || String(link.trackingCode || link.orderLinkId || 'NO_SHIPMENT');
    const netWeight = readNullableNumber(link.warehouseNetWeight);
    const billableWeight = readNullableNumber(link.warehouseBillableWeight);

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        shipmentCode: displayCode,
        links: [],
        totalNetWeight: null,
        totalBillableWeight: null,
      });
    }

    const group = groups.get(groupKey)!;
    group.links.push(link);
    group.totalNetWeight =
      netWeight === null ? group.totalNetWeight : Math.max(group.totalNetWeight ?? 0, netWeight);
    group.totalBillableWeight =
      billableWeight === null
        ? group.totalBillableWeight
        : Math.max(group.totalBillableWeight ?? 0, billableWeight);
  });

  const shipmentGroups: CustomerShipmentEstimateItem[] = Array.from(groups.values()).map(
    (group) => {
      const originalGroup = originalGroupsByCode.get(group.shipmentCode);
      const priceShipPerKg =
        readNullableNumber(originalGroup?.priceShipPerKg) ?? readNullableNumber(order.priceShip);
      const fallbackChargeableWeight =
        group.totalBillableWeight ??
        group.totalNetWeight ??
        readNullableNumber(originalGroup?.chargeableWeight);
      const chargeableWeight =
        fallbackChargeableWeight === null ? null : Math.max(1, fallbackChargeableWeight);
      const estimatedFee =
        chargeableWeight !== null && priceShipPerKg !== null
          ? chargeableWeight * priceShipPerKg
          : null;

      return {
        shipmentCode: group.shipmentCode,
        linkCount: group.links.length,
        totalNetWeight: group.totalNetWeight,
        totalBillableWeight: group.totalBillableWeight,
        chargeableWeight,
        priceShipPerKg,
        estimatedFee,
        minWeightApplied:
          fallbackChargeableWeight !== null && fallbackChargeableWeight < 1 ? 1 : 0,
        hasWarehouseData: group.totalNetWeight !== null || group.totalBillableWeight !== null,
      };
    },
  );

  return {
    algorithm: originalEstimation?.algorithm ?? 'GROUP_BY_SHIPMENT_CODE',
    totalShipmentGroups: shipmentGroups.length,
    totalLinkCount: orderLinks.length,
    totalNetWeight: sumNullableNumbers(shipmentGroups.map((group) => group.totalNetWeight)),
    totalBillableWeight: sumNullableNumbers(
      shipmentGroups.map((group) => group.totalBillableWeight),
    ),
    totalChargeableWeight: sumNullableNumbers(shipmentGroups.map((group) => group.chargeableWeight)),
    totalEstimatedFee: sumNullableNumbers(shipmentGroups.map((group) => group.estimatedFee)),
    shipmentGroups,
  };
};

const normalizeProfile = (rawData: unknown): CustomerProfile => {
  const data = unwrapPayload(rawData);

  return {
    accountId: readString(data.accountId ?? data.id),
    name: readString(data.name ?? data.fullName),
    email: readString(data.email),
    phone: readString(data.phone),
    isVerify: Boolean(data.isVerify),
    phoneVerified: Boolean(data.phoneVerified),
    profileCompletionLevel: readNumber(data.profileCompletionLevel),
    hasPassword: Boolean(data.hasPassword),
    avatarUrl: readString(data.avatarUrl ?? data.avatar) || undefined,
    customerCode: readString(data.customerCode ?? data.code),
    balance: readNumber(data.balance),
    totalWeight: readNumber(data.totalWeight),
    totalAmount: readNumber(data.totalAmount),
    totalOrders: readNumber(data.totalOrders),
    realtimeOrders: readNumber(data.realtimeOrders),
    voucherCount: readNumber(data.voucherCount),
    hasAddress: Boolean(data.hasAddress),
    addresses: Array.isArray(data.addresses) ? data.addresses : [],
    dedicatedStaff: data.dedicatedStaff ? {
      accountId: readString((data.dedicatedStaff as any).accountId ?? (data.dedicatedStaff as any).id) || null,
      staffId: readString((data.dedicatedStaff as any).staffId) || null,
      staffCode: readString((data.dedicatedStaff as any).staffCode) || null,
      name: readString((data.dedicatedStaff as any).name),
      phone: SUPPORT_STAFF_PHONE,
      avatarUrl: readString((data.dedicatedStaff as any).avatarUrl),
    } : null,
    source: readString(data.source),
  };
};

const maskSupportStaffPhone = (staff?: SupportStaff | null): SupportStaff | null =>
  staff ? { ...staff, phone: SUPPORT_STAFF_PHONE } : null;

export const getCustomerProfile = async (): Promise<CustomerProfile> => {
  const response = await httpClient.get('/customer-portal/me');
  return normalizeProfile(response.data);
};

export interface UpdateCustomerProfilePayload {
  fullName: string;
  email: string;
  phone: string;
  staffId?: number | string;
}

export const updateCustomerProfile = async (payload: UpdateCustomerProfilePayload): Promise<void> => {
  await httpClient.put('/customer-portal/me', payload);
};

export const getCustomerOrders = async (
  page = 1,
  size = 10,
  query?: string | CustomerOrderQuery,
): Promise<PaginationResult<CustomerOrder>> => {
  const params: any = { page, size };
  const filters: CustomerOrderQuery = typeof query === 'string' ? { type: query } : (query ?? {});
  if (filters.type) params.order_type = filters.type;
  if (filters.keyword) params.keyword = filters.keyword;
  if (filters.status) params.status = filters.status;
  if (filters.dateFrom) params.date_from = filters.dateFrom;
  if (filters.dateTo) params.date_to = filters.dateTo;
  const response = await httpClient.get('/customer-portal/orders', { params });
  const data = toRecord(response.data);
  const result = toRecord(data.result);
  return {
    content: (result.content as any) || [],
    page: readNumber(result.page, 1),
    size: readNumber(result.size, 10),
    total: readNumber(result.totalElements || result.total, 0),
  };
};

const buildActiveOrderParams = (page: number, size: number, query?: CustomerActiveOrderQuery) => {
  const params: any = { page, size };
  if (!query) return params;

  if (query.type) params.order_type = query.type;
  if (query.keyword) params.keyword = query.keyword;
  if (query.orderMainStatusIn?.length) params.order_main_status_in = query.orderMainStatusIn.join(',');
  if (query.linkStatusIn?.length) params.link_status_in = query.linkStatusIn.join(',');
  if (query.hasShipmentCode !== undefined) params.has_shipment_code = query.hasShipmentCode;
  if (query.isMixedStatus !== undefined) params.is_mixed_status = query.isMixedStatus;
  if (query.dateField) params.date_field = query.dateField;
  if (query.dateFrom) params.date_from = query.dateFrom;
  if (query.dateTo) params.date_to = query.dateTo;
  if (query.sortBy) params.sort_by = query.sortBy;
  if (query.sortOrder) params.sort_order = query.sortOrder;

  return params;
};

export const getCustomerActiveOrders = async (
  page = 1,
  size = 10,
  query?: CustomerActiveOrderQuery,
): Promise<PaginationResult<CustomerActiveOrder>> => {
  const params = buildActiveOrderParams(page, size, query);
  const response = await httpClient.get('/customer-portal/orders/active', { params });
  const data = toRecord(response.data);
  const result = toRecord(data.result);
  return {
    content: (result.content as any) || [],
    page: readNumber(result.page, 1),
    size: readNumber(result.size, 10),
    total: readNumber(result.totalElements || result.total, 0),
  };
};

export const getCustomerTrackingOrdersFromForeignWarehouse = async (
  page = 1,
  size = 10,
  query?: CustomerActiveOrderQuery,
): Promise<PaginationResult<CustomerActiveOrder>> => {
  const params = buildActiveOrderParams(page, size, query);
  const response = await httpClient.get(
    '/customer-portal/orders/tracking',
    { params },
  );
  const data = toRecord(response.data);
  const result = toRecord(data.result);
  return {
    content: (result.content as any) || [],
    page: readNumber(result.page, 1),
    size: readNumber(result.size, 10),
    total: readNumber(result.totalElements || result.total, 0),
  };
};

export const getCustomerOrderDetail = async (orderId: string): Promise<CustomerOrderDetail> => {
  const response = await httpClient.get(`/customer-portal/orders/${orderId}`);
  const data = toRecord(response.data);
  const result = toRecord(data.result ?? data.data);
  const productPayment = toRecord(result.productPayment ?? result.product_payment);
  const shippingPayment = toRecord(result.shippingPayment ?? result.shipping_payment);
  const productPayments = Array.isArray(productPayment.payments) ? productPayment.payments : [];
  const shippingPayments = Array.isArray(shippingPayment.payments) ? shippingPayment.payments : [];
  const responseSessions = Array.isArray(result.paymentSessions)
    ? result.paymentSessions
    : Array.isArray(result.payment_sessions)
      ? result.payment_sessions
      : [];
  const paymentSessions = normalizePaymentSessions([
    ...responseSessions,
    ...productPayments,
    ...shippingPayments,
    result.paymentSession,
    result.payment_session,
    result.latestPaymentSession,
    result.latest_payment_session,
    result.payment,
    result.paymentInfo,
    result.payment_info,
  ]);
  const paymentSession = [...paymentSessions].reverse()[0] ?? null;
  const order = {
    ...(result as unknown as CustomerOrderDetail),
    paymentSession,
    paymentSessions,
  };
  return {
    ...order,
    staff: maskSupportStaffPhone(order.staff),
    staffCs: maskSupportStaffPhone(order.staffCs),
    shippingEstimation: normalizeCustomerOrderShippingEstimation(order),
  };
};

export interface TransactionQuery {
  keyword?: string;
  type?: string;
  purpose?: string;
  dateFrom?: string;
  dateTo?: string;
}

const toStartOfDayParam = (value: string): string =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;

const toEndOfDayParam = (value: string): string =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59` : value;

export const getCustomerTransactions = async (
  page = 1, 
  size = 10, 
  query?: TransactionQuery
): Promise<PaginationResult<CustomerTransaction>> => {
  const params: any = { page, size };
  if (query) {
    if (query.keyword) params.keyword = query.keyword;
    if (query.type) params.type = query.type;
    if (query.purpose) params.purpose = query.purpose;
    if (query.dateFrom) params.date_from = toStartOfDayParam(query.dateFrom);
    if (query.dateTo) params.date_to = toEndOfDayParam(query.dateTo);
  }
  const response = await httpClient.get('/customer-portal/transactions', { params });
  const data = toRecord(response.data);
  const result = toRecord(data.result);
  
    const content = Array.isArray(result.content) 
    ? result.content.map((tx: any): CustomerTransaction => ({
        id: readString(tx.transactionId || tx.id),
        transactionCode: readString(tx.transactionCode),
        type: tx.type,
        purpose: tx.purpose,
        amount: readNumber(tx.amount),
        description: readString(tx.purpose || tx.note || tx.transactionCode || ''), // Use purpose as primary description
        note: readString(tx.note),
        createdAt: readString(tx.createdAt),
        status: readString(tx.status),
        orderId: readString(tx.orderId),
        orderCode: readString(tx.orderCode),
        beforeBalance: readNumber(tx.beforeBalance),
        afterBalance: readNumber(tx.afterBalance),
        paymentMethod: tx.paymentMethod ?? tx.payment_method,
        metadata: tx.metadata,
      }))
    : [];

  return {
    content,
    page: readNumber(result.page, 1),
    size: readNumber(result.size, 10),
    total: readNumber(result.totalElements || result.total, 0),
  };
};
export const requestOtp = async (email: string): Promise<void> => {
  await httpClient.post('/customer-portal/login-otp/request', { email });
};

export interface CustomerRegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  locale?: 'vi' | 'en';
  staffId?: number | string;
}

export const registerCustomer = async (payload: CustomerRegisterPayload): Promise<any> => {
  const response = await httpClient.post('/customer-portal/register', payload);
  return response.data;
};

export const verifyOtp = async (email: string, otp: string): Promise<any> => {
  const response = await httpClient.post('/customer-portal/verify-otp', { email, code: otp });
  return response.data;
};

export const resendOtp = async (email: string): Promise<void> => {
  await httpClient.post('/customer-portal/resend-otp', { email });
};

type CustomerAddressPayload = {
  province?: string;
  ward?: string;
  street?: string;
};

export const addCustomerAddress = async (payload: CustomerAddressPayload): Promise<void> => {
  await httpClient.post('/customer-portal/me/address', payload);
};

export const updateCustomerAddress = async (addressId: string, payload: CustomerAddressPayload): Promise<void> => {
  await httpClient.put(`/customer-portal/me/address/${addressId}`, payload);
};

export const deleteCustomerAddress = async (addressId: string): Promise<void> => {
  await httpClient.delete(`/customer-portal/me/address/${addressId}`);
};

// Xóa tài khoản: BE vô hiệu hóa + ẩn danh PII, giữ chứng từ đơn/thanh toán theo luật kế toán.
// BE chặn (HTTP 409) nếu còn đơn chưa ở trạng thái DA_GIAO/DA_HUY → message đọc ở error.response.data.message.
export const deleteCustomerAccount = async (): Promise<void> => {
  await httpClient.delete('/customer-portal/me/account');
};

export const requestPhoneOtp = async (phone: string): Promise<void> => {
  await httpClient.post('/customer-portal/phone-otp/request', { phone });
};

export const verifyPhoneOtp = async (code: string): Promise<void> => {
  await httpClient.post('/customer-portal/phone-otp/verify', { code });
};

export const getOrderTypes = async (): Promise<string[]> => {
  const response = await httpClient.get('/orders/types');
  const data = toRecord(response.data);
  return Array.isArray(data.result) ? data.result : [];
};

export const getCustomerDomesticDeliveries = async (
  page = 1,
  size = 10,
): Promise<PaginationResult<CustomerDomesticDeliveryItem>> => {
  const response = await httpClient.get('/customer-portal/domestic-deliveries', { params: { page, size } });
  const data = toRecord(response.data);
  const result = toRecord(data.result);
  return {
    content: (result.content as CustomerDomesticDeliveryItem[]) ?? [],
    page: readNumber(result.page, 1),
    size: readNumber(result.size, 10),
    total: readNumber((result as any).totalElements ?? result.total, 0),
  };
};

export const getDomesticDeliveryShippingQuotes = async (
  draftDomesticId: string,
): Promise<AllingoQuoteItem[]> => {
  const response = await httpClient.get(
    `/customer-portal/domestic-deliveries/${draftDomesticId}/shipping-quotes`,
  );
  const data = toRecord(response.data);
  return (data.result as AllingoQuoteItem[]) ?? [];
};

export const bookAllingoForDomesticDelivery = async (
  draftDomesticId: string,
  serviceId: string,
): Promise<AllingoBookResult> => {
  const response = await httpClient.post(
    `/customer-portal/domestic-deliveries/${draftDomesticId}/book-allingo`,
    { serviceId },
  );
  const data = toRecord(response.data);
  return data.result as AllingoBookResult;
};

export const cancelAllingoForDomesticDelivery = async (draftDomesticId: string, reason: string): Promise<void> => {
  await httpClient.post(`/customer-portal/domestic-deliveries/${draftDomesticId}/cancel-allingo`, { reason });
};

export const syncAllingoForDomesticDelivery = async (draftDomesticId: string): Promise<void> => {
  await httpClient.post(`/customer-portal/domestic-deliveries/${draftDomesticId}/sync-allingo`);
};
