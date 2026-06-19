// QueryClient singleton dùng chung cho toàn app.
// Tách khỏi app/_layout.tsx để các module ngoài React (vd auth store) có thể
// gọi queryClient.clear() khi đổi phiên đăng nhập — tránh cache của user cũ
// rò sang user mới sau logout → login.

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 2 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});
