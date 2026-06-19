import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { AppButton } from '@/src/components/ui/AppButton';
import { AppInput } from '@/src/components/ui/AppInput';
import { DatePickerField } from '@/src/components/ui/DatePickerField';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { ModalShell } from '@/src/components/ui/ModalShell';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { PaymentSessionCard } from '@/src/components/payment/PaymentSessionCard';
import {
  useCreateShipPayment,
  useShipCodePayments,
} from '@/src/features/customer-portal/shared/hooks/use-ship-payments';
import { useCustomerVouchers } from '@/src/features/customer-portal/shared/hooks/use-customer-vouchers';
import {
  ShipPaymentErrorCode,
  type CreateShipPaymentRequest,
  type ShipCodePaymentItem,
  type ShipPaymentResult,
} from '@/src/features/customer-portal/shared/types/shipping-payment.types';
import type { CustomerPaymentSession } from '@/src/features/customer-portal/shared/types/customer-portal.types';
import { useScreenContentTopPadding } from '@/src/shared/lib/layout/safe-area';
import { formatCurrency, formatDate, formatWeight } from '@/src/shared/lib/utils';
import { borderRadius, colors, fontFamilyForWeight, spacing, typography } from '@/src/theme/tokens';

type PaymentTab = 'unpaid' | 'paid';

const PAGE_SIZE = 20;
const TIXIMAX_BANK_ACCOUNT = {
  id: '2',
  accountHolder: 'CONG TY CO PHAN TIXIMAX',
  accountNumber: '1990397979',
  bankName: 'TCB',
};

export default function ShippingPaymentsScreen() {
  const contentPaddingTop = useScreenContentTopPadding(spacing.md, { hasHeader: true });
  const [tab, setTab] = useState<PaymentTab>('unpaid');
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [payingItem, setPayingItem] = useState<ShipCodePaymentItem | null>(null);
  const [paymentResult, setPaymentResult] = useState<ShipPaymentResult | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      payment: tab === 'paid',
      page,
      size: PAGE_SIZE,
      keyword: keyword.trim() || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [dateFrom, dateTo, keyword, page, tab],
  );
  const paymentsQuery = useShipCodePayments(query);
  const items = paymentsQuery.data?.content ?? [];
  const total = paymentsQuery.data?.totalElements ?? items.length;

  const changeTab = (value: PaymentTab) => {
    setTab(value);
    setPage(1);
  };

  // Đóng cả luồng thanh toán (form + QR). Dùng 1 modal duy nhất nên không có cảnh
  // present/dismiss chồng nhau khiến QR bị ẩn.
  const closePaymentFlow = () => {
    setPayingItem(null);
    setPaymentResult(null);
    void paymentsQuery.refetch();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.shipCode}
        renderItem={({ item }) => (
          <ShipCodePaymentCard
            item={item}
            onPay={(value) => {
              setPaymentResult(null);
              setPayingItem(value);
            }}
          />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Thanh toán ship</Text>
            <Text style={styles.subtitle}>Xem cước theo mã ship và tạo thanh toán phí vận chuyển.</Text>
            <SegmentedControl
              value={tab}
              onChange={changeTab}
              segments={[
                { label: 'Chưa thanh toán', value: 'unpaid' },
                { label: 'Đã thanh toán', value: 'paid' },
              ]}
            />
            <AppInput
              label="Tìm kiếm"
              placeholder="Mã ship"
              value={keyword}
              onChangeText={(value) => {
                setKeyword(value);
                setPage(1);
              }}
            />
            <View style={styles.dateRow}>
              <View style={styles.dateCol}>
                <DatePickerField
                  label="Từ ngày"
                  value={dateFrom}
                  onChange={(value) => {
                    setDateFrom(value);
                    setPage(1);
                  }}
                  maxDate={dateTo || undefined}
                  disableFuture
                />
              </View>
              <View style={styles.dateCol}>
                <DatePickerField
                  label="Đến ngày"
                  value={dateTo}
                  onChange={(value) => {
                    setDateTo(value);
                    setPage(1);
                  }}
                  minDate={dateFrom || undefined}
                  disableFuture
                />
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          paymentsQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing['3xl'] }} />
          ) : paymentsQuery.isError ? (
            <ErrorState
              title="Không tải được mã ship"
              description={paymentsQuery.error instanceof Error ? paymentsQuery.error.message : undefined}
              onRetry={() => void paymentsQuery.refetch()}
              isRetrying={paymentsQuery.isFetching}
            />
          ) : (
            <EmptyState
              icon="credit-card"
              title={tab === 'paid' ? 'Chưa có mã đã thanh toán' : 'Chưa có mã cần thanh toán'}
            />
          )
        }
        ListFooterComponent={
          total > items.length ? (
            <AppButton
              title="Tải thêm"
              variant="outline"
              onPress={() => setPage((current) => current + 1)}
              isLoading={paymentsQuery.isFetching}
            />
          ) : null
        }
        contentContainerStyle={[styles.content, { paddingTop: contentPaddingTop }]}
        refreshControl={
          <RefreshControl
            refreshing={paymentsQuery.isRefetching}
            onRefresh={() => void paymentsQuery.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />

      <ModalShell
        visible={Boolean(payingItem)}
        title={
          paymentResult
            ? 'QR thanh toán ship'
            : payingItem
              ? `Thanh toán ${payingItem.shipCode}`
              : ''
        }
        onClose={closePaymentFlow}
      >
        {payingItem && !paymentResult ? (
          <ShipPaymentForm
            item={payingItem}
            onClose={closePaymentFlow}
            onWalletPaid={closePaymentFlow}
            onQrCreated={(result) => setPaymentResult(result)}
          />
        ) : null}
        {payingItem && paymentResult ? (
          <ShipPaymentQrView
            result={paymentResult}
            onViewImage={setSelectedImageUrl}
          />
        ) : null}
      </ModalShell>

      <Modal
        visible={Boolean(selectedImageUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImageUrl(null)}
      >
        <View style={styles.imageViewer}>
          <Pressable
            style={styles.imageViewerClose}
            onPress={() => setSelectedImageUrl(null)}
            accessibilityRole="button"
            accessibilityLabel="Đóng QR"
          >
            <Feather name="x" size={22} color={colors.white} />
          </Pressable>
          {selectedImageUrl ? (
            <Image source={{ uri: selectedImageUrl }} style={styles.imageViewerImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function ShipCodePaymentCard({
  item,
  onPay,
}: {
  item: ShipCodePaymentItem;
  onPay: (item: ShipCodePaymentItem) => void;
}) {
  const status = item.payment
    ? 'DA_THANH_TOAN_SHIP'
    : item.isReadyForPayment
      ? 'CHO_THANH_TOAN_SHIP'
      : 'CHUA_DU_DIEU_KIEN';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Feather name="package" size={18} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.shipCode}</Text>
          <Text style={styles.cardMeta}>{formatDate(item.createdAt)}</Text>
        </View>
        <StatusBadge status={status} />
      </View>
      <InfoRow label="Trọng lượng" value={formatWeight(item.totalWeight)} />
      <InfoRow label="Phí ship" value={formatCurrency(item.totalPriceShip)} highlight />
      {item.feeBreakdown?.domesticShippingFeePreview > 0 ? (
        <InfoRow
          label="Phí ship nội địa"
          value={formatCurrency(item.feeBreakdown.domesticShippingFeePreview)}
          highlight
        />
      ) : null}
      <InfoRow label="Phí ngoại" value={formatCurrency(item.totalForeignInboundFeeVndPreview)} />
      <InfoRow label="Số dư ví" value={formatCurrency(item.customerBalance)} />
      {item.address ? <InfoRow label="Địa chỉ" value={item.address} /> : null}
      <View style={styles.actions}>
        <AppButton
          title={item.payment ? 'Đã thanh toán' : 'Thanh toán'}
          size="sm"
          disabled={item.payment || !item.isReadyForPayment}
          onPress={() => onPay(item)}
        />
      </View>
    </View>
  );
}

function ShipPaymentForm({
  item,
  onClose,
  onWalletPaid,
  onQrCreated,
}: {
  item: ShipCodePaymentItem;
  onClose: () => void;
  onWalletPaid: () => void;
  onQrCreated: (result: ShipPaymentResult) => void;
}) {
  const createMutation = useCreateShipPayment();
  // Lấy voucher theo TẤT CẢ tuyến của mã ship (BE lọc theo routeId — có thể nhiều tuyến).
  const routeId =
    (item.routeSummaries ?? []).map((route) => String(route.routeId)).join(',') || undefined;
  const vouchersQuery = useCustomerVouchers(item.customerId, routeId);
  const [useBalance, setUseBalance] = useState(false);
  const [customerVoucherId, setCustomerVoucherId] = useState('');

  useEffect(() => {
    setUseBalance(false);
    setCustomerVoucherId('');
  }, [item]);

  // Áp dụng TẤT CẢ voucher hệ thống BE trả về cho (khách + tuyến) — không tự lọc thêm.
  const systemVouchers = vouchersQuery.data?.systemVouchers ?? [];
  const appliedSystemVoucherIds = systemVouchers.map((voucher) => String(voucher.voucherId));

  // Ước tính mức giảm để hiển thị + trừ vào tổng (BE vẫn là nơi tính cuối cùng).
  const baseShippingFee = item.feeBreakdown?.internationalShippingFee ?? item.totalPriceShip;
  const systemVoucherItems = systemVouchers.map((voucher) => {
    let discountBase = baseShippingFee;
    if (voucher.routeIds?.length) {
      const matched = new Set(voucher.routeIds.map(String));
      const matchedFee = (item.routeSummaries ?? [])
        .filter((route) => matched.has(String(route.routeId)))
        .reduce((sum, route) => sum + route.totalPriceShip, 0);
      if (matchedFee > 0) discountBase = matchedFee;
    }
    const discount =
      voucher.type === 'PHAN_TRAM'
        ? Math.floor((discountBase * voucher.value) / 100)
        : Math.min(voucher.value, discountBase);
    return { voucher, discount };
  });
  const systemVoucherDiscount = systemVoucherItems.reduce((sum, entry) => sum + entry.discount, 0);

  const baseTotal =
    item.feeBreakdown?.previewSubtotal ??
    item.totalPriceShip + item.totalForeignInboundFeeVndPreview;
  const totalAmount = Math.max(0, baseTotal - systemVoucherDiscount);
  const balanceToUse = useBalance ? Math.min(item.customerBalance, totalAmount) : 0;
  const amountToPay = Math.max(0, totalAmount - balanceToUse);
  const breakdownRows = [
    {
      label: 'Phí vận chuyển quốc tế',
      amount: item.feeBreakdown?.internationalShippingFee,
    },
    { label: 'Phụ thu', amount: item.feeBreakdown?.surchargePreview },
    {
      label: 'Phí nhập kho ngoại',
      amount: item.feeBreakdown?.foreignInboundFeeVndPreview,
    },
    { label: 'Nợ ship web', amount: item.feeBreakdown?.shipWebDebtPreview },
    {
      label: 'Phí đơn chưa thanh toán',
      amount: item.feeBreakdown?.unpaidOrderChargePreview,
    },
    {
      label: 'Phí ship nội địa',
      amount: item.feeBreakdown?.domesticShippingFeePreview,
    },
  ].filter((row) => Number(row.amount) > 0);

  const handleResult = (result: ShipPaymentResult) => {
    if (Number(result.collected_amount) === 0) {
      Toast.show({ type: 'success', text1: 'Đã thanh toán bằng ví' });
      onWalletPaid();
    } else {
      Toast.show({ type: 'success', text1: 'Đã tạo mã QR thanh toán' });
      onQrCreated(result);
    }
  };

  const submit = async () => {
    const payload: CreateShipPaymentRequest = {
      isUseBalance: useBalance,
      bankId: TIXIMAX_BANK_ACCOUNT.id,
      customerVoucherId: customerVoucherId.trim() || undefined,
      systemVoucherIds: appliedSystemVoucherIds.length ? appliedSystemVoucherIds : undefined,
    };

    try {
      const result = await createMutation.mutateAsync({ shipCode: item.shipCode, payload });
      handleResult(result);
    } catch (error: any) {
      const errorCode = error?.response?.data?.code;
      // Voucher HỆ THỐNG tự áp nhưng BE từ chối → thử lại bỏ voucher hệ thống để khách vẫn thanh toán được.
      // Chỉ làm khi khách KHÔNG tự gõ voucher cá nhân (nếu có thì để báo lỗi cho khách sửa).
      if (
        errorCode === ShipPaymentErrorCode.VOUCHER_NOT_OWNED_OR_NOT_FOUND &&
        payload.systemVoucherIds?.length &&
        !payload.customerVoucherId
      ) {
        try {
          const result = await createMutation.mutateAsync({
            shipCode: item.shipCode,
            payload: { ...payload, systemVoucherIds: undefined },
          });
          Toast.show({
            type: 'info',
            text1: 'Không áp được voucher',
            text2: 'Đã tạo thanh toán không kèm voucher.',
          });
          handleResult(result);
          return;
        } catch (retryError: any) {
          Toast.show({
            type: 'error',
            text1: 'Thanh toán thất bại',
            text2: getShipPaymentErrorMessage(
              retryError?.response?.data?.code,
              retryError?.response?.data?.message || retryError?.message,
            ),
          });
          return;
        }
      }
      Toast.show({
        type: 'error',
        text1: 'Thanh toán thất bại',
        text2: getShipPaymentErrorMessage(errorCode, error?.response?.data?.message || error?.message),
      });
    }
  };

  return (
    <>
      <View style={styles.breakdownBox}>
        <Text style={styles.breakdownTitle}>Chi tiết cước</Text>
        {breakdownRows.map((row) => (
          <InfoRow key={row.label} label={row.label} value={formatCurrency(row.amount)} />
        ))}
        {systemVoucherDiscount > 0 ? (
          <InfoRow label="Giảm voucher" value={`-${formatCurrency(systemVoucherDiscount)}`} />
        ) : null}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tổng cần thanh toán</Text>
          <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
        </View>
      </View>

      <Pressable
        style={[styles.checkboxRow, useBalance && styles.checkboxRowActive]}
        onPress={() => setUseBalance((current) => !current)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: useBalance }}
      >
        <View style={[styles.checkbox, useBalance && styles.checkboxActive]}>
          {useBalance ? <Feather name="check" size={14} color={colors.black} /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.checkboxTitle}>Dùng số dư ví</Text>
          <Text style={styles.checkboxMeta}>{formatCurrency(item.customerBalance)}</Text>
        </View>
      </Pressable>

      {useBalance ? (
        <View style={styles.balanceBox}>
          <Text style={styles.balanceLabel}>Còn cần trả</Text>
          <Text style={styles.balanceValue}>{formatCurrency(amountToPay)}</Text>
        </View>
      ) : null}

      <View style={styles.bankBox}>
        <Text style={styles.inputLabel}>Tài khoản nhận tiền</Text>
        <Text style={styles.bankText}>
          {TIXIMAX_BANK_ACCOUNT.accountHolder} · {TIXIMAX_BANK_ACCOUNT.accountNumber} ({TIXIMAX_BANK_ACCOUNT.bankName})
        </Text>
      </View>

      {vouchersQuery.isLoading ? (
        <View style={styles.voucherLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.voucherLoadingText}>Đang kiểm tra voucher...</Text>
        </View>
      ) : systemVoucherItems.length > 0 ? (
        <View style={styles.voucherBox}>
          <View style={styles.voucherHeader}>
            <Feather name="tag" size={14} color={colors.successText} />
            <Text style={styles.voucherHeaderText}>Voucher hệ thống được áp dụng</Text>
          </View>
          {systemVoucherItems.map(({ voucher, discount }) => (
            <View key={String(voucher.voucherId)} style={styles.voucherRow}>
              <View style={styles.voucherInfo}>
                <Text style={styles.voucherCode}>{voucher.code}</Text>
                {voucher.description ? (
                  <Text style={styles.voucherDesc} numberOfLines={1}>
                    {voucher.description}
                  </Text>
                ) : null}
              </View>
              {discount > 0 ? (
                <Text style={styles.voucherDiscount}>-{formatCurrency(discount)}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <AppInput
        label="Voucher cá nhân"
        placeholder="Nhập mã voucher cá nhân (nếu có)"
        value={customerVoucherId}
        onChangeText={setCustomerVoucherId}
        autoCapitalize="characters"
      />

      <Text style={styles.warningText}>Khách hàng không được chỉnh sửa giá ship. Hệ thống sẽ tính cước theo dữ liệu kho.</Text>

      <View style={styles.modalActions}>
        <AppButton title="Đóng" variant="outline" onPress={onClose} disabled={createMutation.isPending} />
        <AppButton
          title="Xác nhận"
          onPress={() => void submit()}
          isLoading={createMutation.isPending}
        />
      </View>
    </>
  );
}

function ShipPaymentQrView({
  result,
  onViewImage,
}: {
  result: ShipPaymentResult;
  onViewImage: (url: string) => void;
}) {
  if (Number(result.collected_amount) <= 0) return null;

  const session: CustomerPaymentSession = {
    paymentId: result.payment_id,
    paymentCode: result.payment_code,
    paymentMethod: 'BANK_TRANSFER',
    paymentType: result.payment_type,
    purpose: result.purpose || 'SHIPPING_FEE_PAYMENT',
    amount: null,
    qrCode: result.qr_code,
    content: result.content,
    status: result.status || 'CHO_THANH_TOAN_SHIP',
    createdAt: result.action_at,
    actionAt: result.action_at,
  };

  return (
    <>
      <View style={styles.qrHeaderBox}>
        <Text style={styles.qrHeaderLabel}>Số tiền cần trả</Text>
        <Text style={styles.qrHeaderAmount}>{formatCurrency(result.collected_amount)}</Text>
        <Text style={styles.pollingText}>
          Quét mã QR để chuyển khoản phí vận chuyển. Đóng cửa sổ sau khi thanh toán để cập nhật trạng thái.
        </Text>
      </View>
      <PaymentSessionCard
        session={session}
        onViewImage={onViewImage}
        isPending
        secondaryAction="save-qr"
      />
    </>
  );
}

function getShipPaymentErrorMessage(errorCode?: string, fallback?: string) {
  switch (errorCode) {
    case ShipPaymentErrorCode.DRAFT_DOMESTIC_NO_SALE_ASSIGNED:
      return 'Đơn hàng chưa được phân công nhân viên sale. Vui lòng liên hệ bộ phận hỗ trợ.';
    case ShipPaymentErrorCode.PARTIAL_SHIPMENT_ALREADY_PENDING:
      return 'Đã có giao dịch thanh toán đang chờ xử lý. Vui lòng đợi giao dịch trước hoàn tất.';
    case ShipPaymentErrorCode.VOUCHER_NOT_OWNED_OR_NOT_FOUND:
      return 'Voucher không khả dụng';
    case ShipPaymentErrorCode.SHIP_ORDER_ACCESS_DENIED:
      return 'Bạn không có quyền thanh toán cho đơn hàng này.';
    case ShipPaymentErrorCode.DOMESTIC_TRACKING_NOT_IN_VN_WAREHOUSE:
      return 'Hàng chưa về kho Việt Nam.';
    default:
      return fallback || 'Vui lòng thử lại sau.';
  }
}

function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && styles.infoValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  header: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dateCol: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  cardMeta: {
    marginTop: 2,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: typography.fontSize.xs,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  infoValueHighlight: {
    color: colors.error,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
  },
  actions: {
    marginTop: spacing.md,
    alignItems: 'flex-end',
  },
  breakdownBox: {
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  breakdownTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  totalRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  totalLabel: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
  },
  totalValue: {
    color: colors.error,
    fontSize: typography.fontSize.lg,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
  },
  checkboxRow: {
    minHeight: 56,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  checkboxRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkboxTitle: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
  },
  checkboxMeta: {
    marginTop: 2,
    color: colors.successText,
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
  },
  balanceBox: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.successLight,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  balanceLabel: {
    color: colors.successText,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
  },
  balanceValue: {
    color: colors.successText,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
  },
  bankBox: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  bankText: {
    color: colors.textPrimary,
    fontSize: typography.fontSize.sm,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
  },
  voucherLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  voucherLoadingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  voucherBox: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  voucherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  voucherHeaderText: {
    color: colors.successText,
    fontSize: typography.fontSize.xs,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    textTransform: 'uppercase',
  },
  voucherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  voucherInfo: {
    flex: 1,
  },
  voucherCode: {
    color: colors.textPrimary,
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
  },
  voucherDesc: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
  },
  voucherDiscount: {
    color: colors.successText,
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
  },
  warningText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  qrHeaderBox: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  qrHeaderLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    textTransform: 'uppercase',
  },
  qrHeaderAmount: {
    marginTop: 2,
    color: colors.textPrimary,
    fontSize: typography.fontSize['2xl'],
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
  },
  pollingText: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  imageViewer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.96)',
  },
  imageViewerClose: {
    position: 'absolute',
    top: spacing['3xl'],
    right: spacing.lg,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
  },
});
