import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useIsAuthenticated } from '@/src/features/auth/hooks/use-auth-store';
import { QUERY_KEYS } from '@/src/shared/lib/query/query-keys';
import {
  createShipPayment,
  getBankAccounts,
  getShipCodePayments,
} from '../services/shipping-payment.service';
import type {
  CreateShipPaymentRequest,
  ShipCodePaymentQuery,
} from '../types/shipping-payment.types';

export const useShipCodePayments = (query: ShipCodePaymentQuery) => {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: QUERY_KEYS.customerPortal.shipPayment.list(query),
    queryFn: () => getShipCodePayments(query),
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });
};

export const useBankAccounts = () => {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: QUERY_KEYS.customerPortal.shipPayment.bankAccounts(),
    queryFn: getBankAccounts,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateShipPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shipCode,
      payload,
    }: {
      shipCode: string;
      payload: CreateShipPaymentRequest;
    }) => createShipPayment(shipCode, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['customer-portal', 'ship-payment'] }),
        queryClient.invalidateQueries({ queryKey: ['customer-portal', 'warehouse'] }),
        queryClient.invalidateQueries({ queryKey: ['customer-portal', 'domestic-deliveries'] }),
      ]);
    },
  });
};
