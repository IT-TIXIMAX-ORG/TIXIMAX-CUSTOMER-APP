import { useRouter } from 'expo-router';

import type { CustomerOrder } from '@/src/features/customer-portal/shared/types/customer-portal.types';
import { orderTypeLabel } from '@/src/shared/lib/labels';
import { isPendingPaymentStatus } from '@/src/features/customer-portal/shared/lib/payment-status';
import { OrderCard, orderTypeIcon } from './OrderCard';

interface OrderListItemProps {
  order: CustomerOrder;
}

export function OrderListItem({ order }: OrderListItemProps) {
  const router = useRouter();
  const amount = order.finalPriceOrder ?? order.paymentAfterAuction ?? 0;

  // Tab Lịch sử: API chỉ trả số link + status cấp đơn, không có ảnh/tên sản phẩm/mã vận đơn
  // → dùng icon placeholder theo loại đơn và ẩn dòng mã vận đơn.
  return (
    <OrderCard
      orderCode={order.orderCode}
      status={order.status}
      createdAt={order.createdAt}
      placeholderIcon={orderTypeIcon(order.orderType)}
      orderTypeText={orderTypeLabel(order.orderType)}
      productCount={order.totalLinks ?? 0}
      amount={amount}
      hasUnpaidPayment={isPendingPaymentStatus(order.status)}
      cancelReason={order.cancelReason}
      onPress={() => router.push(`/orders/${order.orderId}`)}
    />
  );
}
