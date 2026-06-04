import { httpClient } from '@/src/shared/lib/http/http-client';
import type {
  CustomerDepositOrderRequest,
  CustomerPurchaseOrderRequest,
} from '@/src/features/customer-portal/types/customer-order.types';

export const createCustomerPurchaseOrder = async (payload: CustomerPurchaseOrderRequest) => {
  const response = await httpClient.post('/customer-portal/orders/mua-ho', payload);
  return response.data;
};

export const createCustomerDepositOrder = async (payload: CustomerDepositOrderRequest) => {
  const response = await httpClient.post('/customer-portal/orders/consignment-order', payload);
  return response.data;
};
