import { authHttpClient, httpClient } from '@/src/shared/lib/http/http-client';
import type { ReferralStaffOption } from '@/src/features/customer-portal/shared/types/master-data.types';
import { ENV_CONFIG } from '@/src/shared/constants/env.constants';
import { SUPPORT_STAFF_PHONE } from '@/src/shared/constants/support';

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

const STAFF_QUERY = 'page=1&size=20&role=LEAD_SALE%2CSTAFF_SALE';
const STAFF_PATH = `/customer-portal/staff?${STAFF_QUERY}`;
// 30s để đồng bộ với timeout mặc định của http-client (login cũng dùng 30s).
// 8s trước đây quá gắt: BE staging cold-start / mạng mobile chậm thường > 8s nên
// danh sách sale luôn timeout dù endpoint khỏe. Áp cho cả axios timeout lẫn lớp race.
const STAFF_TIMEOUT_MS = 30000;

const parseReferralStaff = (value: unknown): ReferralStaffOption[] =>
  unwrapList(value)
    .map((item) => {
      const staff = toRecord(item);
      return {
        accountId: String(staff.accountId ?? staff.id ?? ''),
        name: String(staff.name ?? staff.fullName ?? ''),
        staffCode: staff.staffCode ? String(staff.staffCode) : undefined,
        phone: SUPPORT_STAFF_PHONE,
      };
    })
    .filter((staff) => staff.accountId && staff.name);

const withTimeout = async <T>(promise: Promise<T>, message: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), STAFF_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const fetchReferralSaleStaff = async (): Promise<ReferralStaffOption[]> => {
  const controller = new AbortController();

  return withTimeout(
    fetch(`${ENV_CONFIG.apiBaseUrl}${STAFF_PATH}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Không tải được danh sách nhân viên (${response.status})`);
        }

        return parseReferralStaff(await response.json());
      })
      .finally(() => controller.abort()),
    'Không tải được danh sách nhân viên (timeout)',
  );
};

const axiosReferralSaleStaff = async (): Promise<ReferralStaffOption[]> => {
  const response = await withTimeout(
    authHttpClient.get(STAFF_PATH, { timeout: STAFF_TIMEOUT_MS }),
    'Không tải được danh sách nhân viên (timeout)',
  );

  return parseReferralStaff(response.data);
};

export const getReferralSaleStaff = async (): Promise<ReferralStaffOption[]> => {
  try {
    return await axiosReferralSaleStaff();
  } catch {
    return fetchReferralSaleStaff();
  }
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
