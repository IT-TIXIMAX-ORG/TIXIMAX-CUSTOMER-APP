// Customer Profile hook - adapted from web
import { useQuery } from '@tanstack/react-query';
import { getCustomerProfile } from '../services/customer-portal.service';
import { QUERY_KEYS } from '@/src/shared/lib/query/query-keys';
import { STALE_TIME } from '@/src/shared/lib/query/query-config';
import { useIsAuthenticated } from '@/src/features/auth/hooks/use-auth-store';

export const useCustomerProfile = () => {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: QUERY_KEYS.customerPortal.profile(),
    queryFn: getCustomerProfile,
    enabled: isAuthenticated,
    staleTime: STALE_TIME.masterData,
    refetchOnWindowFocus: false,
  });
};
