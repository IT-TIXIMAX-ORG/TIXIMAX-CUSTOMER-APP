// Customer Portal Data hooks - adapted from web
import { useQuery } from '@tanstack/react-query';
import {
  getCustomerOrders,
  getCustomerTransactions,
  getCustomerOrderDetail,
  getCustomerActiveOrders,
  getCustomerTrackingOrdersFromForeignWarehouse,
  getCustomerDomesticDeliveries,
  type CustomerActiveOrderQuery,
  type CustomerOrderQuery,
  type TransactionQuery,
} from '../services/customer-portal.service';
import { QUERY_KEYS } from '@/src/shared/lib/query/query-keys';
import { useIsAuthenticated } from '@/src/features/auth/hooks/use-auth-store';

export const useCustomerOrders = (page = 1, size = 5, query?: string | CustomerOrderQuery) => {
  const isAuthenticated = useIsAuthenticated();
  const keyType = typeof query === 'string' ? query : query?.type;

  return useQuery({
    queryKey: [...QUERY_KEYS.customerPortal.orders(page, size, keyType), query],
    queryFn: () => getCustomerOrders(page, size, query),
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });
};

export const useCustomerActiveOrders = (page = 1, size = 10, query?: CustomerActiveOrderQuery) => {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: ['customer-portal', 'orders', 'active', page, size, query],
    queryFn: () => getCustomerActiveOrders(page, size, query),
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });
};

export const useCustomerTrackingOrders = (page = 1, size = 10, query?: CustomerActiveOrderQuery) => {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: ['customer-portal', 'orders', 'tracking', 'from-foreign-warehouse', page, size, query],
    queryFn: () => getCustomerTrackingOrdersFromForeignWarehouse(page, size, query),
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });
};

export const useCustomerOrderDetail = (orderId: string) => {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: QUERY_KEYS.customerPortal.orderDetail(orderId),
    queryFn: () => getCustomerOrderDetail(orderId),
    enabled: isAuthenticated && !!orderId,
    refetchOnWindowFocus: false,
  });
};

export const useCustomerTransactions = (page = 1, size = 5, query?: TransactionQuery) => {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: [...QUERY_KEYS.customerPortal.transactions(page, size), query],
    queryFn: () => getCustomerTransactions(page, size, query),
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });
};

export const useCustomerDomesticDeliveries = (page = 1, size = 10) => {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: ['customer-portal', 'domestic-deliveries', page, size],
    queryFn: () => getCustomerDomesticDeliveries(page, size),
    enabled: isAuthenticated,
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });
};
