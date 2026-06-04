export const humanizeEnum = (value?: string | null) =>
  String(value || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Chưa cập nhật';

export const orderTypeLabel = (type?: string | null) => {
  switch (type) {
    case 'MUA_HO':
      return 'Mua hộ';
    case 'KY_GUI':
    case 'CONSIGNMENT':
      return 'Ký gửi';
    case 'DAU_GIA':
      return 'Đấu giá';
    default:
      return humanizeEnum(type);
  }
};

export const transactionPurposeLabel = (purpose?: string | null) => {
  switch (purpose) {
    case 'ORDER_PAYMENT':
      return 'Thanh toán tiền hàng';
    case 'AUCTION_PAYMENT':
      return 'Thanh toán sau đấu giá';
    case 'AUCTION_REFUND':
      return 'Hoàn tiền đấu giá';
    case 'ORDER_REFUND':
      return 'Hoàn tiền đơn hàng';
    case 'WALLET_DEPOSIT':
      return 'Nạp tiền ví';
    case 'WALLET_WITHDRAW':
      return 'Rút tiền ví';
    case 'ADJUSTMENT':
      return 'Điều chỉnh số dư';
    case 'SHIPPING_FEE_PAYMENT':
      return 'Thanh toán vận chuyển';
    case 'PURCHASE_FEE_PAYMENT':
      return 'Phí dịch vụ mua hộ';
    case 'INSURANCE_FEE_PAYMENT':
      return 'Phí bảo hiểm';
    case 'EXTRA_SERVICE_FEE':
      return 'Phí dịch vụ gia tăng';
    case 'PARTIAL_DELIVERY_REFUND':
      return 'Hoàn tiền thiếu hàng';
    case 'WALLET_REVERSAL':
      return 'Hoàn tác giao dịch';
    default:
      return purpose ? humanizeEnum(purpose) : 'Khác';
  }
};

export const statusLabel = (status?: string | null) => {
  switch (String(status || '').toUpperCase()) {
    case 'CHO_XAC_NHAN':
      return 'Chờ xác nhận';
    case 'DA_XAC_NHAN':
      return 'Đã xác nhận';
    case 'CHO_THANH_TOAN':
    case 'CHUA_THANH_TOAN':
    case 'WAITING_FOR_PAYMENT':
      return 'Chờ thanh toán';
    case 'CHO_MUA':
      return 'Chờ mua';
    case 'DA_MUA':
      return 'Đã mua';
    case 'DANG_XU_LY':
      return 'Đang xử lý';
    case 'CHO_NHAP_KHO_NN':
      return 'Chờ nhập kho nước ngoài';
    case 'DA_NHAP_KHO_NN':
      return 'Đã nhập kho nước ngoài';
    case 'DANG_CHUYEN_VN':
      return 'Đang chuyển về Việt Nam';
    case 'CHO_NHAP_KHO_VN':
      return 'Chờ nhập kho Việt Nam';
    case 'DA_NHAP_KHO_VN':
      return 'Đã nhập kho Việt Nam';
    case 'CHO_THANH_TOAN_SHIP':
      return 'Chờ thanh toán vận chuyển';
    case 'CHO_GIAO':
      return 'Chờ giao';
    case 'DANG_GIAO':
      return 'Đang giao';
    case 'DA_GIAO':
    case 'COMPLETED':
      return 'Đã giao';
    case 'DA_THANH_TOAN':
    case 'SUCCESS':
      return 'Thành công';
    case 'FAILED':
      return 'Thất bại';
    case 'CANCELLED':
    case 'DA_HUY':
      return 'Đã hủy';
    default:
      return humanizeEnum(status);
  }
};
