import { useQuery } from '@tanstack/react-query';

import { useIsAuthenticated } from '@/src/features/auth/hooks/use-auth-store';
import { getDestinations, getProductTypes, getRoutes } from '../services/master-data.service';

export const useCreateOrderMasterData = (
  routeId?: string | number,
  serviceType?: string,
  enabled = true,
) => {
  const isAuthenticated = useIsAuthenticated();
  const routesQuery = useQuery({
    queryKey: ['mobile-master-data', 'routes'],
    queryFn: getRoutes,
    enabled: isAuthenticated && enabled,
    staleTime: 30 * 60 * 1000,
  });
  const destinationsQuery = useQuery({
    queryKey: ['mobile-master-data', 'destinations'],
    queryFn: getDestinations,
    enabled: isAuthenticated && enabled,
    staleTime: 30 * 60 * 1000,
  });
  const productTypesQuery = useQuery({
    queryKey: ['mobile-master-data', 'product-types', routeId ?? 'all', serviceType ?? 'default'],
    queryFn: () => getProductTypes(routeId, serviceType),
    enabled: isAuthenticated && enabled,
    staleTime: 30 * 60 * 1000,
  });

  return {
    routes: routesQuery.data ?? [],
    destinations: destinationsQuery.data ?? [],
    productTypes: productTypesQuery.data ?? [],
    isInitialLoading:
      routesQuery.isLoading || destinationsQuery.isLoading || productTypesQuery.isLoading,
    isError: Boolean(routesQuery.error || destinationsQuery.error || productTypesQuery.error),
    refetch: async () => {
      await Promise.all([routesQuery.refetch(), destinationsQuery.refetch(), productTypesQuery.refetch()]);
    },
  };
};
