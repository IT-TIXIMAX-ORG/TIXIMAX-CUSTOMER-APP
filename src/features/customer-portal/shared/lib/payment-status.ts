import { normalizeLabelKey } from '@/src/shared/lib/labels';

// Các trạng thái đơn cần khách hành động thanh toán. Dùng chung cho: thẻ "Cần chú ý"
// trên Dashboard, chấm đỏ cảnh báo trên danh sách đơn, và mọi nơi cần nhận biết đơn
// đang chờ thanh toán. Suy ra từ status cấp đơn (list chưa trả paymentSessions).
// Khi backend trả field payment authoritative trong list, nên ưu tiên field đó trước status.
export const PAYMENT_PENDING_STATUSES = new Set([
  'CHO_THANH_TOAN',
  'CHO_THANH_TOAN_DAU_GIA',
  'CHUA_THANH_TOAN',
  'WAITING_FOR_PAYMENT',
  'CHO_THANH_TOAN_SHIP',
  'PENDING',
]);

/** Đơn có khoản thanh toán chưa hoàn tất (xét theo status cấp đơn đã chuẩn hóa). */
export const isPendingPaymentStatus = (status?: string | null): boolean =>
  PAYMENT_PENDING_STATUSES.has(normalizeLabelKey(status));
