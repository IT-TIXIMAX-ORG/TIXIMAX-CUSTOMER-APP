import { useQuery } from '@tanstack/react-query';

import { useIsAuthenticated } from '@/src/features/auth/hooks/use-auth-store';
import { getCustomerVouchers } from '../services/voucher.service';

// Lấy voucher của khách (cá nhân + hệ thống) theo tuyến. routeId có thể là CSV
// nhiều tuyến (mã ship gom nhiều tuyến) — BE lọc voucher áp dụng cho các tuyến đó.
// retry: 0 để không spam khi endpoint bị chặn quyền (403) — coi như không có voucher.
export const useCustomerVouchers = (
  customerId?: string | number | null,
  routeId?: string | null,
) => {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: ['customer-portal', 'vouchers', String(customerId ?? ''), routeId ?? 'all'],
    queryFn: () => getCustomerVouchers(customerId!, routeId),
    enabled: isAuthenticated && Boolean(customerId),
    staleTime: 5 * 60 * 1000,
    retry: 0,
    refetchOnWindowFocus: false,
  });
};
