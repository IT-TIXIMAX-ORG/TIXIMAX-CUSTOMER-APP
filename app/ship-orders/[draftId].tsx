import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppInput } from '@/src/components/ui/AppInput';
import { DatePickerField } from '@/src/components/ui/DatePickerField';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { ModalShell } from '@/src/components/ui/ModalShell';
import { SearchableSelectSheet } from '@/src/components/ui/SearchableSelectSheet';
import { SelectSheet } from '@/src/components/ui/SelectSheet';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { AllingoTrackingStrip } from '@/src/components/orders/AllingoTrackingStrip';
import {
  useBookAllingo,
  useCancelAllingo,
  useCancelShipOrder,
  useCreateShipOrder,
  useShipOrderSummary,
  useSyncAllingo,
  useUpdateShipOrder,
} from '@/src/features/customer-portal/shared/hooks/use-ship-orders';
import { getAllingoQuotes, getCustomerShipOrderDetail } from '@/src/features/customer-portal/shared/services/ship-order.service';
import { useCustomerDomesticDeliveries } from '@/src/features/customer-portal/shared/hooks/use-customer-portal-data';
import { useCustomerProfile } from '@/src/features/customer-portal/shared/hooks/use-customer-profile';
import {
  isAllingoCancellationLocked,
  SHIP_ORDER_ERROR_CODES,
  type AllingoQuote,
  type CarrierCode,
  type ShipOrderSummaryItem,
} from '@/src/features/customer-portal/shared/types/ship-order.types';
import { useScreenContentTopPadding } from '@/src/shared/lib/layout/safe-area';
import { formatCurrency, formatDate } from '@/src/shared/lib/utils';
import { colors, borderRadius, fontFamilyForWeight, spacing, typography } from '@/src/theme/tokens';

const CARRIER_OPTIONS: Array<{ label: string; value: CarrierCode }> = [
  { label: 'J&T Express', value: 'JT' },
  { label: 'Allingo (giao nhanh nội thành)', value: 'ALLINGO' },
  { label: 'Hãng khác (Grab, Be, ...)', value: 'OTHER' },
];

const CARRIER_LABEL: Record<string, string> = {
  JT: 'J&T Express',
  ALLINGO: 'Allingo',
  OTHER: 'Hãng khác',
  VNPOST: 'VNPost',
};

const SHIP_ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ xuất kho',
  EXPORTED: 'Đã xuất kho',
  CANCELLED: 'Đã hủy',
};

// Slot giờ hẹn lấy hàng: 07:00 → 21:00, bước 30 phút.
const TIME_SLOT_OPTIONS = Array.from({ length: 29 }, (_, i) => {
  const total = 7 * 60 + i * 30;
  const h = String(Math.floor(total / 60)).padStart(2, '0');
  const m = String(total % 60).padStart(2, '0');
  return { label: `${h}:${m}`, value: `${h}:${m}` };
});

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const buildBookingTime = (date: string, slot: string): string | null => {
  if (!date || !slot) return null;
  const parsed = new Date(`${date}T${slot}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const formatAddress = (street?: string | null, ward?: string | null, province?: string | null) =>
  [street, ward, province].map((p) => (p ?? '').trim()).filter(Boolean).join(', ');

export default function ShipOrdersScreen() {
  const { draftId: draftIdParam } = useLocalSearchParams<{ draftId?: string }>();
  const contentPaddingTop = useScreenContentTopPadding(spacing.md, { hasHeader: true });

  const domesticQuery = useCustomerDomesticDeliveries(1, 50);
  const { data: profile } = useCustomerProfile();
  const [manualDraftId, setManualDraftId] = useState<string | null>(null);

  const lockedDrafts = useMemo(
    () => (domesticQuery.data?.content ?? []).filter((d) => d.status === 'LOCKED'),
    [domesticQuery.data],
  );

  const paramId =
    draftIdParam && draftIdParam !== 'undefined' && draftIdParam !== 'select' ? draftIdParam : null;
  const draftId =
    paramId ?? manualDraftId ?? (lockedDrafts.length === 1 ? lockedDrafts[0].draftDomesticId : null);

  const draft = useMemo(
    () => (domesticQuery.data?.content ?? []).find((d) => d.draftDomesticId === draftId) ?? null,
    [domesticQuery.data, draftId],
  );

  const summaryQuery = useShipOrderSummary(draftId);
  const summary = summaryQuery.data;
  const availablePackages = summary?.availableKien ?? [];
  const existingOrders = summary?.shipOrders ?? [];

  const createMutation = useCreateShipOrder();
  const updateMutation = useUpdateShipOrder();
  const cancelShipOrderMutation = useCancelShipOrder();
  const syncMutation = useSyncAllingo();
  const cancelAllingoMutation = useCancelAllingo();

  // ─── Form state ───
  const [carrierCode, setCarrierCode] = useState<CarrierCode>('JT');
  const [subCarrierNote, setSubCarrierNote] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingSlot, setBookingSlot] = useState('');
  const [note, setNote] = useState('');
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [editingShipOrderId, setEditingShipOrderId] = useState<string | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  // draftId đã prefill form — dùng để prefill lại khi khách đổi sang phiếu khác.
  const [prefilledId, setPrefilledId] = useState<string | null>(null);

  // ─── Quotes bottom-sheet ───
  const [quoteShipOrderId, setQuoteShipOrderId] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<AllingoQuote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [quotesError, setQuotesError] = useState<string | null>(null);
  const bookMutation = useBookAllingo();

  const savedAddressOptions = useMemo(
    () =>
      (profile?.addresses ?? []).map((addr) => ({
        value: addr.addressId,
        label: formatAddress(addr.streetAddress, addr.ward, addr.province) || addr.addressName || 'Địa chỉ đã lưu',
      })),
    [profile?.addresses],
  );

  // Prefill SĐT + địa chỉ mặc định của phiếu; chạy lại khi đổi sang phiếu khác
  // (draftDomesticId khác), không clobber khi domesticQuery chỉ refetch cùng phiếu.
  useEffect(() => {
    if (draft && draft.draftDomesticId !== prefilledId) {
      setPhoneNumber(draft.phoneNumber ?? '');
      setAddress(draft.address ?? '');
      setPrefilledId(draft.draftDomesticId);
      setEditingShipOrderId(null);
      setSelectedPackages([]);
    }
  }, [draft, prefilledId]);

  const resetForm = () => {
    setCarrierCode('JT');
    setSubCarrierNote('');
    setAddress(draft?.address ?? '');
    setPhoneNumber(draft?.phoneNumber ?? '');
    setBookingDate('');
    setBookingSlot('');
    setNote('');
    setSelectedPackages([]);
    setEditingShipOrderId(null);
  };

  const togglePackage = (code: string) =>
    setSelectedPackages((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );

  const handleCreate = async () => {
    if (!draftId) return;
    if (selectedPackages.length === 0) {
      Toast.show({ type: 'error', text1: 'Vui lòng chọn ít nhất 1 kiện' });
      return;
    }
    if (carrierCode === 'OTHER' && !subCarrierNote.trim()) {
      Toast.show({ type: 'error', text1: 'Vui lòng nhập tên hãng vận chuyển' });
      return;
    }
    const finalPhone = phoneNumber.trim();
    if (finalPhone && !/^[0-9]{10,11}$/.test(finalPhone)) {
      Toast.show({ type: 'error', text1: 'Số điện thoại không hợp lệ (10-11 chữ số)' });
      return;
    }

    const bookingTime = buildBookingTime(bookingDate, bookingSlot);
    const commonPayload = {
      shippingList: selectedPackages,
      carrierCode,
      note: note.trim() || null,
      subCarrierNote: carrierCode === 'OTHER' ? subCarrierNote.trim() : null,
      address: address.trim() || null,
      phoneNumber: finalPhone || null,
      bookingTime,
    };

    try {
      if (editingShipOrderId) {
        await updateMutation.mutateAsync({ shipOrderId: editingShipOrderId, payload: commonPayload });
        Toast.show({ type: 'success', text1: 'Đã cập nhật đơn giao' });
      } else {
        await createMutation.mutateAsync({ draftDomesticId: Number(draftId), ...commonPayload });
        Toast.show({ type: 'success', text1: 'Đã tạo đơn giao' });
      }
      resetForm();
    } catch (error: any) {
      const code = error?.response?.data?.code;
      const message =
        code === SHIP_ORDER_ERROR_CODES.ALLINGO_BOOKED_LOCK
          ? 'Đơn đã book Allingo, không sửa được. Hãy hủy Allingo trước.'
          : error?.response?.data?.message || error?.message || 'Thao tác thất bại';
      Toast.show({ type: 'error', text1: message });
    }
  };

  const handleStartEdit = async (item: ShipOrderSummaryItem) => {
    setLoadingEditId(item.shipOrderId);
    try {
      const detail = await getCustomerShipOrderDetail(item.shipOrderId);
      setCarrierCode(detail.carrierCode ?? 'JT');
      setSubCarrierNote(detail.subCarrierNote ?? '');
      setAddress(detail.address ?? draft?.address ?? '');
      setPhoneNumber(detail.phoneNumber ?? draft?.phoneNumber ?? '');
      setNote(detail.note ?? '');
      setSelectedPackages(detail.shippingList.map((s) => s.trackingCode));
      if (detail.bookingTime) {
        const d = new Date(detail.bookingTime);
        setBookingDate(localDateOf(d));
        setBookingSlot(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
      } else {
        setBookingDate('');
        setBookingSlot('');
      }
      setEditingShipOrderId(item.shipOrderId);
    } catch {
      Toast.show({ type: 'error', text1: 'Không tải được đơn giao để sửa' });
    } finally {
      setLoadingEditId(null);
    }
  };

  const handleDeleteOrder = (item: ShipOrderSummaryItem) => {
    Alert.alert('Xóa đơn giao', `Xóa đơn ${item.shipCode}? Kiện sẽ được trả về phiếu.`, [
      { text: 'Giữ lại', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelShipOrderMutation.mutateAsync(item.shipOrderId);
            Toast.show({ type: 'success', text1: 'Đã xóa đơn giao' });
            if (editingShipOrderId === item.shipOrderId) resetForm();
          } catch (error: any) {
            Toast.show({
              type: 'error',
              text1: error?.response?.data?.message || error?.message || 'Xóa thất bại',
            });
          }
        },
      },
    ]);
  };

  const openQuotes = async (shipOrderId: string) => {
    setQuoteShipOrderId(shipOrderId);
    setQuotes([]);
    setQuotesError(null);
    setLoadingQuotes(true);
    try {
      const data = await getAllingoQuotes(shipOrderId);
      setQuotes([...data].sort((a, b) => a.price - b.price));
    } catch (error: any) {
      setQuotesError(error?.response?.data?.message || error?.message || 'Không thể tải báo giá');
    } finally {
      setLoadingQuotes(false);
    }
  };

  const bookQuote = async (serviceId: string) => {
    if (!quoteShipOrderId) return;
    try {
      await bookMutation.mutateAsync({ shipOrderId: quoteShipOrderId, serviceId });
      Toast.show({ type: 'success', text1: 'Đã đặt Allingo' });
      setQuoteShipOrderId(null);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: error?.response?.data?.message || error?.message || 'Đặt Allingo thất bại',
      });
    }
  };

  const syncOrder = async (shipOrderId: string) => {
    try {
      await syncMutation.mutateAsync(shipOrderId);
      Toast.show({ type: 'success', text1: 'Đã đồng bộ trạng thái' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error?.response?.data?.message || error?.message || 'Đồng bộ thất bại' });
    }
  };

  const cancelAllingoOrder = (item: ShipOrderSummaryItem) => {
    Alert.alert('Hủy Allingo', `Hủy đơn Allingo cho ${item.shipCode}?`, [
      { text: 'Đóng', style: 'cancel' },
      {
        text: 'Hủy Allingo',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelAllingoMutation.mutateAsync({
              shipOrderId: item.shipOrderId,
              reason: 'Khách hàng yêu cầu hủy từ app',
            });
            Toast.show({ type: 'success', text1: 'Đã gửi yêu cầu hủy Allingo' });
          } catch (error: any) {
            Toast.show({
              type: 'error',
              text1: error?.response?.data?.message || error?.message || 'Hủy Allingo thất bại',
            });
          }
        },
      },
    ]);
  };

  // ─── Không xác định được draft ───
  if (!draftId) {
    return (
      <View style={styles.container}>
        <View style={[styles.content, { paddingTop: contentPaddingTop }]}>
          {domesticQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing['3xl'] }} />
          ) : lockedDrafts.length > 1 ? (
            <>
              <Text style={styles.sectionLabel}>Chọn phiếu để tạo đơn giao</Text>
              <SelectSheet
                label="Phiếu giao (đã khóa)"
                placeholder="Chọn phiếu"
                value={manualDraftId ?? undefined}
                options={lockedDrafts.map((d) => ({
                  value: d.draftDomesticId,
                  label: `${d.shipCode || d.draftDomesticId} — ${d.address ?? 'Chưa có địa chỉ'}`,
                }))}
                onChange={setManualDraftId}
              />
            </>
          ) : (
            <EmptyState
              icon="truck"
              title="Chưa có phiếu sẵn sàng"
              description="Cần có phiếu giao đã khóa (LOCKED) để tạo đơn giao. Hãy tạo/khóa phiếu ở màn Xác nhận trước."
            />
          )}
        </View>
      </View>
    );
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: contentPaddingTop }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={summaryQuery.isRefetching}
            onRefresh={() => void summaryQuery.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Summary phiếu */}
        <AppCard style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryCode}>{summary?.shipCode || draft?.shipCode || `Phiếu ${draftId}`}</Text>
              <Text style={styles.summarySub}>Phiếu giao nội địa</Text>
            </View>
            <StatusBadge status="DA_XAC_NHAN" label="Đã khóa" />
          </View>
          <View style={styles.statsRow}>
            <Stat label="Tổng kiện" value={summary?.totalKien.length ?? 0} />
            <Stat label="Đã gán" value={summary?.claimedKien.length ?? 0} tone="warning" />
            <Stat label="Còn trống" value={availablePackages.length} tone="success" />
          </View>
        </AppCard>

        {/* Form tạo / sửa đơn giao */}
        {summaryQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : summaryQuery.isError ? (
          <ErrorState
            title="Không tải được phiếu"
            description={summaryQuery.error instanceof Error ? summaryQuery.error.message : undefined}
            onRetry={() => void summaryQuery.refetch()}
            isRetrying={summaryQuery.isFetching}
          />
        ) : availablePackages.length === 0 && !editingShipOrderId ? (
          <AppCard style={styles.allDoneCard}>
            <Feather name="check-circle" size={26} color={colors.successText} />
            <Text style={styles.allDoneText}>Tất cả kiện đã được tạo đơn giao</Text>
          </AppCard>
        ) : (
          <AppCard style={[styles.formCard, Boolean(editingShipOrderId) && styles.formCardEditing]}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>{editingShipOrderId ? 'Sửa đơn giao' : 'Tạo đơn giao'}</Text>
              {editingShipOrderId ? (
                <Pressable
                  onPress={resetForm}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Hủy sửa đơn giao"
                >
                  <Text style={styles.cancelEdit}>Hủy sửa</Text>
                </Pressable>
              ) : null}
            </View>

            <SelectSheet
              label="Đơn vị vận chuyển"
              value={carrierCode}
              options={CARRIER_OPTIONS}
              onChange={(v) => setCarrierCode(v as CarrierCode)}
            />
            {carrierCode === 'OTHER' ? (
              <AppInput
                label="Tên hãng vận chuyển *"
                placeholder="VD: Grab, Be, Ahamove..."
                value={subCarrierNote}
                onChangeText={setSubCarrierNote}
              />
            ) : null}

            {/* Địa chỉ gộp 1 control: hiển thị địa chỉ hiện tại (mặc định = địa chỉ phiếu),
                chạm để chọn từ sổ trong modal; địa chỉ đã chọn hiện luôn trên trigger. */}
            <SearchableSelectSheet
              label="Địa chỉ giao"
              placeholder="Chọn địa chỉ giao"
              searchPlaceholder="Tìm địa chỉ đã lưu..."
              value={address}
              options={savedAddressOptions}
              onChange={(addrId) => {
                const picked = (profile?.addresses ?? []).find((a) => a.addressId === addrId);
                if (picked) setAddress(formatAddress(picked.streetAddress, picked.ward, picked.province));
              }}
              emptyText="Chưa có địa chỉ đã lưu"
            />
            <AppInput
              label="Số điện thoại"
              placeholder="SĐT người nhận"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />

            <View style={styles.dateRow}>
              <View style={styles.dateCol}>
                <DatePickerField
                  label="Ngày hẹn lấy"
                  value={bookingDate}
                  onChange={setBookingDate}
                  minDate={localToday()}
                />
              </View>
              <View style={styles.dateCol}>
                <SelectSheet
                  label="Giờ hẹn"
                  placeholder="Chọn giờ"
                  value={bookingSlot}
                  options={TIME_SLOT_OPTIONS}
                  onChange={setBookingSlot}
                />
              </View>
            </View>

            <View style={styles.packagesHeader}>
              <Text style={styles.fieldLabel}>Chọn kiện ({selectedPackages.length})</Text>
              <Pressable
                onPress={() => setSelectedPackages(availablePackages)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Chọn tất cả các kiện"
              >
                <Text style={styles.selectAll}>Chọn tất cả</Text>
              </Pressable>
            </View>
            <View style={styles.packageList}>
              {(editingShipOrderId
                ? Array.from(new Set([...selectedPackages, ...availablePackages]))
                : availablePackages
              ).map((code) => {
                const selected = selectedPackages.includes(code);
                return (
                  <Pressable
                    key={code}
                    style={[styles.packageRow, selected && styles.packageRowActive]}
                    onPress={() => togglePackage(code)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                  >
                    <View style={[styles.checkBox, selected && styles.checkBoxActive]}>
                      {selected ? <Feather name="check" size={12} color={colors.black} /> : null}
                    </View>
                    <Text style={styles.packageText} numberOfLines={1}>{code}</Text>
                  </Pressable>
                );
              })}
              {availablePackages.length === 0 && !editingShipOrderId ? (
                <Text style={styles.mutedText}>Không còn kiện trống.</Text>
              ) : null}
            </View>

            <AppInput
              label="Ghi chú"
              placeholder="Ghi chú cho đơn giao (tùy chọn)"
              value={note}
              onChangeText={setNote}
              multiline
              style={styles.textArea}
            />

            <AppButton
              title={editingShipOrderId ? 'Cập nhật đơn giao' : 'Tạo đơn giao'}
              icon={<Feather name={editingShipOrderId ? 'edit-2' : 'plus'} size={16} color={colors.black} />}
              isLoading={isSubmitting}
              disabled={selectedPackages.length === 0}
              onPress={() => void handleCreate()}
              style={styles.submitButton}
            />
          </AppCard>
        )}

        {/* Danh sách đơn giao đã tạo */}
        {existingOrders.length ? (
          <View style={styles.existingSection}>
            <Text style={styles.sectionLabel}>Đơn giao đã tạo ({existingOrders.length})</Text>
            {existingOrders.map((item) => (
              <ShipOrderRow
                key={item.shipOrderId}
                item={item}
                loadingEdit={loadingEditId === item.shipOrderId}
                onBook={() => void openQuotes(item.shipOrderId)}
                onSync={() => void syncOrder(item.shipOrderId)}
                onCancelAllingo={() => cancelAllingoOrder(item)}
                onEdit={() => void handleStartEdit(item)}
                onDelete={() => handleDeleteOrder(item)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom-sheet báo giá Allingo */}
      <ModalShell
        visible={Boolean(quoteShipOrderId)}
        title="Chọn dịch vụ Allingo"
        onClose={() => setQuoteShipOrderId(null)}
      >
        {loadingQuotes ? (
          <ActivityIndicator color={colors.primary} style={{ padding: spacing.xl }} />
        ) : quotesError ? (
          <ErrorState
            title="Không tải được báo giá"
            description={quotesError}
            onRetry={() => quoteShipOrderId && void openQuotes(quoteShipOrderId)}
            isRetrying={loadingQuotes}
          />
        ) : quotes.length === 0 ? (
          <EmptyState icon="truck" title="Chưa có báo giá" />
        ) : (
          quotes.map((quote) => (
            <Pressable
              key={quote.serviceId}
              style={styles.quoteCard}
              onPress={() => void bookQuote(quote.serviceId)}
              disabled={bookMutation.isPending}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.quoteName}>{quote.serviceName}</Text>
                <Text style={styles.quotePartner}>
                  {quote.partnerName}
                  {quote.estimatedMinutes ? ` · ~${quote.estimatedMinutes} phút` : ''}
                </Text>
              </View>
              <Text style={styles.quotePrice}>{formatCurrency(quote.price)}</Text>
            </Pressable>
          ))
        )}
      </ModalShell>
    </View>
  );
}

function localDateOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function ShipOrderRow({
  item,
  loadingEdit,
  onBook,
  onSync,
  onCancelAllingo,
  onEdit,
  onDelete,
}: {
  item: ShipOrderSummaryItem;
  loadingEdit: boolean;
  onBook: () => void;
  onSync: () => void;
  onCancelAllingo: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isAllingo = item.carrierCode === 'ALLINGO';
  const booked = Boolean(item.allingoStatus);
  const isPending = item.status === 'PENDING';
  const carrierLabel = CARRIER_LABEL[item.carrierCode ?? ''] || item.carrierName || 'Hãng khác';

  return (
    <AppCard style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderCode}>{item.shipCode}</Text>
          <Text style={styles.orderMeta}>
            {carrierLabel} · {item.shippingList.length} kiện
            {item.bookingTime ? ` · ${formatDate(item.bookingTime)}` : ''}
          </Text>
        </View>
        <StatusBadge status={item.status} label={SHIP_ORDER_STATUS_LABEL[item.status] ?? item.status} />
      </View>

      {isAllingo && booked ? (
        <AllingoTrackingStrip status={item.allingoStatus} />
      ) : null}

      <View style={styles.orderActions}>
        {isAllingo && !booked && isPending ? (
          <AppButton title="Đặt ship" size="sm" onPress={onBook} icon={<Feather name="zap" size={13} color={colors.black} />} />
        ) : null}
        {isAllingo && booked ? (
          <>
            <AppButton title="Đồng bộ" size="sm" variant="outline" onPress={onSync} />
            {!isAllingoCancellationLocked(item.allingoStatus) && isPending ? (
              <AppButton title="Hủy Allingo" size="sm" variant="danger" onPress={onCancelAllingo} />
            ) : null}
          </>
        ) : null}
        {isPending && !booked ? (
          <>
            <AppButton title="Sửa" size="sm" variant="outline" isLoading={loadingEdit} onPress={onEdit} />
            <AppButton title="Xóa" size="sm" variant="danger" onPress={onDelete} />
          </>
        ) : null}
      </View>
    </AppCard>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'warning' | 'success' }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[
          styles.statValue,
          tone === 'warning' && { color: colors.warning },
          tone === 'success' && { color: colors.successText },
        ]}
      >
        {value}
      </Text>
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
    paddingBottom: spacing['4xl'],
    gap: spacing.md,
  },
  summaryCard: {
    gap: spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryCode: {
    fontSize: typography.fontSize.lg,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  summarySub: {
    marginTop: 2,
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    color: colors.textPrimary,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
  },
  formCard: {
    // Field đã tự có marginBottom 12; giảm gap để không cộng dồn thành khoảng cách quá lỏng.
    gap: spacing.sm,
  },
  submitButton: {
    // Tách nút submit khỏi field note phía trên cho thoáng.
    marginTop: spacing.md,
  },
  formCardEditing: {
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primaryLight,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cancelEdit: {
    fontSize: typography.fontSize.sm,
    color: colors.primaryDark,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dateCol: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    textTransform: 'uppercase',
  },
  packagesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectAll: {
    fontSize: typography.fontSize.xs,
    color: colors.primaryDark,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    textTransform: 'uppercase',
  },
  packageList: {
    gap: spacing.xs,
  },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  packageRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  packageText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
  },
  mutedText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
    fontSize: typography.fontSize.sm,
  },
  allDoneCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  allDoneText: {
    color: colors.successText,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    fontSize: typography.fontSize.sm,
  },
  existingSection: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  orderCard: {
    gap: spacing.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orderCode: {
    fontSize: typography.fontSize.base,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  orderMeta: {
    marginTop: 2,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
  },
  orderActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  quoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  quoteName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  quotePartner: {
    marginTop: 2,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  quotePrice: {
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.primaryDark,
  },
});
