import { useRouter } from 'expo-router';

import type { CustomerActiveOrder } from '@/src/features/customer-portal/shared/types/customer-portal.types';
import { resolveImageUrl } from '@/src/shared/lib/utils';
import { orderTypeLabel } from '@/src/shared/lib/labels';
import { isPendingPaymentStatus } from '@/src/features/customer-portal/shared/lib/payment-status';
import { OrderCard, orderTypeIcon } from '@/src/components/orders/OrderCard';

interface ActiveOrderCardProps {
  order: CustomerActiveOrder;
}

const getDisplayDate = (order: CustomerActiveOrder) =>
  order.journey?.orderCreatedAt || order.trackingSummary?.displayTimestamp;

const getTrackingCode = (order: CustomerActiveOrder) => {
  const linkWithTracking = order.orderLinks.find((link) => link.trackingCode || link.shipmentCode);
  return linkWithTracking?.trackingCode || linkWithTracking?.shipmentCode || '';
};

// Status hiển thị ưu tiên status cấp đơn (orderStatus); chỉ dùng tracking summary làm
// fallback khi API không trả orderStatus — để badge & chấm đỏ phản ánh đúng trạng thái đơn.
const getDisplayStatus = (order: CustomerActiveOrder) =>
  order.orderStatus ||
  order.trackingSummary?.displayStatus ||
  order.trackingSummary?.orderMainStatus;

// Ảnh thumbnail lấy từ order link ĐẦU TIÊN của đơn (đơn nhiều link/nhiều ảnh → dùng link đầu).
// Trong link đó ưu tiên ảnh sản phẩm, sau đó tới ảnh mua/kho làm fallback.
const getProductImage = (order: CustomerActiveOrder): string | null => {
  const firstLink = order.orderLinks[0];
  if (!firstLink) return null;
  return (
    [
      firstLink.imageUrl,
      firstLink.purchaseImageUrl,
      firstLink.warehouseImageUrl,
      firstLink.warehouseCheckImageUrl,
    ]
      .map(resolveImageUrl)
      .find((url): url is string => Boolean(url)) ?? null
  );
};

const getProductName = (order: CustomerActiveOrder): string | null =>
  order.orderLinks.find((link) => link.productName)?.productName ?? null;

export function ActiveOrderCard({ order }: ActiveOrderCardProps) {
  const router = useRouter();
  const status = getDisplayStatus(order);
  const amount = order.finalPriceOrder ?? order.paymentAfterAuction ?? 0;

  return (
    <OrderCard
      orderCode={order.orderCode}
      status={status}
      createdAt={getDisplayDate(order)}
      productName={getProductName(order)}
      imageUrl={getProductImage(order)}
      placeholderIcon={orderTypeIcon(order.orderType)}
      orderTypeText={orderTypeLabel(order.orderType)}
      productCount={order.trackingSummary?.totalLinks ?? order.orderLinks.length}
      amount={amount}
      trackingCode={getTrackingCode(order)}
      hasUnpaidPayment={isPendingPaymentStatus(status)}
      cancelReason={order.cancelReason}
      onPress={() => router.push(`/orders/${order.orderId}`)}
    />
  );
}
