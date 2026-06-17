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
import * as ImageManipulator from 'expo-image-manipulator';
import { useQueryClient } from '@tanstack/react-query';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppButton } from '@/src/components/ui/AppButton';
import { SelectSheet } from '@/src/components/ui/SelectSheet';
import { ModalShell } from '@/src/components/ui/ModalShell';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { FormInput } from '@/src/components/form/FormInput';
import { FormSelect } from '@/src/components/form/FormSelect';
import { useCustomerProfile } from '@/src/features/customer-portal/shared/hooks/use-customer-profile';
import { useCreateOrderMasterData } from '@/src/features/customer-portal/shared/hooks/use-create-order-master-data';
import { addCustomerAddress } from '@/src/features/customer-portal/shared/services/customer-portal.service';
import {
  createCustomerDepositOrder,
  createCustomerPurchaseOrder,
} from '@/src/features/customer-portal/shared/services/create-order.service';
import { uploadImageUri } from '@/src/shared/services/upload-image.service';
import { useScreenContentTopPadding, useTabScreenBottomPadding } from '@/src/shared/lib/layout/safe-area';
import { formatCurrency, parseNumberInput } from '@/src/shared/lib/utils';
import {
  createOrderSchema,
  blankOrderValues,
  emptyProductLine,
  type CreateOrderForm,
  type OrderTypeId,
} from '@/src/features/customer-portal/shared/schemas/create-order.schemas';
import {
  addressSchema,
  type AddressForm,
} from '@/src/features/customer-portal/shared/schemas/account.schemas';

const orderTypes: Array<{
  id: OrderTypeId;
  title: string;
  desc: string;
  icon: keyof typeof Feather.glyphMap;
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
];

// Cạnh dài tối đa của ảnh sản phẩm sau khi resize (px) trước khi upload.
const MAX_IMAGE_DIMENSION = 1600;

// Resize cạnh dài về <= MAX_IMAGE_DIMENSION + nén JPEG trước khi up: tránh trần 5MB của BE,
// tăng tốc trên mạng yếu, và ép HEIC (iPhone) về JPEG. Nếu native module chưa sẵn (dev build
// cũ chưa rebuild) thì fallback dùng ảnh gốc thay vì làm hỏng luồng upload.
const resizeForUpload = async (asset: ImagePicker.ImagePickerAsset): Promise<string> => {
  try {
    const longestEdge = Math.max(asset.width ?? 0, asset.height ?? 0);
    const resizeActions: ImageManipulator.Action[] =
      longestEdge > MAX_IMAGE_DIMENSION
        ? [
            (asset.width ?? 0) >= (asset.height ?? 0)
              ? { resize: { width: MAX_IMAGE_DIMENSION } }
              : { resize: { height: MAX_IMAGE_DIMENSION } },
          ]
        : [];
    const processed = await ImageManipulator.manipulateAsync(asset.uri, resizeActions, {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return processed.uri;
  } catch {
    return asset.uri;
  }
};

export default function CreateOrderScreen() {
  const queryClient = useQueryClient();
  const contentPaddingBottom = useTabScreenBottomPadding();
  const contentPaddingTop = useScreenContentTopPadding(spacing.base);
  const { data: profile, refetch: refetchProfile } = useCustomerProfile();
  const [selectedType, setSelectedType] = useState<OrderTypeId | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLineIndex, setUploadingLineIndex] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isAddressEditorOpen, setIsAddressEditorOpen] = useState(false);
  const [isAddressConfirmOpen, setIsAddressConfirmOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const isPurchaseOrder = selectedType === 'MUA_HO';
  const isConsignmentOrder = selectedType === 'KY_GUI';
  const showRouteSection = isPurchaseOrder || isConsignmentOrder;

  // ===== Form chính (react-hook-form + Zod, validate line theo orderType qua superRefine) =====
  const form = useForm<CreateOrderForm>({
    resolver: zodResolver(createOrderSchema),
    mode: 'onChange',
    defaultValues: blankOrderValues('MUA_HO'),
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'lines' });
  const routeId = form.watch('routeId');
  const serviceType = form.watch('serviceType');
  const checkRequired = form.watch('checkRequired');

  // Form thêm địa chỉ mới (modal lồng) — tái dùng schema địa chỉ của màn Tài khoản.
  const newAddressForm = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    mode: 'onChange',
    defaultValues: { province: '', ward: '', street: '' },
  });
  const newAddressValues = newAddressForm.watch();

  const {
    routes,
    productTypes,
    isInitialLoading,
    isError: masterDataError,
    refetch: refetchMasterData,
  } = useCreateOrderMasterData(routeId, serviceType, showRouteSection);
  const selectedRoute = routes.find((route) => String(route.routeId) === routeId);

  useEffect(() => {
    if (!showRouteSection) return;
    if (routeId || routes.length === 0) return;

    const defaultRoute = routes[0];
    form.setValue('routeId', String(defaultRoute.routeId), { shouldValidate: true });
    form.setValue('exchangeRate', String(defaultRoute.exchangeRate ?? ''), { shouldValidate: true });
    form.setValue('priceShip', String(defaultRoute.shippingFee ?? ''), { shouldValidate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const newAddressText = [newAddressValues.street.trim(), newAddressValues.ward.trim(), newAddressValues.province.trim()]
    .filter(Boolean)
    .join(', ');

  const resetAddressCreation = () => {
    newAddressForm.reset({ province: '', ward: '', street: '' });
    setIsAddressEditorOpen(false);
    setIsAddressConfirmOpen(false);
  };

  const handleSelectType = (type: (typeof orderTypes)[number]) => {
    // Temporarily keep consignment visible but disable entry until the feature is ready.
    if (type.id === 'KY_GUI') {
      Alert.alert('Thông báo', 'Chức năng sẽ sớm ra mắt');
      return;
    }

    form.reset(blankOrderValues(type.id));
    resetAddressCreation();
    setSelectedType(type.id);
  };

  const openAddressEditor = () => {
    setIsAddressConfirmOpen(false);
    setIsAddressEditorOpen(true);
  };

  const onReviewNewAddress = newAddressForm.handleSubmit(() => {
    setIsAddressEditorOpen(false);
    setIsAddressConfirmOpen(true);
  });

  const confirmCreateAddress = async () => {
    const values = newAddressForm.getValues();
    const previousAddressIds = new Set((profile?.addresses ?? []).map((item) => String(item.addressId)));

    try {
      setIsSavingAddress(true);
      await addCustomerAddress({
        province: values.province.trim(),
        ward: values.ward.trim(),
        street: values.street.trim(),
      });

      const refreshed = await refetchProfile();
      const addresses = refreshed.data?.addresses ?? [];
      const createdAddress =
        addresses.find((item) => !previousAddressIds.has(String(item.addressId))) ??
        addresses.find(
          (item) =>
            (item.province ?? '').trim() === values.province.trim() &&
            (item.ward ?? '').trim() === values.ward.trim() &&
            (item.streetAddress ?? '').trim() === values.street.trim(),
        );

      if (createdAddress?.addressId) {
        form.setValue('addressId', String(createdAddress.addressId), { shouldValidate: true });
      }

      resetAddressCreation();
      Toast.show({ type: 'success', text1: 'Đã thêm địa chỉ mới' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error?.response?.data?.message || error?.message || 'Thêm địa chỉ thất bại' });
    } finally {
      setIsSavingAddress(false);
    }
  };

  const pickImage = async (index: number) => {
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

    const asset = result.assets[0];
    try {
      setUploadingLineIndex(index);
      const uploadUri = await resizeForUpload(asset);
      const uploaded = await uploadImageUri(uploadUri, 'orders');
      form.setValue(`lines.${index}.imageUri`, uploadUri);
      form.setValue(`lines.${index}.imageId`, uploaded.id);
      Toast.show({ type: 'success', text1: 'Đã tải ảnh lên' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error?.message || 'Tải ảnh thất bại' });
    } finally {
      setUploadingLineIndex(null);
    }
  };

  // Master-data là trạng thái async, không thuộc form values → guard riêng ngoài schema.
  const masterDataGuardError = () =>
    showRouteSection && (masterDataError || routes.length === 0)
      ? 'Chưa tải được dữ liệu tuyến và loại hàng. Vui lòng thử lại.'
      : '';

  const buildPurchaseLinks = (values: CreateOrderForm) =>
    values.lines.map((line) => ({
      productLink: line.productLink.trim(),
      quantity: parseNumberInput(line.quantity),
      priceWeb: parseNumberInput(line.priceWeb),
      productName: line.productName.trim(),
      productTypeId: line.productTypeId,
      website: line.website.trim(),
      purchaseImageId: line.imageId,
    }));

  const buildConsignmentLinks = (values: CreateOrderForm) =>
    values.lines.map((line) => ({
      quantity: parseNumberInput(line.quantity),
      productName: line.productName.trim(),
      productTypeId: line.productTypeId,
      extraCharge: getProductTypeExtraCharge(line.productTypeId),
      shipmentCode: line.shipmentCode.trim(),
      differentFee: 0,
      purchaseImageId: line.imageId,
      note: line.note.trim(),
    }));

  const doSubmit = async (values: CreateOrderForm) => {
    try {
      setSubmitting(true);
      if (values.orderType === 'MUA_HO') {
        await createCustomerPurchaseOrder({
          addressId: values.addressId,
          routeId: values.routeId,
          exchangeRate: parseNumberInput(values.exchangeRate),
          priceShip: parseNumberInput(values.priceShip),
          serviceType: values.serviceType,
          checkRequired: values.checkRequired,
          purchaseLinks: buildPurchaseLinks(values),
        });
      } else {
        await createCustomerDepositOrder({
          routeId: values.routeId,
          addressId: values.addressId,
          exchangeRate: parseNumberInput(values.exchangeRate),
          priceShip: parseNumberInput(values.priceShip),
          serviceType: values.serviceType,
          checkRequired: values.checkRequired,
          consignmentLinks: buildConsignmentLinks(values),
        });
      }
      await queryClient.invalidateQueries({ queryKey: ['customer-portal', 'orders'] });
      Toast.show({ type: 'success', text1: 'Đã tạo đơn thành công' });
      setSelectedType(null);
      form.reset(blankOrderValues(values.orderType));
      resetAddressCreation();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error?.response?.data?.message || error?.message || 'Tạo đơn thất bại' });
    } finally {
      setSubmitting(false);
    }
  };

  // Nút submit KHÔNG disable theo isValid: form dài, lỗi field chỉ hiện sau khi chạm —
  // bấm nút sẽ hiện toàn bộ lỗi đỏ dưới field + Toast nhắc, thay vì nút im lặng bị khóa.
  const onSubmit = form.handleSubmit(
    (values) => {
      const guard = masterDataGuardError();
      if (guard) {
        if (Platform.OS === 'web') Toast.show({ type: 'error', text1: 'Thiếu thông tin', text2: guard });
        else Alert.alert('Thiếu thông tin', guard);
        return;
      }

      if (Platform.OS === 'web') {
        setConfirmOpen(true);
        return;
      }

      Alert.alert('Xác nhận tạo đơn', `Tạo đơn ${selectedTitle}?`, [
        { text: 'Kiểm tra lại', style: 'cancel' },
        { text: 'Tạo đơn', onPress: () => void doSubmit(values) },
      ]);
    },
    () => {
      const guard = masterDataGuardError();
      Toast.show({
        type: 'error',
        text1: 'Thiếu thông tin',
        text2: guard || 'Vui lòng kiểm tra các trường được đánh dấu đỏ.',
      });
    },
  );

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
        contentContainerStyle={[styles.content, { paddingTop: contentPaddingTop, paddingBottom: contentPaddingBottom }]}
      bottomOffset={spacing.md}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {selectedType ? (
        <View>
          <Pressable
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Quay lại chọn loại đơn"
            hitSlop={8}
            onPress={() => setSelectedType(null)}
          >
            <Feather name="chevron-left" size={16} color={colors.textSecondary} />
            <Text style={styles.backText}>Quay lại</Text>
          </Pressable>

          <Text style={styles.title}>Tạo đơn {selectedTitle}</Text>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Địa chỉ</Text>
            <FormSelect control={form.control} name="addressId" label="Địa chỉ" options={addressOptions} />
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
              {masterDataError ? (
                <ErrorState
                  title="Không tải được dữ liệu tạo đơn"
                  description="Danh sách tuyến và loại hàng chưa tải được. Vui lòng thử lại."
                  onRetry={() => void refetchMasterData()}
                  isRetrying={isInitialLoading}
                />
              ) : null}
              <Controller
                control={form.control}
                name="routeId"
                render={({ field: { value, onChange }, fieldState: { error } }) => (
                  <View>
                    <SelectSheet
                      label="Tuyến vận chuyển"
                      value={value}
                      options={routeOptions}
                      onChange={(nextValue) => {
                        onChange(nextValue);
                        const route = routes.find((item) => String(item.routeId) === nextValue);
                        if (route) {
                          form.setValue('exchangeRate', String(route.exchangeRate ?? ''), { shouldValidate: true });
                          form.setValue('priceShip', String(route.shippingFee ?? ''), { shouldValidate: true });
                        }
                      }}
                      statusText={error?.message}
                      statusTone={error ? 'error' : 'muted'}
                    />
                    {error ? <Text style={styles.fieldError}>{error.message}</Text> : null}
                  </View>
                )}
              />
              <FormSelect
                control={form.control}
                name="serviceType"
                label="Loại dịch vụ"
                options={[
                  { label: 'Hàng sạch', value: 'CLEAN' },
                  { label: 'Hàng hỗn hợp', value: 'MIXED' },
                ]}
              />
              <View pointerEvents="none" style={[styles.row, styles.readOnlyRow]}>
                <View style={styles.col}>
                  <FormInput
                    control={form.control}
                    name="exchangeRate"
                    label="Tỷ giá"
                    editable={false}
                    selectTextOnFocus={false}
                    style={styles.readOnlyInput}
                  />
                </View>
                <View style={styles.col}>
                  <FormInput
                    control={form.control}
                    name="priceShip"
                    label="Cước/kg"
                    editable={false}
                    selectTextOnFocus={false}
                    style={styles.readOnlyInput}
                  />
                </View>
              </View>
              <Pressable
                style={styles.checkRow}
                accessibilityRole="checkbox"
                accessibilityLabel="Yêu cầu kiểm hàng"
                accessibilityState={{ checked: checkRequired }}
                onPress={() => form.setValue('checkRequired', !checkRequired)}
              >
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
            {fields.map((field, index) => {
              const lineProductTypeId = form.watch(`lines.${index}.productTypeId`);
              const lineImageUri = form.watch(`lines.${index}.imageUri`);
              const lineImageId = form.watch(`lines.${index}.imageId`);
              return (
                <View key={field.id} style={styles.lineCard}>
                  <Text style={styles.lineTitle}>{`Sản phẩm ${index + 1}`}</Text>
                  {isPurchaseOrder ? (
                    <>
                      <FormInput control={form.control} name={`lines.${index}.productLink`} label="Link sản phẩm" />
                      <FormInput control={form.control} name={`lines.${index}.productName`} label="Tên sản phẩm" />
                      <FormInput control={form.control} name={`lines.${index}.website`} label="Website" />
                      <FormSelect
                        control={form.control}
                        name={`lines.${index}.productTypeId`}
                        label="Loại sản phẩm"
                        options={productTypeOptions}
                      />
                      <FormInput
                        control={form.control}
                        name={`lines.${index}.priceWeb`}
                        label="Giá web"
                        keyboardType="numeric"
                      />
                      <FormInput
                        control={form.control}
                        name={`lines.${index}.quantity`}
                        label="Số lượng"
                        keyboardType="numeric"
                      />
                      <View style={styles.lineActions}>
                        <AppButton
                          title={lineImageId ? 'Đổi ảnh sản phẩm' : 'Chọn ảnh sản phẩm'}
                          size="sm"
                          variant="outline"
                          onPress={() => void pickImage(index)}
                          isLoading={uploadingLineIndex === index}
                          disabled={uploadingLineIndex !== null}
                        />
                        {fields.length > 1 ? (
                          <AppButton
                            title="Xóa"
                            size="sm"
                            variant="danger"
                            onPress={() => remove(index)}
                          />
                        ) : null}
                      </View>
                      <ImagePreview uri={lineImageUri} label="Đã chọn ảnh sản phẩm" />
                    </>
                  ) : (
                    <>
                      <FormInput control={form.control} name={`lines.${index}.shipmentCode`} label="Mã vận đơn" />
                      <FormInput control={form.control} name={`lines.${index}.productName`} label="Tên sản phẩm" />
                      <FormSelect
                        control={form.control}
                        name={`lines.${index}.productTypeId`}
                        label="Loại sản phẩm"
                        options={productTypeOptions}
                      />
                      <View style={styles.row}>
                        <View style={styles.col}>
                          <FormInput
                            control={form.control}
                            name={`lines.${index}.quantity`}
                            label="Số lượng"
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.col}>
                          <AppInput
                            label="Phụ phí"
                            value={lineProductTypeId ? formatCurrency(getProductTypeExtraCharge(lineProductTypeId)) : ''}
                            editable={false}
                            selectTextOnFocus={false}
                            style={styles.readOnlyInput}
                          />
                        </View>
                      </View>
                      <FormInput control={form.control} name={`lines.${index}.note`} label="Ghi chú" />
                      <View style={styles.lineActions}>
                        <AppButton
                          title={lineImageId ? 'Đổi ảnh' : 'Tải ảnh'}
                          size="sm"
                          variant="outline"
                          onPress={() => void pickImage(index)}
                          isLoading={uploadingLineIndex === index}
                          disabled={uploadingLineIndex !== null}
                        />
                        {fields.length > 1 ? (
                          <AppButton
                            title="Xóa"
                            size="sm"
                            variant="danger"
                            onPress={() => remove(index)}
                          />
                        ) : null}
                      </View>
                      <ImagePreview uri={lineImageUri} label="Đã chọn ảnh sản phẩm" />
                    </>
                  )}
                </View>
              );
            })}
            <AppButton
              title={'Thêm sản phẩm'}
              variant="outline"
              onPress={() => append(emptyProductLine())}
            />
          </View>

          <AppButton title="Tạo đơn hàng" onPress={onSubmit} isLoading={submitting} style={styles.submitButton} />
        </View>
      ) : (
        <View>
          <Text style={styles.title}>Tạo đơn hàng</Text>
          <Text style={styles.subtitle}>Chọn loại đơn hàng bạn muốn tạo trên mobile.</Text>
          <View style={styles.grid}>
            {orderTypes.map((type) => (
              <Pressable
                key={type.id}
                style={styles.card}
                accessibilityRole="button"
                accessibilityLabel={`Tạo đơn ${type.title}`}
                onPress={() => handleSelectType(type)}
              >
                <View style={styles.iconWrapper}>
                  <Feather name={type.icon} size={28} color={colors.primaryDark} />
                </View>
                <Text style={styles.cardTitle}>{type.title}</Text>
                <Text style={styles.cardDesc}>{type.desc}</Text>
                <View style={styles.cardAction}>
                  <Text style={styles.actionText}>Tiếp tục</Text>
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
              void doSubmit(form.getValues());
            }}
            isLoading={submitting}
          />
        </View>
      </View>
    </ModalShell>
    <ModalShell visible={isAddressEditorOpen} title="Thêm địa chỉ mới" onClose={resetAddressCreation}>
      <View style={styles.confirmContent}>
        <FormInput
          control={newAddressForm.control}
          name="province"
          label="Tỉnh / Thành phố"
          placeholder="Nhập tỉnh hoặc thành phố"
        />
        <FormInput
          control={newAddressForm.control}
          name="ward"
          label="Phường / Xã"
          placeholder="Nhập phường hoặc xã"
        />
        <FormInput
          control={newAddressForm.control}
          name="street"
          label="Địa chỉ chi tiết"
          placeholder="Số nhà, tên đường..."
        />
        <View style={styles.confirmActions}>
          <AppButton title="Hủy" variant="outline" onPress={resetAddressCreation} />
          <AppButton
            title="Xác nhận địa chỉ"
            onPress={onReviewNewAddress}
            disabled={!newAddressForm.formState.isValid}
          />
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
    minHeight: 44,
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
  fieldError: {
    fontSize: typography.fontSize.xs,
    color: colors.error,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
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
