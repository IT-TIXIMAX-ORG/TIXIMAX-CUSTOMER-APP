export const humanizeEnum = (value?: string | null) =>
  String(value || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Chưa cập nhật';

export const normalizeLabelKey = (value?: string | null) =>
  String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const orderTypeLabel = (type?: string | null) => {
  switch (normalizeLabelKey(type)) {
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
  switch (normalizeLabelKey(purpose)) {
    case 'ORDER_PAYMENT':
    case 'THANH_TOAN_TIEN_HANG':
      return 'Thanh toán tiền hàng';
    case 'THANH_TOAN_DON_HANG':
      return 'Thanh toán đơn hàng';
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
  switch (normalizeLabelKey(status)) {
    case 'CHO_XAC_NHAN':
      return 'Chờ xác nhận';
    case 'DA_XAC_NHAN':
      return 'Đã xác nhận';
    case 'CHO_THANH_TOAN':
    case 'CHO_THANH_TOAN_DAU_GIA':
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

export const orderLogActionLabel = (action?: string | null) => {
  switch (normalizeLabelKey(action)) {
    case 'TAO_DON':
    case 'TAO_DON_HANG':
      return 'Tạo đơn hàng';
    case 'TAO_THANH_TOAN_HANG':
    case 'TAO_THANH_TOAN_DON_HANG':
    case 'CREATE_ORDER_PAYMENT':
      return 'Tạo thanh toán đơn hàng';
    case 'CAP_NHAT_DON':
    case 'CAP_NHAT_DON_HANG':
      return 'Cập nhật đơn hàng';
    case 'DUYET_DON':
      return 'Duyệt đơn';
    case 'DUYET_DON_CUSTOMER':
      return 'Duyệt đơn khách hàng';
    case 'XAC_NHAN_DON':
      return 'Xác nhận đơn';
    case 'HUY_DON':
      return 'Hủy đơn';
    case 'YEU_CAU_HUY':
      return 'Yêu cầu hủy';
    default:
      return action ? statusLabel(action) : 'Cập nhật đơn hàng';
  }
};
