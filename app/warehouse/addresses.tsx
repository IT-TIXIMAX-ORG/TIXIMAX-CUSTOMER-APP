import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { ModalShell } from '@/src/components/ui/ModalShell';
import { SelectSheet } from '@/src/components/ui/SelectSheet';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import {
  useAddShipments,
  useAvailableShipments,
  useCarriers,
  useDeleteDraft,
  useDraftDomestics,
  useRemoveShipments,
  useUpdateDraftInfo,
} from '@/src/features/customer-portal/shared/hooks/use-customer-warehouse';
import type {
  DraftDomesticAddressItem,
  DraftDomesticAvailableItem,
  DraftShippingListItem,
  WarehouseDomesticCarrier,
} from '@/src/features/customer-portal/shared/types/warehouse-domestic.types';
import { normalizeLabelKey } from '@/src/shared/lib/labels';
import { useScreenContentTopPadding } from '@/src/shared/lib/layout/safe-area';
import { formatWeight } from '@/src/shared/lib/utils';
import { borderRadius, colors, fontFamilyForWeight, spacing, typography } from '@/src/theme/tokens';

const PAGE_SIZE = 20;
const AVAILABLE_SHIPMENT_PAGE_SIZE = 100;
const FALLBACK_CARRIERS = [
  { label: 'J&T', value: 'JT' },
  { label: 'VNPost', value: 'VNPOST' },
  { label: 'Khác', value: 'OTHER' },
];

type ShipmentMode = 'add' | 'remove';

export default function WarehouseAddressesScreen() {
  const contentPaddingTop = useScreenContentTopPadding(spacing.md, { hasHeader: true });
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [shipmentCode, setShipmentCode] = useState('');
  const [draftShipmentCode, setDraftShipmentCode] = useState('');
  const [status, setStatus] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [carrier, setCarrier] = useState<WarehouseDomesticCarrier>('ALL');
  const [draftCarrier, setDraftCarrier] = useState<WarehouseDomesticCarrier>('ALL');
  const [editingDraft, setEditingDraft] = useState<DraftDomesticAddressItem | null>(null);
  const [shipmentDraft, setShipmentDraft] = useState<DraftDomesticAddressItem | null>(null);
  const [shipmentMode, setShipmentMode] = useState<ShipmentMode>('add');
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('JT');
  const [availableShipmentPage, setAvailableShipmentPage] = useState(1);
  const [availableShipmentItems, setAvailableShipmentItems] = useState<DraftDomesticAvailableItem[]>([]);

  const query = useMemo(
    () => ({ page, size: PAGE_SIZE, shipmentCode, status, carrier }),
    [carrier, page, shipmentCode, status],
  );
  const draftsQuery = useDraftDomestics(query);
  const carriersQuery = useCarriers();
  const availableQuery = useAvailableShipments({
    page: availableShipmentPage,
    size: AVAILABLE_SHIPMENT_PAGE_SIZE,
    shipmentCode: '',
    status: '',
    carrier: 'ALL',
    startDate: '',
    endDate: '',
  });
  const updateInfoMutation = useUpdateDraftInfo();
  const deleteMutation = useDeleteDraft();
  const addMutation = useAddShipments();
  const removeMutation = useRemoveShipments();
  const items = draftsQuery.data?.content ?? [];
  const total = draftsQuery.data?.totalElements ?? items.length;
  const carrierOptions = useMemo(() => {
    const options = (carriersQuery.data?.length ? carriersQuery.data : FALLBACK_CARRIERS)
      .filter((item) => item.value !== 'ALL')
      .map((item) => ({ label: item.label, value: item.value }));
    return options.length ? options : FALLBACK_CARRIERS;
  }, [carriersQuery.data]);
  const filterCarrierOptions = useMemo(
    () => [{ label: 'Tất cả đơn vị', value: 'ALL' }, ...carrierOptions],
    [carrierOptions],
  );
  const availableCodes = useMemo(() => {
    const codes = new Set<string>();
    availableShipmentItems.forEach((item) => {
      item.shipmentCodes.forEach((code) => codes.add(code));
    });
    return Array.from(codes);
  }, [availableShipmentItems]);
  const availableTotal = availableQuery.data?.totalElements ?? availableShipmentItems.length;
  const canLoadMoreAvailable = shipmentMode === 'add' && availableShipmentItems.length < availableTotal;

  useEffect(() => {
    if (!availableQuery.data) return;

    setAvailableShipmentItems((previous) => {
      const merged = new Map<string, DraftDomesticAvailableItem>();
      [...previous, ...availableQuery.data.content].forEach((item) => {
        const key = item.shipmentCodes.join('|') || `${item.customerCode}-${item.routeName}`;
        merged.set(key, item);
      });
      return Array.from(merged.values());
    });
  }, [availableQuery.data]);

  const applyFilters = () => {
    setShipmentCode(draftShipmentCode.trim());
    setStatus(draftStatus.trim());
    setCarrier(draftCarrier);
    setPage(1);
    setFilterOpen(false);
  };

  const openEdit = (draft: DraftDomesticAddressItem) => {
    setEditingDraft(draft);
    setPhoneNumber(draft.phoneNumber || '');
    setAddress(draft.address || '');
    setNote(draft.note || '');
    setSelectedCarrier(draft.carrier && draft.carrier !== 'ALL' ? draft.carrier : carrierOptions[0]?.value || 'JT');
  };

  const submitEdit = async () => {
    if (!editingDraft) return;
    if (!phoneNumber.trim() || !address.trim()) {
      Toast.show({ type: 'error', text1: 'Thiếu địa chỉ hoặc số điện thoại' });
      return;
    }

    try {
      await updateInfoMutation.mutateAsync({
        draftId: editingDraft.id,
        payload: {
          phoneNumber: phoneNumber.trim(),
          address: address.trim(),
          note: note.trim() || undefined,
          carrierCode: selectedCarrier,
        },
      });
      Toast.show({ type: 'success', text1: 'Đã cập nhật phiếu giao' });
      setEditingDraft(null);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: error?.response?.data?.message || error?.message || 'Cập nhật thất bại',
      });
    }
  };

  const openShipmentModal = (draft: DraftDomesticAddressItem, mode: ShipmentMode) => {
    setShipmentDraft(draft);
    setShipmentMode(mode);
    setSelectedCodes([]);
    if (mode === 'add') {
      setAvailableShipmentPage(1);
      setAvailableShipmentItems(availableShipmentPage === 1 ? availableQuery.data?.content ?? [] : []);
    }
  };

  const submitShipmentMutation = async () => {
    if (!shipmentDraft || selectedCodes.length === 0) return;

    try {
      const payload = { shippingCodes: selectedCodes };
      if (shipmentMode === 'add') {
        await addMutation.mutateAsync({ draftId: shipmentDraft.id, payload });
        Toast.show({ type: 'success', text1: 'Đã thêm kiện vào phiếu' });
      } else {
        await removeMutation.mutateAsync({ draftId: shipmentDraft.id, payload });
        Toast.show({ type: 'success', text1: 'Đã bớt kiện khỏi phiếu' });
      }
      setShipmentDraft(null);
      setSelectedCodes([]);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: error?.response?.data?.message || error?.message || 'Cập nhật kiện thất bại',
      });
    }
  };

  const deleteDraft = (draft: DraftDomesticAddressItem) => {
    Alert.alert('Xóa phiếu giao', `Bạn có chắc muốn xóa phiếu ${draft.shipCode || draft.id}?`, [
      { text: 'Đóng', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync(draft.id);
            Toast.show({ type: 'success', text1: 'Đã xóa phiếu giao' });
          } catch (error: any) {
            Toast.show({
              type: 'error',
              text1: error?.response?.data?.message || error?.message || 'Xóa phiếu thất bại',
            });
          }
        },
      },
    ]);
  };

  const toggleCode = (code: string) => {
    setSelectedCodes((previous) =>
      previous.includes(code) ? previous.filter((item) => item !== code) : [...previous, code],
    );
  };

  const shipmentOptions =
    shipmentMode === 'add'
      ? availableCodes
      : (shipmentDraft?.shippingList ?? []).map(getTrackingCode).filter(Boolean);

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Địa chỉ giao</Text>
      <Text style={styles.subtitle}>Quản lý phiếu giao nội địa đã tạo từ kiện về kho VN.</Text>
      <View style={styles.toolbar}>
        <Pressable style={styles.searchBox} onPress={() => setFilterOpen(true)}>
          <Feather name="search" size={16} color={colors.textMuted} />
          <Text style={styles.searchText} numberOfLines={1}>
            {shipmentCode || status || carrier !== 'ALL' ? 'Đang áp dụng bộ lọc' : 'Tìm mã ship, lọc trạng thái'}
          </Text>
        </Pressable>
        <Pressable style={styles.iconButton} onPress={() => setFilterOpen(true)}>
          <Feather name="sliders" size={18} color={colors.primaryDark} />
        </Pressable>
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (draftsQuery.isLoading) {
      return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing['3xl'] }} />;
    }

    if (draftsQuery.isError) {
      return (
        <ErrorState
          title="Không tải được phiếu giao"
          description={draftsQuery.error instanceof Error ? draftsQuery.error.message : undefined}
          onRetry={() => void draftsQuery.refetch()}
          isRetrying={draftsQuery.isFetching}
        />
      );
    }

    return (
      <EmptyState
        icon="map-pin"
        title="Chưa có phiếu giao"
        description="Các phiếu giao nội địa sau khi xác nhận địa chỉ sẽ xuất hiện tại đây."
      />
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <DraftDomesticCard
            item={item}
            onEdit={openEdit}
            onAdd={(draft) => openShipmentModal(draft, 'add')}
            onRemove={(draft) => openShipmentModal(draft, 'remove')}
            onDelete={deleteDraft}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          total > items.length ? (
            <AppButton
              title="Tải thêm"
              variant="outline"
              onPress={() => setPage((current) => current + 1)}
              isLoading={draftsQuery.isFetching}
            />
          ) : null
        }
        contentContainerStyle={[styles.content, { paddingTop: contentPaddingTop }]}
        refreshControl={
          <RefreshControl
            refreshing={draftsQuery.isRefetching}
            onRefresh={() => void draftsQuery.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />

      <ModalShell visible={filterOpen} title="Bộ lọc phiếu giao" onClose={() => setFilterOpen(false)}>
        <AppInput
          label="Mã ship / mã kiện"
          placeholder="Nhập mã cần tìm"
          value={draftShipmentCode}
          onChangeText={setDraftShipmentCode}
        />
        <AppInput
          label="Trạng thái"
          placeholder="DRAFT, LOCKED, EXPORTED..."
          value={draftStatus}
          onChangeText={setDraftStatus}
          autoCapitalize="characters"
        />
        <SelectSheet
          label="Đơn vị vận chuyển"
          value={draftCarrier}
          options={filterCarrierOptions}
          onChange={(value) => setDraftCarrier(value as WarehouseDomesticCarrier)}
        />
        <View style={styles.modalActions}>
          <AppButton
            title="Xóa lọc"
            variant="outline"
            onPress={() => {
              setDraftShipmentCode('');
              setDraftStatus('');
              setDraftCarrier('ALL');
              setShipmentCode('');
              setStatus('');
              setCarrier('ALL');
              setFilterOpen(false);
            }}
          />
          <AppButton title="Áp dụng" onPress={applyFilters} />
        </View>
      </ModalShell>

      <ModalShell visible={Boolean(editingDraft)} title="Sửa phiếu giao" onClose={() => setEditingDraft(null)}>
        <AppInput
          label="Số điện thoại"
          placeholder="Nhập SĐT"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />
        <AppInput
          label="Địa chỉ giao"
          placeholder="Nhập địa chỉ giao"
          value={address}
          onChangeText={setAddress}
          multiline
          style={styles.addressArea}
        />
        <SelectSheet
          label="Đơn vị vận chuyển"
          value={selectedCarrier}
          options={carrierOptions}
          onChange={setSelectedCarrier}
        />
        <AppInput
          label="Ghi chú"
          placeholder="Ghi chú"
          value={note}
          onChangeText={setNote}
          multiline
          style={styles.noteArea}
        />
        <View style={styles.modalActions}>
          <AppButton title="Đóng" variant="outline" onPress={() => setEditingDraft(null)} />
          <AppButton
            title="Cập nhật"
            onPress={() => void submitEdit()}
            isLoading={updateInfoMutation.isPending}
          />
        </View>
      </ModalShell>

      <ModalShell
        visible={Boolean(shipmentDraft)}
        title={shipmentMode === 'add' ? 'Thêm kiện vào phiếu' : 'Bớt kiện khỏi phiếu'}
        onClose={() => setShipmentDraft(null)}
      >
        {availableQuery.isLoading && shipmentMode === 'add' && availableShipmentItems.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={{ padding: spacing.xl }} />
        ) : shipmentOptions.length === 0 ? (
          <EmptyState icon="package" title="Không có kiện phù hợp" />
        ) : (
          <View style={styles.codeList}>
            {shipmentOptions.map((code) => {
              const active = selectedCodes.includes(code);
              return (
                <Pressable
                  key={code}
                  style={[styles.codeOption, active && styles.codeOptionActive]}
                  onPress={() => toggleCode(code)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                >
                  <Text style={styles.codeOptionText}>{code}</Text>
                  {active ? <Feather name="check" size={16} color={colors.primaryDark} /> : null}
                </Pressable>
              );
            })}
            {canLoadMoreAvailable ? (
              <AppButton
                title="Tải thêm"
                variant="outline"
                onPress={() => setAvailableShipmentPage((current) => current + 1)}
                isLoading={availableQuery.isFetching}
              />
            ) : null}
          </View>
        )}
        <View style={styles.modalActions}>
          <AppButton title="Đóng" variant="outline" onPress={() => setShipmentDraft(null)} />
          <AppButton
            title={shipmentMode === 'add' ? 'Thêm kiện' : 'Bớt kiện'}
            disabled={selectedCodes.length === 0}
            onPress={() => void submitShipmentMutation()}
            isLoading={addMutation.isPending || removeMutation.isPending}
          />
        </View>
      </ModalShell>
    </View>
  );
}

function DraftDomesticCard({
  item,
  onEdit,
  onAdd,
  onRemove,
  onDelete,
}: {
  item: DraftDomesticAddressItem;
  onEdit: (item: DraftDomesticAddressItem) => void;
  onAdd: (item: DraftDomesticAddressItem) => void;
  onRemove: (item: DraftDomesticAddressItem) => void;
  onDelete: (item: DraftDomesticAddressItem) => void;
}) {
  const locked = normalizeLabelKey(item.status) === 'LOCKED';
  const packageCount = item.shippingList?.length ?? 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Feather name="truck" size={18} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.shipCode || `Phiếu #${item.id}`}</Text>
          <Text style={styles.cardMeta}>
            {item.carrier || '---'} · {packageCount} kiện · {formatWeight(item.weight)}
          </Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <InfoRow label="Địa chỉ" value={item.address || '---'} />
      <InfoRow label="SĐT" value={item.phoneNumber || '---'} />
      {item.note ? <InfoRow label="Ghi chú" value={item.note} /> : null}

      <View style={styles.packageWrap}>
        {(item.shippingList ?? []).map((shipment) => {
          const code = getTrackingCode(shipment);
          return (
            <View key={code} style={styles.packagePill}>
              <Text style={styles.packageText}>{code}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.actions}>
        <AppButton title="Sửa" size="sm" variant="outline" disabled={locked} onPress={() => onEdit(item)} />
        <AppButton title="Thêm kiện" size="sm" variant="outline" disabled={locked} onPress={() => onAdd(item)} />
        <AppButton title="Bớt kiện" size="sm" variant="outline" disabled={locked || packageCount === 0} onPress={() => onRemove(item)} />
        <AppButton title="Xóa" size="sm" variant="danger" disabled={locked} onPress={() => onDelete(item)} />
      </View>
    </View>
  );
}

function getTrackingCode(item: DraftShippingListItem | string) {
  return typeof item === 'string' ? item : item.trackingCode;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
  toolbar: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  searchBox: {
    flex: 1,
    minHeight: 44,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchText: {
    flex: 1,
    color: colors.textSecondary,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingVertical: 3,
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
  packageWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  packagePill: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  packageText: {
    fontSize: typography.fontSize.xs,
    color: colors.textPrimary,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  addressArea: {
    height: 96,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  noteArea: {
    height: 84,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  codeList: {
    gap: spacing.sm,
  },
  codeOption: {
    minHeight: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  codeOptionText: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
  },
});
