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
    warehouse: {
      carriers: () => ['customer-portal', 'warehouse', 'carriers'] as const,
      available: (query: unknown) =>
        ['customer-portal', 'warehouse', 'available', query] as const,
      drafts: (query: unknown) =>
        ['customer-portal', 'warehouse', 'drafts', query] as const,
    },
    shipPayment: {
      list: (query: unknown) =>
        ['customer-portal', 'ship-payment', query] as const,
      bankAccounts: () =>
        ['customer-portal', 'ship-payment', 'banks'] as const,
    },
    shipOrders: {
      summary: (draftId: string | null) =>
        ['customer-portal', 'ship-order-summary', draftId] as const,
      list: (query: unknown) =>
        ['customer-portal', 'ship-orders', query] as const,
      detail: (id: string) =>
        ['customer-portal', 'ship-orders', 'detail', id] as const,
    },
  },
  auth: {
    session: () => ['auth', 'session'] as const,
  },
} as const;
