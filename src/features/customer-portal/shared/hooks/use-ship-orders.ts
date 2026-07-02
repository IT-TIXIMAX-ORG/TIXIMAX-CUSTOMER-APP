import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useIsAuthenticated } from '@/src/features/auth/hooks/use-auth-store';
import { QUERY_KEYS } from '@/src/shared/lib/query/query-keys';
import {
  bookAllingo,
  cancelAllingo,
  cancelCustomerShipOrder,
  createCustomerShipOrder,
  getCustomerShipOrderDetail,
  getCustomerShipOrders,
  getShipOrderSummary,
  syncAllingo,
  updateCustomerShipOrder,
} from '../services/ship-order.service';
import type {
  CreateShipOrderRequest,
  ShipOrderListQuery,
  UpdateShipOrderPayload,
} from '../types/ship-order.types';

// Làm mới toàn bộ dữ liệu liên quan sau khi thay đổi ship_order.
const invalidateShipOrderQueries = async (
  queryClient: ReturnType<typeof useQueryClient>,
  draftId?: string | null,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['customer-portal', 'ship-orders'] }),
    queryClient.invalidateQueries({ queryKey: ['customer-portal', 'ship-order-summary'] }),
    queryClient.invalidateQueries({ queryKey: ['customer-portal', 'domestic-deliveries'] }),
  ]);
  if (draftId) {
    await queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.customerPortal.shipOrders.summary(draftId),
    });
  }
};

export const useShipOrderSummary = (draftId: string | null) => {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: QUERY_KEYS.customerPortal.shipOrders.summary(draftId),
    queryFn: () => getShipOrderSummary(draftId as string),
    enabled: isAuthenticated && !!draftId,
    refetchOnWindowFocus: false,
  });
};

export const useShipOrders = (query: ShipOrderListQuery, options?: { refetchInterval?: number }) => {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: QUERY_KEYS.customerPortal.shipOrders.list(query),
    queryFn: () => getCustomerShipOrders(query),
    enabled: isAuthenticated,
    refetchInterval: options?.refetchInterval,
    refetchOnWindowFocus: false,
  });
};

export const useShipOrderDetail = (shipOrderId: string) => {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: QUERY_KEYS.customerPortal.shipOrders.detail(shipOrderId),
    queryFn: () => getCustomerShipOrderDetail(shipOrderId),
    enabled: isAuthenticated && !!shipOrderId,
    refetchOnWindowFocus: false,
  });
};

export const useCreateShipOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateShipOrderRequest) => createCustomerShipOrder(payload),
    onSuccess: (_data, payload) =>
      invalidateShipOrderQueries(queryClient, String(payload.draftDomesticId)),
  });
};

export const useUpdateShipOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shipOrderId,
      payload,
    }: {
      shipOrderId: string;
      payload: UpdateShipOrderPayload;
    }) => updateCustomerShipOrder(shipOrderId, payload),
    onSuccess: () => invalidateShipOrderQueries(queryClient),
  });
};

export const useCancelShipOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shipOrderId: string) => cancelCustomerShipOrder(shipOrderId),
    onSuccess: () => invalidateShipOrderQueries(queryClient),
  });
};

export const useBookAllingo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shipOrderId, serviceId }: { shipOrderId: string; serviceId: string }) =>
      bookAllingo(shipOrderId, { serviceId }),
    onSuccess: () => invalidateShipOrderQueries(queryClient),
  });
};

export const useSyncAllingo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shipOrderId: string) => syncAllingo(shipOrderId),
    onSuccess: () => invalidateShipOrderQueries(queryClient),
  });
};

export const useCancelAllingo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shipOrderId, reason }: { shipOrderId: string; reason: string }) =>
      cancelAllingo(shipOrderId, { reason }),
    onSuccess: () => invalidateShipOrderQueries(queryClient),
  });
};
