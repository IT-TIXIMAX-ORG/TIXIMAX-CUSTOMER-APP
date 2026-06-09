import { httpClient } from '@/src/shared/lib/http/http-client';
import type {
  DestinationSummary,
  ProductTypeSummary,
  RouteSummary,
} from '../types/master-data.types';

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const unwrapArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  const root = toRecord(value);
  const result = toRecord(root.result ?? root.data);
  if (Array.isArray(result.content)) return result.content;
  if (Array.isArray(root.result)) return root.result;
  if (Array.isArray(root.data)) return root.data;
  return [];
};

export const getRoutes = async (): Promise<RouteSummary[]> => {
  const response = await httpClient.get('/routes', { params: { page: 1, size: 100 } });
  return unwrapArray(response.data).map((item) => {
    const route = toRecord(item);
    return {
      routeId: toNumber(route.routeId ?? route.id),
      routeName: String(route.routeName ?? route.name ?? ''),
      routeCurrency: String(
        route.routeCurrency ??
        route.currency ??
        route.currencyCode ??
        route.currency_code ??
        route.destinationCurrency ??
        route.destination_currency ??
        '',
      ) || undefined,
      shippingFee: toNumber(route.shippingFee ?? route.unitBuyingPrice ?? route.unitDepositPrice),
      exchangeRate: toNumber(route.exchangeRate),
      destinationId: toNumber(route.destinationId),
      unitBuyingPrice: toNumber(route.unitBuyingPrice),
    };
  });
};

export const getDestinations = async (): Promise<DestinationSummary[]> => {
  const response = await httpClient.get('/destinations');
  return unwrapArray(response.data).map((item) => {
    const destination = toRecord(item);
    return {
      destinationId: toNumber(destination.destinationId ?? destination.id),
      destinationName: String(destination.destinationName ?? destination.name ?? ''),
    };
  });
};

export const getProductTypes = async (
  routeId?: string | number,
  serviceType?: string,
): Promise<ProductTypeSummary[]> => {
  const response = await httpClient.get('/product-types', { params: { routeId, serviceType } });
  return unwrapArray(response.data).map((item) => {
    const productType = toRecord(item);
    return {
      productTypeId: toNumber(productType.productTypeId ?? productType.id),
      productTypeName: String(productType.productTypeName ?? productType.name ?? ''),
      isFee: Boolean(productType.isFee ?? productType.fee),
      extraCharge: toNumber(productType.extraCharge),
    };
  });
};
