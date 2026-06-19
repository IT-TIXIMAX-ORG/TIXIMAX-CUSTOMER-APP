// Voucher service — lấy voucher khả dụng của khách để tự áp voucher hệ thống.
// GET /vouchers/customer/{customerId}?routeId=... (routeId tùy chọn; mã ship có thể
// gồm nhiều tuyến nên ta gọi không kèm routeId rồi lọc client-side theo routeIds).

import { httpClient } from '@/src/shared/lib/http/http-client';
import type { CustomerVoucher, CustomerVouchersResponse, VoucherDetail } from '../types/voucher.types';

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

export const getCustomerVouchers = async (
  customerId: string | number,
  routeId?: string | number | null,
): Promise<CustomerVouchersResponse> => {
  const params = routeId ? { routeId: String(routeId) } : {};
  const response = await httpClient.get(`/vouchers/customer/${customerId}`, { params });
  const data = toRecord(response.data);
  const result = toRecord(data.result ?? data.data ?? data);
  return {
    customerVouchers: Array.isArray(result.customerVouchers)
      ? (result.customerVouchers as CustomerVoucher[])
      : [],
    systemVouchers: Array.isArray(result.systemVouchers)
      ? (result.systemVouchers as VoucherDetail[])
      : [],
  };
};
