import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useIsAuthenticated } from '@/src/features/auth/hooks/use-auth-store';
import { QUERY_KEYS } from '@/src/shared/lib/query/query-keys';
import {
  addDraftShipments,
  createDraftDomestic,
  deleteDraft,
  getAvailableShipments,
  getCarriers,
  getDraftDomestics,
  removeDraftShipments,
  updateDraftInfo,
} from '../services/customer-warehouse.service';
import type {
  DraftDomesticAddPayload,
  DraftDomesticAddressQuery,
  DraftDomesticAvailableQuery,
  DraftDomesticShipmentMutationPayload,
  DraftDomesticUpdateInfoPayload,
} from '../types/warehouse-domestic.types';

const invalidateWarehouseQueries = async (queryClient: ReturnType<typeof useQueryClient>) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['customer-portal', 'warehouse'] }),
    queryClient.invalidateQueries({ queryKey: ['customer-portal', 'domestic-deliveries'] }),
  ]);
};

export const useCarriers = () => {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: QUERY_KEYS.customerPortal.warehouse.carriers(),
    queryFn: getCarriers,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useAvailableShipments = (query: DraftDomesticAvailableQuery) => {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: QUERY_KEYS.customerPortal.warehouse.available(query),
    queryFn: () => getAvailableShipments(query),
    enabled: isAuthenticated,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
};

export const useDraftDomestics = (query: DraftDomesticAddressQuery) => {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: QUERY_KEYS.customerPortal.warehouse.drafts(query),
    queryFn: () => getDraftDomestics(query),
    enabled: isAuthenticated,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateDraftDomestic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DraftDomesticAddPayload) => createDraftDomestic(payload),
    onSuccess: () => invalidateWarehouseQueries(queryClient),
  });
};

export const useUpdateDraftInfo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      draftId,
      payload,
    }: {
      draftId: number;
      payload: DraftDomesticUpdateInfoPayload;
    }) => updateDraftInfo(draftId, payload),
    onSuccess: () => invalidateWarehouseQueries(queryClient),
  });
};

export const useDeleteDraft = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draftId: number) => deleteDraft(draftId),
    onSuccess: () => invalidateWarehouseQueries(queryClient),
  });
};

export const useAddShipments = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      draftId,
      payload,
    }: {
      draftId: number;
      payload: DraftDomesticShipmentMutationPayload;
    }) => addDraftShipments(draftId, payload),
    onSuccess: () => invalidateWarehouseQueries(queryClient),
  });
};

export const useRemoveShipments = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      draftId,
      payload,
    }: {
      draftId: number;
      payload: DraftDomesticShipmentMutationPayload;
    }) => removeDraftShipments(draftId, payload),
    onSuccess: () => invalidateWarehouseQueries(queryClient),
  });
};
