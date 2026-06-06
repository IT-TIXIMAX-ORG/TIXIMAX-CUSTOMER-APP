import { formatCurrency } from '@/src/shared/lib/utils';
import type { CustomerTransaction } from '@/src/features/customer-portal/shared/types/customer-portal.types';

const POSITIVE_TRANSACTION_TYPES: CustomerTransaction['type'][] = [
  'INCOME',
  'DEPOSIT',
  'REFUND',
];

/**
 * Xác định chiều giao dịch (tiền vào +/ tiền ra -) theo nguồn authoritative:
 * ưu tiên chênh lệch số dư trước/sau, fallback theo loại giao dịch.
 * Dùng chung để tránh mỗi nơi tự suy diễn một kiểu.
 */
export const isPositiveTransaction = (transaction: CustomerTransaction): boolean => {
  if (
    typeof transaction.beforeBalance === 'number' &&
    typeof transaction.afterBalance === 'number'
  ) {
    return transaction.afterBalance - transaction.beforeBalance > 0;
  }
  return POSITIVE_TRANSACTION_TYPES.includes(transaction.type);
};

/**
 * Format số tiền giao dịch kèm dấu +/-, LUÔN dùng giá trị tuyệt đối để tránh
 * dấu kép khi backend trả amount âm (vd: "--100.000 ₫").
 */
export const formatTransactionAmount = (transaction: CustomerTransaction): string => {
  const sign = isPositiveTransaction(transaction) ? '+' : '-';
  return `${sign}${formatCurrency(Math.abs(transaction.amount))}`;
};
