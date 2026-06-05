import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppButton } from '@/src/components/ui/AppButton';
import { SelectSheet } from '@/src/components/ui/SelectSheet';
import { ModalShell } from '@/src/components/ui/ModalShell';
import { useCustomerProfile } from '@/src/features/customer-portal/shared/hooks/use-customer-profile';
import { useCreateOrderMasterData } from '@/src/features/customer-portal/shared/hooks/use-create-order-master-data';
import { addCustomerAddress } from '@/src/features/customer-portal/shared/services/customer-portal.service';
import {
  createCustomerDepositOrder,
  createCustomerPurchaseOrder,
} from '@/src/features/customer-portal/shared/services/create-order.service';
import { uploadImageUri } from '@/src/shared/services/upload-image.service';
import { useTabScreenBottomPadding } from '@/src/shared/lib/layout/safe-area';
import { formatCurrency, parseNumberInput } from '@/src/shared/lib/utils';

type OrderTypeId = 'MUA_HO' | 'KY_GUI' | 'CHUYEN_TIEN' | 'DAU_GIA';

interface ProductLine {
  productName: string;
  productLink: string;
  website: string;
  productTypeId: string;
  quantity: string;
  priceWeb: string;
  shipWeb: string;
  shipmentCode: string;
  extraCharge: string;
  note: string;
  imageUri?: string;
  imageId?: string;
}

const emptyLine = (): ProductLine => ({
  productName: '',
  productLink: '',
  website: '',
  productTypeId: '',
  quantity: '1',
  priceWeb: '',
  shipWeb: '',
  shipmentCode: '',
  extraCharge: '',
  note: '',
});

const orderTypes: Array<{
  id: OrderTypeId;
  title: string;
  desc: string;
  icon: keyof typeof Feather.glyphMap;
  isConsultancy?: boolean;
  isComingSoon?: boolean;
}> = [
  {
    id: 'MUA_HO',
    title: 'Mua hộ',
    desc: 'Tạo đơn mua hàng từ website nước ngoài.',
    icon: 'shopping-bag',
  },
  {
    id: 'KY_GUI',
    title: 'Ký gửi',
    desc: 'Gửi hàng về Việt Nam qua kho nước ngoài.',
    icon: 'truck',
  },
  {
    id: 'CHUYEN_TIEN',
    title: 'Chuyển tiền',
    desc: 'SẮP RA MẮT',
    icon: 'repeat',
    isComingSoon: true,
  },
  {
    id: 'DAU_GIA',
    title: 'Đấu giá',
    desc: 'SẮP RA MẮT',
    icon: 'award',
    isConsultancy: true,
  },
];

export default function CreateOrderScreen() {
  const queryClient = useQueryClient();
  const contentPaddingBottom = useTabScreenBottomPadding();
  const { data: profile, refetch: refetchProfile } = useCustomerProfile();
  const [selectedType, setSelectedType] = useState<OrderTypeId | null>(null);
  const [routeId, setRouteId] = useState('');
  const [addressId, setAddressId] = useState('');
  const [serviceType, setServiceType] = useState('CLEAN');
  const [exchangeRate, setExchangeRate] = useState('');
  const [priceShip, setPriceShip] = useState('');
  const [checkRequired, setCheckRequired] = useState(false);
  const [lines, setLines] = useState<ProductLine[]>([emptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isAddressEditorOpen, setIsAddressEditorOpen] = useState(false);
  const [isAddressConfirmOpen, setIsAddressConfirmOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [newAddressProvince, setNewAddressProvince] = useState('');
  const [newAddressWard, setNewAddressWard] = useState('');
  const [newAddressStreet, setNewAddressStreet] = useState('');
  const isPurchaseOrder = selectedType === 'MUA_HO';
  const isConsignmentOrder = selectedType === 'KY_GUI';
  const showRouteSection = isPurchaseOrder || isConsignmentOrder;

  const { routes, productTypes, isInitialLoading } = useCreateOrderMasterData(
    routeId,
    serviceType,
    showRouteSection,
  );
  const selectedRoute = routes.find((route) => String(route.routeId) === routeId);

  useEffect(() => {
    if (!showRouteSection) return;
    if (routeId || routes.length === 0) return;

    const defaultRoute = routes[0];
    setRouteId(String(defaultRoute.routeId));
    setExchangeRate(String(defaultRoute.exchangeRate ?? ''));
    setPriceShip(String(defaultRoute.shippingFee ?? ''));
  }, [showRouteSection, routeId, routes]);

  const routeOptions = routes.map((route) => ({
    label: route.routeName || `Tuyến ${route.routeId}`,
    value: String(route.routeId),
    description: `${formatCurrency(route.shippingFee)} / kg`,
  }));
  const addressOptions = (profile?.addresses ?? []).map((address) => ({
    label: address.addressName || [address.streetAddress, address.ward, address.province].filter(Boolean).join(', '),
    value: String(address.addressId),
    description: [address.streetAddress, address.ward, address.province].filter(Boolean).join(', '),
  }));
  const productTypeOptions = productTypes.map((type) => ({
    label: type.productTypeName,
    value: String(type.productTypeId),
  }));
  const getProductTypeExtraCharge = (productTypeId: string) =>
    productTypes.find((type) => String(type.productTypeId) === productTypeId)?.extraCharge ?? 0;

  const selectedTitle = useMemo(
    () => orderTypes.find((type) => type.id === selectedType)?.title ?? '',
    [selectedType],
  );
  const newAddressText = [newAddressStreet.trim(), newAddressWard.trim(), newAddressProvince.trim()]
    .filter(Boolean)
    .join(', ');

  const resetAddressCreation = () => {
    setNewAddressProvince('');
    setNewAddressWard('');
    setNewAddressStreet('');
    setIsAddressEditorOpen(false);
    setIsAddressConfirmOpen(false);
  };

  const resetForm = () => {
    setRouteId('');
    setAddressId('');
    setServiceType('CLEAN');
    setExchangeRate('');
    setPriceShip('');
    setCheckRequired(false);
    setLines([emptyLine()]);
    resetAddressCreation();
  };

  const buildPurchaseLinks = () =>
    lines.map((line) => ({
      productLink: line.productLink.trim(),
      quantity: parseNumberInput(line.quantity),
      priceWeb: parseNumberInput(line.priceWeb),
      productName: line.productName.trim(),
      productTypeId: line.productTypeId,
      website: line.website.trim(),
    }));

  const buildConsignmentLinks = () =>
    lines.map((line) => ({
      quantity: parseNumberInput(line.quantity),
      productName: line.productName.trim(),
      productTypeId: line.productTypeId,
      extraCharge: getProductTypeExtraCharge(line.productTypeId),
      shipmentCode: line.shipmentCode.trim(),
      differentFee: 0,
      purchaseImageId: line.imageId,
      note: line.note.trim(),
    }));

  const handleSelectType = (type: (typeof orderTypes)[number]) => {
    if (type.isComingSoon) {
      Alert.alert(type.title, 'Sẽ sớm ra mắt');
      return;
    }
    if (type.isConsultancy) {
      Alert.alert(
        type.title,
        `${type.desc}\n\nNhân viên phụ trách: ${profile?.dedicatedStaff?.name || 'TixiMax'}\nSĐT: ${profile?.dedicatedStaff?.phone || 'Hotline'}`,
      );
      return;
    }
    resetForm();
    setSelectedType(type.id);
  };

  const openAddressEditor = () => {
    setIsAddressConfirmOpen(false);
    setIsAddressEditorOpen(true);
  };

  const reviewNewAddress = () => {
    if (!newAddressProvince.trim() || !newAddressWard.trim() || !newAddressStreet.trim()) {
      Toast.show({ type: 'error', text1: 'Vui lòng nhập đầy đủ địa chỉ mới' });
      return;
    }

    setIsAddressEditorOpen(false);
    setIsAddressConfirmOpen(true);
  };

  const confirmCreateAddress = async () => {
    const previousAddressIds = new Set((profile?.addresses ?? []).map((item) => String(item.addressId)));

    try {
      setIsSavingAddress(true);
      await addCustomerAddress({
        province: newAddressProvince.trim(),
        ward: newAddressWard.trim(),
        street: newAddressStreet.trim(),
      });

      const refreshed = await refetchProfile();
      const addresses = refreshed.data?.addresses ?? [];
      const createdAddress =
        addresses.find((item) => !previousAddressIds.has(String(item.addressId))) ??
        addresses.find(
          (item) =>
            (item.province ?? '').trim() === newAddressProvince.trim() &&
            (item.ward ?? '').trim() === newAddressWard.trim() &&
            (item.streetAddress ?? '').trim() === newAddressStreet.trim(),
        );

      if (createdAddress?.addressId) {
        setAddressId(String(createdAddress.addressId));
      }

      resetAddressCreation();
      Toast.show({ type: 'success', text1: 'Đã thêm địa chỉ mới' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error?.response?.data?.message || error?.message || 'Thêm địa chỉ thất bại' });
    } finally {
      setIsSavingAddress(false);
    }
  };

  const setLine = (index: number, updates: Partial<ProductLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...updates } : line)));
  };

  const pickImage = async (index?: number) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Toast.show({ type: 'error', text1: 'Cần quyền truy cập thư viện ảnh' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]?.uri) return;

    const uri = result.assets[0].uri;
    try {
      const uploaded = await uploadImageUri(uri, 'orders');
      if (typeof index === 'number') setLine(index, { imageUri: uri, imageId: uploaded.id });
      Toast.show({ type: 'success', text1: 'Đã tải ảnh lên' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error?.message || 'Tải ảnh thất bại' });
    }
  };

  const validateCommon = () => {
    if (!addressId) return 'Vui lòng chọn địa chỉ nhận hàng.';
    if (!routeId) return 'Vui lòng chọn tuyến vận chuyển.';
    if (!exchangeRate || parseNumberInput(exchangeRate) <= 0) return 'Vui lòng nhập tỷ giá hợp lệ.';
    if (!priceShip || parseNumberInput(priceShip) < 0) return 'Vui lòng nhập cước vận chuyển.';
    return '';
  };

  const validateLines = () => {
    for (const [index, line] of lines.entries()) {
      const prefix = `Sản phẩm ${index + 1}:`;
      if (isPurchaseOrder) {
        if (!line.productLink.trim()) return `${prefix} thiếu link sản phẩm.`;
        if (!line.productName.trim()) return `${prefix} thiếu tên sản phẩm.`;
        if (!line.productTypeId) return `${prefix} thiếu loại sản phẩm.`;
        if (parseNumberInput(line.quantity) <= 0) return `${prefix} số lượng không hợp lệ.`;
        if (parseNumberInput(line.priceWeb) < 0) return `${prefix} giá web không hợp lệ.`;
        if (!line.website.trim()) return `${prefix} thiếu website.`;
        continue;
      }
      if (!line.productName.trim()) return `${prefix} thiếu tên sản phẩm.`;
      if (!line.productTypeId) return `${prefix} thiếu loại sản phẩm.`;
      if (parseNumberInput(line.quantity) <= 0) return `${prefix} số lượng không hợp lệ.`;
    }
    return '';
  };

  const submitOrder = async () => {
    const commonError = validateCommon();
    if (commonError) {
      Alert.alert('Thiếu thông tin', commonError);
      return;
    }

    const lineError = validateLines();
    if (lineError) {
      Alert.alert('Thiếu thông tin', lineError);
      return;
    }

    Alert.alert('Xác nhận tạo đơn', `Tạo đơn ${selectedTitle}?`, [
      { text: 'Kiểm tra lại', style: 'cancel' },
      {
        text: 'Tạo đơn',
        onPress: async () => {
          try {
            setSubmitting(true);
            if (selectedType === 'MUA_HO') {
              await createCustomerPurchaseOrder({
                addressId,
                routeId,
                exchangeRate: parseNumberInput(exchangeRate),
                priceShip: parseNumberInput(priceShip),
                serviceType,
                checkRequired,
                purchaseLinks: buildPurchaseLinks(),
              });
            } else if (selectedType === 'KY_GUI') {
              await createCustomerDepositOrder({
                routeId,
                addressId,
                exchangeRate: parseNumberInput(exchangeRate),
                priceShip: parseNumberInput(priceShip),
                serviceType,
                checkRequired,
                consignmentLinks: buildConsignmentLinks(),
              });
            }
            await queryClient.invalidateQueries({ queryKey: ['customer-portal', 'orders'] });
            Toast.show({ type: 'success', text1: 'Đã tạo đơn thành công' });
            setSelectedType(null);
            resetForm();
          } catch (error: any) {
            Toast.show({ type: 'error', text1: error?.response?.data?.message || error?.message || 'Tạo đơn thất bại' });
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  const submitOrderForWeb = async (confirmed = false) => {
    if (submitting) return;

    const commonError = validateCommon();
    if (commonError) {
      Toast.show({ type: 'error', text1: 'Thiếu thông tin', text2: commonError });
      return;
    }

    const lineError = validateLines();
    if (lineError) {
      Toast.show({ type: 'error', text1: 'Thiếu thông tin', text2: lineError });
      return;
    }

    if (!confirmed) {
      setConfirmOpen(true);
      return;
    }

    try {
      setSubmitting(true);
      if (selectedType === 'MUA_HO') {
        await createCustomerPurchaseOrder({
          addressId,
          routeId,
          exchangeRate: parseNumberInput(exchangeRate),
          priceShip: parseNumberInput(priceShip),
          serviceType,
          checkRequired,
          purchaseLinks: buildPurchaseLinks(),
        });
      } else if (selectedType === 'KY_GUI') {
        await createCustomerDepositOrder({
          routeId,
          addressId,
          exchangeRate: parseNumberInput(exchangeRate),
          priceShip: parseNumberInput(priceShip),
          serviceType,
          checkRequired,
          consignmentLinks: buildConsignmentLinks(),
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['customer-portal', 'orders'] });
      Toast.show({ type: 'success', text1: 'Đã tạo đơn thành công' });
      setSelectedType(null);
      resetForm();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: error?.response?.data?.message || error?.message || 'Tạo đơn thất bại',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (isInitialLoading && selectedType) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <>
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}
      bottomOffset={spacing.md}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {selectedType ? (
        <View>
          <Pressable style={styles.backButton} onPress={() => setSelectedType(null)}>
            <Feather name="chevron-left" size={16} color={colors.textSecondary} />
            <Text style={styles.backText}>Quay lại</Text>
          </Pressable>

          <Text style={styles.title}>Tạo đơn {selectedTitle}</Text>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Địa chỉ</Text>
            <SelectSheet label="Địa chỉ" value={addressId} options={addressOptions} onChange={setAddressId} />
            <Text style={styles.addressHelper}>Mỗi đơn hàng chỉ chọn 1 địa chỉ nhận hàng.</Text>
            <AppButton
              title="Thêm địa chỉ mới"
              variant="outline"
              size="sm"
              onPress={openAddressEditor}
              style={styles.addAddressButton}
            />
          </View>

          {showRouteSection ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thông tin tuyến</Text>
              <SelectSheet
                label="Tuyến vận chuyển"
                value={routeId}
                options={routeOptions}
                onChange={(value) => {
                  setRouteId(value);
                  const route = routes.find((item) => String(item.routeId) === value);
                  if (route) {
                    setExchangeRate(String(route.exchangeRate ?? ''));
                    setPriceShip(String(route.shippingFee ?? ''));
                  }
                }}
              />
              <SelectSheet
                label="Loại dịch vụ"
                value={serviceType}
                options={[
                  { label: 'Hàng sạch', value: 'CLEAN' },
                  { label: 'Hàng hỗn hợp', value: 'MIXED' },
                ]}
                onChange={setServiceType}
              />
              <View pointerEvents="none" style={[styles.row, styles.readOnlyRow]}>
                <View style={styles.col}>
                  <AppInput
                    label="Tỷ giá"
                    value={exchangeRate}
                    editable={false}
                    selectTextOnFocus={false}
                    style={styles.readOnlyInput}
                  />
                </View>
                <View style={styles.col}>
                  <AppInput
                    label="Cước/kg"
                    value={priceShip}
                    editable={false}
                    selectTextOnFocus={false}
                    style={styles.readOnlyInput}
                  />
                </View>
              </View>
              <Pressable style={styles.checkRow} onPress={() => setCheckRequired((value) => !value)}>
                <Feather name={checkRequired ? 'check-square' : 'square'} size={18} color={colors.primaryDark} />
                <Text style={styles.checkText}>Yêu cầu kiểm hàng</Text>
              </Pressable>
              {selectedRoute ? (
                <Text style={styles.routeHint}>
                  Gợi ý tuyến: {selectedRoute.routeName} - {formatCurrency(selectedRoute.shippingFee)} / kg
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{isPurchaseOrder ? 'Danh sách sản phẩm' : 'Danh sách kiện hàng'}</Text>
            {lines.map((line, index) => (
              <View key={index} style={styles.lineCard}>
                <Text style={styles.lineTitle}>{`Sản phẩm ${index + 1}`}</Text>
                {isPurchaseOrder ? (
                  <>
                    <AppInput
                      label="Link sản phẩm"
                      value={line.productLink}
                      onChangeText={(value) => setLine(index, { productLink: value })}
                    />
                    <AppInput
                      label="Tên sản phẩm"
                      value={line.productName}
                      onChangeText={(value) => setLine(index, { productName: value })}
                    />
                    <AppInput label="Website" value={line.website} onChangeText={(value) => setLine(index, { website: value })} />
                    <SelectSheet
                      label="Loại sản phẩm"
                      value={line.productTypeId}
                      options={productTypeOptions}
                      onChange={(value) => setLine(index, { productTypeId: value })}
                    />
                    <AppInput
                      label="Giá web"
                      value={line.priceWeb}
                      onChangeText={(value) => setLine(index, { priceWeb: value })}
                      keyboardType="numeric"
                    />
                    <AppInput
                      label="Số lượng"
                      value={line.quantity}
                      onChangeText={(value) => setLine(index, { quantity: value })}
                      keyboardType="numeric"
                    />
                  </>
                ) : (
                  <>
                    <AppInput
                      label="Mã vận đơn"
                      value={line.shipmentCode}
                      onChangeText={(value) => setLine(index, { shipmentCode: value })}
                    />
                    <AppInput
                      label="Tên sản phẩm"
                      value={line.productName}
                      onChangeText={(value) => setLine(index, { productName: value })}
                    />
                    <SelectSheet
                      label="Loại sản phẩm"
                      value={line.productTypeId}
                      options={productTypeOptions}
                      onChange={(value) => setLine(index, { productTypeId: value })}
                    />
                    <View style={styles.row}>
                      <View style={styles.col}>
                        <AppInput
                          label="Số lượng"
                          value={line.quantity}
                          onChangeText={(value) => setLine(index, { quantity: value })}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={styles.col}>
                        <AppInput
                          label="Phụ phí"
                          value={line.productTypeId ? formatCurrency(getProductTypeExtraCharge(line.productTypeId)) : ''}
                          editable={false}
                          selectTextOnFocus={false}
                          style={styles.readOnlyInput}
                        />
                      </View>
                    </View>
                    <AppInput label="Ghi chú" value={line.note} onChangeText={(value) => setLine(index, { note: value })} />
                    <View style={styles.lineActions}>
                      <AppButton
                        title={line.imageId ? 'Đổi ảnh' : 'Tải ảnh'}
                        size="sm"
                        variant="outline"
                        onPress={() => pickImage(index)}
                      />
                      {lines.length > 1 ? (
                        <AppButton
                          title="Xóa"
                          size="sm"
                          variant="danger"
                          onPress={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                        />
                      ) : null}
                    </View>
                    <ImagePreview uri={line.imageUri} label="Đã chọn ảnh sản phẩm" />
                  </>
                )}
                {isPurchaseOrder && lines.length > 1 ? (
                  <View style={styles.lineActions}>
                    <AppButton
                      title="Xóa"
                      size="sm"
                      variant="danger"
                      onPress={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                    />
                  </View>
                ) : null}
              </View>
            ))}
            <AppButton
              title={'Th\u00eam s\u1ea3n ph\u1ea9m'}
              variant="outline"
              onPress={() => setLines((prev) => [...prev, emptyLine()])}
            />
          </View>

          <AppButton title="Tạo đơn hàng" onPress={Platform.OS === 'web' ? () => void submitOrderForWeb() : submitOrder} isLoading={submitting} style={styles.submitButton} />
        </View>
      ) : (
        <View>
          <Text style={styles.title}>Tạo đơn hàng</Text>
          <Text style={styles.subtitle}>Chọn loại đơn hàng bạn muốn tạo trên mobile.</Text>
          <View style={styles.grid}>
            {orderTypes.map((type) => (
              <Pressable key={type.id} style={styles.card} onPress={() => handleSelectType(type)}>
                <View style={styles.iconWrapper}>
                  <Feather name={type.icon} size={28} color={colors.primaryDark} />
                </View>
                <Text style={styles.cardTitle}>{type.title}</Text>
                <Text style={styles.cardDesc}>{type.desc}</Text>
                <View style={styles.cardAction}>
                  <Text style={styles.actionText}>{type.isConsultancy ? 'Tư vấn thêm' : 'Tiếp tục'}</Text>
                  <Feather name="arrow-right" size={14} color={colors.primaryDark} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </KeyboardAwareScrollView>
    <ModalShell visible={confirmOpen} title="Xác nhận tạo đơn" onClose={() => setConfirmOpen(false)}>
      <View style={styles.confirmContent}>
        <View style={styles.confirmIcon}>
          <Feather name="shopping-bag" size={24} color={colors.primaryDark} />
        </View>
        <Text style={styles.confirmTitle}>Tạo đơn {selectedTitle}?</Text>
        <Text style={styles.confirmText}>Kiểm tra thông tin đơn hàng trước khi gửi yêu cầu tạo đơn.</Text>
        <View style={styles.confirmActions}>
          <AppButton title="Hủy" variant="outline" onPress={() => setConfirmOpen(false)} disabled={submitting} />
          <AppButton
            title="Tạo đơn"
            onPress={() => {
              setConfirmOpen(false);
              void submitOrderForWeb(true);
            }}
            isLoading={submitting}
          />
        </View>
      </View>
    </ModalShell>
    <ModalShell visible={isAddressEditorOpen} title="Thêm địa chỉ mới" onClose={resetAddressCreation}>
      <View style={styles.confirmContent}>
        <AppInput
          label="Tỉnh / Thành phố"
          value={newAddressProvince}
          onChangeText={setNewAddressProvince}
          placeholder="Nhập tỉnh hoặc thành phố"
        />
        <AppInput
          label="Phường / Xã"
          value={newAddressWard}
          onChangeText={setNewAddressWard}
          placeholder="Nhập phường hoặc xã"
        />
        <AppInput
          label="Địa chỉ chi tiết"
          value={newAddressStreet}
          onChangeText={setNewAddressStreet}
          placeholder="Số nhà, tên đường..."
        />
        <View style={styles.confirmActions}>
          <AppButton title="Hủy" variant="outline" onPress={resetAddressCreation} />
          <AppButton title="Xác nhận địa chỉ" onPress={reviewNewAddress} />
        </View>
      </View>
    </ModalShell>
    <ModalShell
      visible={isAddressConfirmOpen}
      title="Xác nhận địa chỉ"
      onClose={() => {
        setIsAddressConfirmOpen(false);
        setIsAddressEditorOpen(true);
      }}
    >
      <View style={styles.confirmContent}>
        <View style={styles.confirmIcon}>
          <Feather name="map-pin" size={24} color={colors.primaryDark} />
        </View>
        <Text style={styles.confirmTitle}>Lưu địa chỉ này?</Text>
        <Text style={styles.confirmText}>{newAddressText}</Text>
        <View style={styles.confirmActions}>
          <AppButton
            title="Chỉnh sửa"
            variant="outline"
            onPress={() => {
              setIsAddressConfirmOpen(false);
              setIsAddressEditorOpen(true);
            }}
            disabled={isSavingAddress}
          />
          <AppButton title="Lưu địa chỉ" onPress={() => void confirmCreateAddress()} isLoading={isSavingAddress} />
        </View>
      </View>
    </ModalShell>
    </>
  );
}

function ImagePreview({ uri, label }: { uri?: string; label: string }) {
  if (!uri) return null;

  return (
    <View style={styles.imagePreview}>
      <Image source={{ uri }} style={styles.imagePreviewThumb} resizeMode="cover" />
      <View style={styles.imagePreviewText}>
        <Feather name="check-circle" size={13} color={colors.successText} />
        <Text style={styles.imageHint}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingTop: spacing['3xl'],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
    marginBottom: spacing.xl,
  },
  grid: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    backgroundColor: colors.primaryLight,
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  cardDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  actionText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.primaryDark,
    textTransform: 'uppercase',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textTransform: 'uppercase',
  },
  addressHelper: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  addAddressButton: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  col: {
    flex: 1,
  },
  readOnlyRow: {
    opacity: 0.8,
  },
  readOnlyInput: {
    backgroundColor: colors.primaryLight,
    color: colors.textSecondary,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  checkText: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
  },
  routeHint: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
  },
  lineCard: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
  },
  lineTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.primaryDark,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  lineActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  imagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  imagePreviewThumb: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  imagePreviewText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  imageHint: {
    color: colors.successText,
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
  },
  confirmContent: {
    gap: spacing.md,
  },
  confirmIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  confirmText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.textSecondary,
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  submitButton: {
    marginBottom: spacing['4xl'],
  },
});
