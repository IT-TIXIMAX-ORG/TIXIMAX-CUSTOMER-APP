// Voucher types — port từ web (features/sales/shared/types/voucher.types).
// Dùng để tự áp voucher hệ thống khi tạo thanh toán ship.

export interface VoucherDetail {
  voucherId: string | number;
  code: string;
  type: string; // VD: 'CO_DINH'
  value: number;
  description: string;
  startDate: string;
  endDate: string;
  minOrderValue: number | null;
  maxUses: number | null;
  assignType: string;
  thresholdAmount: number;
  routeIds: (string | number)[];
}

export interface CustomerVoucher {
  customerVoucherId: string | number;
  customerId: string | number;
  voucherId: string | number;
  isUsed: boolean;
  usesRemaining: number;
  assignedDate: string;
  usedDate: string | null;
  voucher: VoucherDetail;
}

export interface CustomerVouchersResponse {
  customerVouchers: CustomerVoucher[];
  systemVouchers: VoucherDetail[];
}
