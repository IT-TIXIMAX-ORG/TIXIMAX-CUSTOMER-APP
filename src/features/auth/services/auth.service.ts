import { authHttpClient, httpClient } from '@/src/shared/lib/http/http-client';
import type { ReferralStaffOption } from '@/src/features/customer-portal/shared/types/master-data.types';

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const unwrapList = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;

  const root = toRecord(value);
  const result = toRecord(root.result ?? root.data);

  if (Array.isArray(result.content)) return result.content;
  if (Array.isArray(result.items)) return result.items;
  if (Array.isArray(root.content)) return root.content;
  if (Array.isArray(root.items)) return root.items;
  if (Array.isArray(root.result)) return root.result;
  if (Array.isArray(root.data)) return root.data;

  return [];
};

export const getReferralSaleStaff = async (): Promise<ReferralStaffOption[]> => {
  const response = await authHttpClient.get('/customer-portal/staff', {
    params: { page: 1, size: 20, role: 'LEAD_SALE,STAFF_SALE' },
  });
  return unwrapList(response.data)
    .map((item) => {
      const staff = toRecord(item);
      return {
        accountId: String(staff.accountId ?? staff.id ?? ''),
        name: String(staff.name ?? staff.fullName ?? ''),
        staffCode: staff.staffCode ? String(staff.staffCode) : undefined,
        phone: staff.phone ? String(staff.phone) : undefined,
      };
    })
    .filter((staff) => staff.accountId && staff.name);
};

export const createLocalPassword = async (password: string): Promise<void> => {
  await httpClient.post('/auth/password/create', { password });
};

export const changeCurrentPassword = async (payload: {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}): Promise<void> => {
  await httpClient.post('/accounts/change-password', payload);
};

export const sendForgotPasswordOtp = async (
  email: string,
  locale: 'vi' | 'en' = 'vi',
): Promise<void> => {
  await authHttpClient.post('/accounts/forgot-password/send-otp', { email, locale });
};

export const resetPasswordWithOtp = async (
  email: string,
  otp: string,
  newPassword: string,
): Promise<void> => {
  await authHttpClient.post('/accounts/forgot-password/reset', { email, otp, newPassword });
};
