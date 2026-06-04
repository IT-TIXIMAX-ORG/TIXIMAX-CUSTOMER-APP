// Query keys - reused from web project
// Centralized query key management for React Query

export const QUERY_KEYS = {
  customerPortal: {
    profile: () => ['customer-portal', 'profile'] as const,
    orders: (page: number, size: number, type?: string) =>
      ['customer-portal', 'orders', page, size, type] as const,
    orderDetail: (orderId: string) =>
      ['customer-portal', 'orders', orderId] as const,
    transactions: (page: number, size: number) =>
      ['customer-portal', 'transactions', page, size] as const,
    domesticDeliveries: (page: number, size: number) =>
      ['customer-portal', 'domestic-deliveries', page, size] as const,
  },
  auth: {
    session: () => ['auth', 'session'] as const,
  },
} as const;
