import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProvinceWardPicker } from '@/src/components/address/ProvinceWardPicker';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppInput } from '@/src/components/ui/AppInput';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { ModalShell } from '@/src/components/ui/ModalShell';
import { SelectSheet } from '@/src/components/ui/SelectSheet';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import {
  useAvailableShipments,
  useCarriers,
  useCreateDraftDomestic,
} from '@/src/features/customer-portal/shared/hooks/use-customer-warehouse';
import type {
  DraftDomesticAvailableItem,
  WarehouseDomesticCarrier,
} from '@/src/features/customer-portal/shared/types/warehouse-domestic.types';
import { useCustomerProfile } from '@/src/features/customer-portal/shared/hooks/use-customer-profile';
import { addCustomerAddress } from '@/src/features/customer-portal/shared/services/customer-portal.service';
import { useScreenContentTopPadding } from '@/src/shared/lib/layout/safe-area';
import { colors, borderRadius, fontFamilyForWeight, spacing, typography } from '@/src/theme/tokens';

const PAGE_SIZE = 20;
const FALLBACK_CARRIERS = [
  { label: 'J&T', value: 'JT' },
  { label: 'VNPost', value: 'VNPOST' },
  { label: 'Khác', value: 'OTHER' },
];

const formatAddress = (
  street?: string | null,
  ward?: string | null,
  province?: string | null,
) => [street, ward, province].map((part) => (part ?? '').trim()).filter(Boolean).join(', ');

const NEW_ADDRESS_VALUE = '__new_address__';

// Thẻ có nhiều hơn ngưỡng này thì rút gọn danh sách kiện, có nút "Mở rộng".
const PACKAGE_COLLAPSE_THRESHOLD = 5;

export default function WarehouseConfirmScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const contentPaddingTop = useScreenContentTopPadding(spacing.md, { hasHeader: true });
  const [page, setPage] = useState(1);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [shipmentCode, setShipmentCode] = useState('');
  const [draftShipmentCode, setDraftShipmentCode] = useState('');
  const [status, setStatus] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [carrier, setCarrier] = useState<WarehouseDomesticCarrier>('ALL');
  const [draftCarrier, setDraftCarrier] = useState<WarehouseDomesticCarrier>('ALL');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [addressMode, setAddressMode] = useState<'existing' | 'new'>('new');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [province, setProvince] = useState('');
  const [ward, setWard] = useState('');
  const [street, setStreet] = useState('');
  const [saveToBook, setSaveToBook] = useState(true);
  const [note, setNote] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('JT');

  const query = useMemo(
    () => ({
      page,
      size: PAGE_SIZE,
      shipmentCode,
      status,
      carrier,
      startDate: '',
      endDate: '',
    }),
    [carrier, page, shipmentCode, status],
  );
  const availableQuery = useAvailableShipments(query);
  const carriersQuery = useCarriers();
  const createMutation = useCreateDraftDomestic();
  const { data: profile, refetch: refetchProfile } = useCustomerProfile();
  const savedAddresses = profile?.addresses ?? [];
  const addressOptions = [
    ...savedAddresses.map((addr) => ({
      value: addr.addressId,
      label:
        formatAddress(addr.streetAddress, addr.ward, addr.province) ||
        addr.addressName ||
        'Địa chỉ đã lưu',
      description: addr.addressName || undefined,
    })),
    { value: NEW_ADDRESS_VALUE, label: '+ Thêm địa chỉ mới' },
  ];
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
  const items = availableQuery.data?.content ?? [];
  const total = availableQuery.data?.totalElements ?? items.length;
  const selectedSet = useMemo(() => new Set(selectedCodes), [selectedCodes]);
  const canCreate = selectedCodes.length > 0;
  const selectedBottomPadding = spacing['4xl'] + Math.max(insets.bottom, spacing.md) + 88;

  const resetCreateForm = () => {
    const addresses = profile?.addresses ?? [];
    setPhoneNumber(profile?.phone ?? '');
    if (addresses.length > 0) {
      setAddressMode('existing');
      setSelectedAddressId(addresses[0].addressId);
    } else {
      setAddressMode('new');
      setSelectedAddressId('');
    }
    setProvince('');
    setWard('');
    setStreet('');
    setSaveToBook(true);
    setNote('');
    setSelectedCarrier(carrierOptions[0]?.value || 'JT');
  };

  const applyFilters = () => {
    setShipmentCode(draftShipmentCode.trim());
    setStatus(draftStatus.trim());
    setCarrier(draftCarrier);
    setPage(1);
    setSelectedCodes([]);
    setFilterOpen(false);
  };

  const toggleCodes = (codes: string[]) => {
    setSelectedCodes((previous) => {
      const next = new Set(previous);
      const allSelected = codes.every((code) => next.has(code));
      codes.forEach((code) => {
        if (allSelected) next.delete(code);
        else next.add(code);
      });
      return Array.from(next);
    });
  };

  const toggleCode = (code: string) => {
    setSelectedCodes((previous) => {
      const next = new Set(previous);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return Array.from(next);
    });
  };

  const openCreateSheet = () => {
    resetCreateForm();
    setCreateOpen(true);
  };

  const createDraft = async () => {
    let address = '';
    let newAddressPayload: { province: string; ward: string; street: string } | null = null;

    if (!profile?.customerCode) {
      Toast.show({ type: 'error', text1: 'Đang tải hồ sơ, vui lòng thử lại' });
      return;
    }

    if (addressMode === 'existing') {
      const picked = savedAddresses.find((item) => item.addressId === selectedAddressId);
      address = formatAddress(picked?.streetAddress, picked?.ward, picked?.province);
    } else {
      if (!province || !ward || !street.trim()) {
        Toast.show({ type: 'error', text1: 'Vui lòng nhập đầy đủ tỉnh/thành, phường/xã và số nhà' });
        return;
      }
      address = formatAddress(street, ward, province);
      newAddressPayload = { province, ward, street: street.trim() };
    }

    if (!phoneNumber.trim()) {
      Toast.show({ type: 'error', text1: 'Vui lòng nhập số điện thoại nhận hàng' });
      return;
    }
    if (!address) {
      Toast.show({ type: 'error', text1: 'Vui lòng chọn hoặc nhập địa chỉ giao' });
      return;
    }
    if (selectedCodes.length === 0) {
      Toast.show({ type: 'error', text1: 'Chưa chọn kiện hàng' });
      return;
    }

    try {
      await createMutation.mutateAsync({
        customerCode: profile.customerCode,
        phoneNumber: phoneNumber.trim(),
        address,
        note: note.trim() || undefined,
        carrierCode: selectedCarrier,
        shippingList: selectedCodes,
      });

      // Lưu địa chỉ mới vào sổ (chạy nền, không chặn luồng tạo phiếu nếu lỗi).
      if (addressMode === 'new' && saveToBook && newAddressPayload) {
        void addCustomerAddress(newAddressPayload)
          .then(() => refetchProfile())
          .catch(() => {
            Toast.show({
              type: 'info',
              text1: 'Đã tạo phiếu, nhưng chưa lưu được địa chỉ vào sổ',
            });
          });
      }

      Toast.show({ type: 'success', text1: 'Đã tạo phiếu giao' });
      setCreateOpen(false);
      setSelectedCodes([]);
      resetCreateForm();
      router.push('/warehouse/addresses' as any);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: error?.response?.data?.message || error?.message || 'Tạo phiếu giao thất bại',
      });
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Xác nhận nhận hàng</Text>
      <Text style={styles.subtitle}>Chọn kiện đã về kho Việt Nam để tạo phiếu giao nội địa.</Text>
      <View style={styles.toolbar}>
        <Pressable style={styles.searchBox} onPress={() => setFilterOpen(true)}>
          <Feather name="search" size={16} color={colors.textMuted} />
          <Text style={styles.searchText} numberOfLines={1}>
            {shipmentCode || status || carrier !== 'ALL' ? 'Đang áp dụng bộ lọc' : 'Tìm mã kiện, lọc đơn vị'}
          </Text>
        </Pressable>
        <Pressable style={styles.iconButton} onPress={() => setFilterOpen(true)}>
          <Feather name="sliders" size={18} color={colors.primaryDark} />
        </Pressable>
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (availableQuery.isLoading) {
      return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing['3xl'] }} />;
    }

    if (availableQuery.isError) {
      return (
        <ErrorState
          title="Không tải được kiện hàng"
          description={availableQuery.error instanceof Error ? availableQuery.error.message : undefined}
          onRetry={() => void availableQuery.refetch()}
          isRetrying={availableQuery.isFetching}
        />
      );
    }

    return (
      <EmptyState
        icon="package"
        title="Chưa có kiện sẵn sàng"
        description="Các kiện đã về kho Việt Nam và chưa gán phiếu giao sẽ xuất hiện tại đây."
      />
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item, index) => `${item.customerCode}-${item.shipmentCodes.join('-')}-${index}`}
        renderItem={({ item }) => (
          <AvailableShipmentCard
            item={item}
            selectedSet={selectedSet}
            onToggleGroup={() => toggleCodes(item.shipmentCodes)}
            onToggleCode={toggleCode}
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
              isLoading={availableQuery.isFetching}
            />
          ) : null
        }
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: contentPaddingTop,
            paddingBottom: canCreate ? selectedBottomPadding : spacing['3xl'],
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={availableQuery.isRefetching}
            onRefresh={() => void availableQuery.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />

      {canCreate ? (
        <View pointerEvents="box-none" style={styles.bottomActionWrap}>
          <View style={[styles.bottomActionSheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <View style={styles.bottomActionSummary}>
              <View style={styles.summaryIcon}>
                <Feather name="package" size={16} color={colors.black} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectionText}>{selectedCodes.length} kiện đã chọn</Text>
                <Text style={styles.selectionHint}>Tạo phiếu giao cho các kiện đang chọn.</Text>
              </View>
            </View>
            <AppButton
              title="Tạo phiếu giao"
              onPress={openCreateSheet}
              icon={<Feather name="truck" size={16} color={colors.black} />}
              style={styles.bottomActionButton}
            />
          </View>
        </View>
      ) : null}

      <ModalShell visible={filterOpen} title="Bộ lọc kiện hàng" onClose={() => setFilterOpen(false)}>
        <AppInput
          label="Mã kiện"
          placeholder="Nhập mã kiện"
          value={draftShipmentCode}
          onChangeText={setDraftShipmentCode}
        />
        <AppInput
          label="Trạng thái"
          placeholder="VD: DA_NHAP_KHO_VN"
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

      <ModalShell visible={createOpen} title="Tạo phiếu giao" onClose={() => setCreateOpen(false)}>
        <View style={styles.summaryPill}>
          <Feather name="package" size={14} color={colors.primaryDark} />
          <Text style={styles.summaryPillText}>Đã chọn {selectedCodes.length} kiện</Text>
        </View>

        <Text style={styles.sectionLabel}>Người nhận</Text>
        <AppInput
          label="Số điện thoại"
          placeholder="Nhập SĐT nhận hàng"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />
        {profile?.phone ? (
          <Text style={styles.fieldHint}>Lấy từ hồ sơ của bạn — có thể chỉnh sửa.</Text>
        ) : null}

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Địa chỉ giao</Text>
        {savedAddresses.length > 0 ? (
          <SelectSheet
            label=""
            placeholder="Chọn địa chỉ giao"
            value={addressMode === 'new' ? NEW_ADDRESS_VALUE : selectedAddressId}
            options={addressOptions}
            onChange={(value) => {
              if (value === NEW_ADDRESS_VALUE) {
                setAddressMode('new');
              } else {
                setAddressMode('existing');
                setSelectedAddressId(value);
              }
            }}
          />
        ) : null}
        {addressMode === 'new' ? (
          <View style={styles.newAddressBox}>
            <ProvinceWardPicker
              provinceName={province}
              wardName={ward}
              onChangeProvince={(value) => {
                setProvince(value);
                setWard('');
              }}
              onChangeWard={setWard}
            />
            <AppInput
              label="Số nhà, tên đường"
              placeholder="Nhập địa chỉ chi tiết"
              value={street}
              onChangeText={setStreet}
            />
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Lưu vào sổ địa chỉ</Text>
              <Switch
                value={saveToBook}
                onValueChange={setSaveToBook}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor={colors.surface}
              />
            </View>
          </View>
        ) : null}

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Vận chuyển</Text>
        <SelectSheet
          label="Đơn vị vận chuyển"
          value={selectedCarrier}
          options={carrierOptions}
          onChange={setSelectedCarrier}
          statusText={carriersQuery.isLoading ? 'Đang tải đơn vị vận chuyển...' : undefined}
        />
        <AppInput
          label="Ghi chú (tùy chọn)"
          placeholder="Ghi chú cho shipper"
          value={note}
          onChangeText={setNote}
          multiline
          style={styles.textArea}
        />

        <View style={styles.modalActions}>
          <AppButton title="Đóng" variant="outline" onPress={() => setCreateOpen(false)} />
          <AppButton
            title="Tạo phiếu"
            onPress={() => void createDraft()}
            isLoading={createMutation.isPending}
          />
        </View>
      </ModalShell>
    </View>
  );
}

function AvailableShipmentCard({
  item,
  selectedSet,
  onToggleGroup,
  onToggleCode,
}: {
  item: DraftDomesticAvailableItem;
  selectedSet: Set<string>;
  onToggleGroup: () => void;
  onToggleCode: (code: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const codes = item.shipmentCodes;
  const selectedCount = codes.filter((code) => selectedSet.has(code)).length;
  const allSelected = codes.length > 0 && selectedCount === codes.length;
  const someSelected = selectedCount > 0 && !allSelected;
  const statusByCode = new Map(item.shipments.map((shipment) => [shipment.shipmentCode, shipment.status]));
  const isCollapsible = codes.length > PACKAGE_COLLAPSE_THRESHOLD;
  const visibleCodes = !isCollapsible || expanded ? codes : codes.slice(0, PACKAGE_COLLAPSE_THRESHOLD);

  return (
    <View style={[styles.card, (allSelected || someSelected) && styles.cardSelected]}>
      <View style={styles.cardHeader}>
        <Pressable
          onPress={onToggleGroup}
          accessibilityRole="checkbox"
          accessibilityLabel="Chọn tất cả kiện"
          accessibilityState={{ checked: allSelected }}
          hitSlop={8}
        >
          <View style={[styles.checkBox, (allSelected || someSelected) && styles.checkBoxActive]}>
            {allSelected ? (
              <Feather name="check" size={16} color={colors.black} />
            ) : someSelected ? (
              <Feather name="minus" size={16} color={colors.black} />
            ) : null}
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.customerName || item.customerCode || 'Khách hàng'}</Text>
          <Text style={styles.cardMeta}>
            {selectedCount}/{codes.length} kiện đã chọn
          </Text>
        </View>
      </View>
      <InfoRow label="Tuyến" value={item.operationalRouteName || item.routeName || '---'} />
      <InfoRow label="SĐT" value={item.phoneNumber || '---'} />
      <InfoRow label="Địa chỉ gợi ý" value={item.address || '---'} />
      <Text style={styles.packageSectionLabel}>Chọn kiện để xác nhận</Text>
      <View style={styles.packageList}>
        {codes.length === 0 ? (
          <Text style={styles.cardMeta}>Chưa có mã kiện</Text>
        ) : (
          visibleCodes.map((code) => {
            const selected = selectedSet.has(code);
            const codeStatus = statusByCode.get(code);
            return (
              <Pressable
                key={code}
                onPress={() => onToggleCode(code)}
                style={[styles.packageRow, selected && styles.packageRowActive]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
              >
                <View style={[styles.packageCheck, selected && styles.packageCheckActive]}>
                  {selected ? <Feather name="check" size={12} color={colors.black} /> : null}
                </View>
                <Text style={styles.packageRowText} numberOfLines={1}>
                  {code}
                </Text>
                {codeStatus ? <StatusBadge status={codeStatus} /> : null}
              </Pressable>
            );
          })
        )}
      </View>
      {isCollapsible ? (
        <Pressable
          style={styles.expandRow}
          onPress={() => setExpanded((value) => !value)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
        >
          <Text style={styles.expandText}>
            {expanded ? 'Thu gọn' : `Mở rộng (+${codes.length - PACKAGE_COLLAPSE_THRESHOLD} kiện)`}
          </Text>
          <Feather
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.primaryDark}
          />
        </Pressable>
      ) : null}
    </View>
  );
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
  bottomActionWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
  },
  bottomActionSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
    gap: spacing.md,
  },
  bottomActionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionText: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
  },
  selectionHint: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
  },
  bottomActionButton: {
    width: '100%',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  checkBox: {
    width: 28,
    height: 28,
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
  packageSectionLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
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
    paddingVertical: spacing.xs,
  },
  packageRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  packageCheck: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageCheckActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  packageRowText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 40,
    marginTop: spacing.xs,
  },
  expandText: {
    fontSize: typography.fontSize.xs,
    color: colors.primaryDark,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    textTransform: 'uppercase',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  summaryPillText: {
    fontSize: typography.fontSize.xs,
    color: colors.primaryDark,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
  },
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  sectionLabelSpaced: {
    marginTop: spacing.lg,
  },
  fieldHint: {
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
  },
  newAddressBox: {
    gap: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginTop: spacing.xs,
  },
  toggleLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  textArea: {
    height: 88,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
});
