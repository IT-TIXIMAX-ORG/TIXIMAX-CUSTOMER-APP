import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  TextInput,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import { getAppVersionLabel } from '@/src/shared/lib/app-version';
import { useAuthUser, useAuthActions } from '@/src/features/auth/hooks/use-auth-store';
import { useCustomerProfile } from '@/src/features/customer-portal/shared/hooks/use-customer-profile';
import {
  addCustomerAddress,
  deleteCustomerAccount,
  deleteCustomerAddress,
  // TODO(phone-otp): tạm tắt xác minh SĐT — chưa có API SMS OTP. Bật lại khi có API (#1375).
  // requestPhoneOtp,
  resendOtp,
  updateCustomerAddress,
  updateCustomerProfile,
  verifyOtp,
  // verifyPhoneOtp,
} from '@/src/features/customer-portal/shared/services/customer-portal.service';
import { changeCurrentPassword, createLocalPassword, getReferralSaleStaff } from '@/src/features/auth/services/auth.service';
import type { ReferralStaffOption } from '@/src/features/customer-portal/shared/types/master-data.types';
import { AppButton } from '@/src/components/ui/AppButton';
import { ModalShell } from '@/src/components/ui/ModalShell';
import { SelectSheet } from '@/src/components/ui/SelectSheet';
import { FormInput } from '@/src/components/form/FormInput';
import { ProvinceWardPicker } from '@/src/components/address/ProvinceWardPicker';
import { MenuItem } from '@/src/components/account/MenuItem';
import { MenuSection } from '@/src/components/account/MenuSection';
import { ProfileHeader } from '@/src/components/account/ProfileHeader';
import { ProfileTasksSheet } from '@/src/components/account/ProfileTasksSheet';
import { ProfileUpdateWidget } from '@/src/components/account/ProfileUpdateWidget';
import { WalletCard } from '@/src/components/account/WalletCard';
import { QUERY_KEYS } from '@/src/shared/lib/query/query-keys';
import { useScreenContentTopPadding, useTabScreenBottomPadding } from '@/src/shared/lib/layout/safe-area';
import {
  profileSchema,
  type ProfileForm,
  addressSchema,
  type AddressForm,
  verifyEmailOtpSchema,
  type VerifyEmailOtpForm,
  changePasswordSchema,
  type ChangePasswordForm,
  createPasswordSchema,
  type CreatePasswordForm,
} from '@/src/features/customer-portal/shared/schemas/account.schemas';

type AccountModal = 'progress' | 'profile' | 'address' | 'security' | 'verify' | 'support' | null;

export default function AccountScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const contentPaddingBottom = useTabScreenBottomPadding(spacing.md);
  const contentPaddingTop = useScreenContentTopPadding();
  const user = useAuthUser();
  const { logout } = useAuthActions();
  const { data: profile, refetch } = useCustomerProfile();
  const [modal, setModal] = useState<AccountModal>(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [staffOptions, setStaffOptions] = useState<ReferralStaffOption[]>([]);
  const [addressId, setAddressId] = useState('');
  const [isAddressEditorVisible, setIsAddressEditorVisible] = useState(false);
  const [pendingDeleteAddressId, setPendingDeleteAddressId] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isOldPasswordVisible, setIsOldPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  const displayName = profile?.name || user?.name || 'Khách hàng';
  const displayEmail = profile?.email || user?.email || '';
  const hasAssignedStaff = Boolean(profile?.dedicatedStaff);

  // ===== Forms (react-hook-form + Zod) =====
  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
    defaultValues: { name: '', email: '', phone: '', staffId: '' },
  });
  const addressForm = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    mode: 'onChange',
    defaultValues: { province: '', ward: '', street: '' },
  });
  const verifyForm = useForm<VerifyEmailOtpForm>({
    resolver: zodResolver(verifyEmailOtpSchema),
    mode: 'onChange',
    defaultValues: { otp: '' },
  });
  const changePasswordForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onChange',
    defaultValues: { oldPassword: '', newPassword: '', confirmNewPassword: '' },
  });
  const createPasswordForm = useForm<CreatePasswordForm>({
    resolver: zodResolver(createPasswordSchema),
    mode: 'onChange',
    defaultValues: { password: '', confirmNewPassword: '' },
  });

  const resetAddressForm = () => {
    setAddressId('');
    addressForm.reset({ province: '', ward: '', street: '' });
  };

  const resetPasswordForms = () => {
    changePasswordForm.reset({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
    createPasswordForm.reset({ password: '', confirmNewPassword: '' });
    setIsPasswordVisible(false);
    setIsOldPasswordVisible(false);
    setIsNewPasswordVisible(false);
    setIsConfirmPasswordVisible(false);
  };

  const refreshAccount = async () => {
    if (Platform.OS === 'web' || isRefreshing) return;

    try {
      setIsRefreshing(true);
      await refetch();
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Không thể làm mới',
        text2: 'Vui lòng kiểm tra kết nối và thử lại.',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Nạp dữ liệu hồ sơ vào form khi mở modal "Thông tin cá nhân".
  useEffect(() => {
    if (modal !== 'profile' || !profile) return;
    profileForm.reset({
      name: profile.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      staffId: profile.dedicatedStaff?.accountId || profile.dedicatedStaff?.staffId || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  useEffect(() => {
    if (modal !== 'profile' || hasAssignedStaff) return;
    void getReferralSaleStaff()
      .then(setStaffOptions)
      .catch(() => setStaffOptions([]));
  }, [hasAssignedStaff, modal]);

  useEffect(() => {
    if (modal === 'address') return;
    setPendingDeleteAddressId('');
    setIsAddressEditorVisible(false);
    resetAddressForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  const handleLogoutNow = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      await logout();
      router.replace('/(auth)/login');
    } catch {
      Toast.show({ type: 'error', text1: 'Không thể đăng xuất. Vui lòng thử lại.' });
      setIsLoggingOut(false);
    }
  };

  const confirmDeleteAccount = async () => {
    if (isDeleting) return;

    try {
      setIsDeleting(true);
      await deleteCustomerAccount();
      setIsDeleteConfirmVisible(false);
      // Account đã bị khóa + token thu hồi ở BE → xóa session local rồi về Login ngay.
      // KHÔNG refetch profile để tránh interceptor bắn 401/403 → toast "phiên hết hạn" gây nhiễu.
      await logout();
      router.replace('/(auth)/login');
      setTimeout(() => {
        Toast.show({ type: 'success', text1: 'Tài khoản đã được xóa' });
      }, 0);
    } catch (error: any) {
      // 409 (còn đơn đang xử lý) không phải 401/403 nên không bị interceptor refresh → vào thẳng đây.
      Toast.show({
        type: 'error',
        text1: error?.response?.data?.message || error?.message || 'Không thể xóa tài khoản',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const runAction = async (action: () => Promise<void>, success: string) => {
    try {
      setLoading(true);
      await action();
      Toast.show({ type: 'success', text1: success });
      await refetch();
      setModal(null);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error?.response?.data?.message || error?.message || 'Thao tác thất bại' });
    } finally {
      setLoading(false);
    }
  };

  const runVerifyAction = async (action: () => Promise<void>, success: string) => {
    try {
      setLoading(true);
      await action();
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customerPortal.profile() });
      await refetch();
      setModal(null);
      setTimeout(() => {
        Toast.show({ type: 'success', text1: success });
      }, 0);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error?.response?.data?.message || error?.message || 'Thao tác thất bại' });
    } finally {
      setLoading(false);
    }
  };

  const onSaveProfile = profileForm.handleSubmit(async (values) => {
    await runAction(async () => {
      await updateCustomerProfile({
        fullName: values.name,
        email: values.email,
        phone: values.phone,
        ...(values.staffId && !hasAssignedStaff ? { staffId: values.staffId } : {}),
      });
    }, 'Đã cập nhật thông tin');
  });

  const openAddressList = () => {
    setPendingDeleteAddressId('');
    setModal('address');
  };

  const closeAddressEditor = () => {
    setIsAddressEditorVisible(false);
    resetAddressForm();
  };

  const closeAddressFlow = () => {
    setPendingDeleteAddressId('');
    setIsAddressEditorVisible(false);
    resetAddressForm();
    setModal(null);
  };

  const openAddressEditor = (id?: string) => {
    setPendingDeleteAddressId('');

    const address = id ? profile?.addresses.find((item) => String(item.addressId) === id) : undefined;
    if (!address) {
      setAddressId('');
      addressForm.reset({ province: '', ward: '', street: '' });
      setIsAddressEditorVisible(true);
      return;
    }

    setAddressId(String(address.addressId));
    addressForm.reset({
      province: address.province || '',
      ward: address.ward || '',
      street: address.streetAddress || '',
    });
    setIsAddressEditorVisible(true);
  };

  const onSaveAddress = addressForm.handleSubmit(async (values) => {
    const payload = {
      province: values.province,
      ward: values.ward,
      street: values.street,
    };

    try {
      setLoading(true);
      if (addressId) await updateCustomerAddress(addressId, payload);
      else await addCustomerAddress(payload);
      const successMessage = addressId ? 'Đã cập nhật địa chỉ' : 'Đã thêm địa chỉ';
      closeAddressFlow();
      await refetch();
      setTimeout(() => {
        Toast.show({ type: 'success', text1: successMessage });
      }, 0);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error?.response?.data?.message || error?.message || 'Thao tác thất bại' });
    } finally {
      setLoading(false);
    }
  });

  const promptRemoveAddress = (id: string) => {
    if (addressId === id) closeAddressEditor();
    setPendingDeleteAddressId(id);
  };

  const cancelRemoveAddress = () => {
    setPendingDeleteAddressId('');
  };

  const confirmRemoveAddress = async () => {
    if (!pendingDeleteAddressId) return;

    try {
      setLoading(true);
      await deleteCustomerAddress(pendingDeleteAddressId);
      closeAddressFlow();
      await refetch();
      setTimeout(() => {
        Toast.show({ type: 'success', text1: 'Đã xóa địa chỉ' });
      }, 0);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error?.response?.data?.message || error?.message || 'Thao tác thất bại' });
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailAddress = () => profile?.email || profileForm.getValues('email');

  const onVerifyEmail = verifyForm.handleSubmit(async (values) => {
    await runVerifyAction(async () => verifyOtp(verifyEmailAddress(), values.otp), 'Đã xác minh email');
  });

  const resendEmailOtp = async () => {
    await runAction(async () => resendOtp(verifyEmailAddress()), 'Đã gửi lại OTP email');
    setModal('verify');
  };

  const closeSecurityModal = () => {
    resetPasswordForms();
    setModal(null);
  };

  const onChangePassword = changePasswordForm.handleSubmit(async (values) => {
    await runAction(
      async () => changeCurrentPassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
        confirmNewPassword: values.confirmNewPassword,
      }),
      'Đã đổi mật khẩu',
    );
    resetPasswordForms();
  });

  const onCreatePassword = createPasswordForm.handleSubmit(async (values) => {
    await runAction(async () => createLocalPassword(values.password), 'Đã tạo mật khẩu');
    resetPasswordForms();
  });

  const staffSelectOptions = staffOptions.map((staff) => ({
    value: staff.accountId,
    label: `${staff.name}${staff.staffCode ? ` (${staff.staffCode})` : ''}`,
    description: staff.phone,
  }));
  const pendingDeleteAddress = profile?.addresses.find((item) => String(item.addressId) === pendingDeleteAddressId);
  const profileTasks = [
    {
      key: 'name',
      title: 'Cập nhật họ tên',
      detail: 'Hoàn tất thông tin cơ bản.',
      completed: Boolean(profile?.name?.trim()),
      action: () => setModal('profile'),
    },
    {
      key: 'email',
      title: 'Xác minh email',
      detail: 'Xác minh địa chỉ email của bạn.',
      completed: Boolean(profile?.isVerify),
      action: () => setModal('verify'),
    },
    // TODO(phone-otp): tạm tắt xác minh SĐT — chưa có API SMS OTP. Bật lại khi có API (#1375).
    // {
    //   key: 'phone',
    //   title: 'Xác minh số điện thoại',
    //   detail: 'Xác minh số điện thoại đang sử dụng.',
    //   completed: Boolean(profile?.phoneVerified && profile?.phone?.trim()),
    //   action: () => setModal('verify'),
    // },
    {
      key: 'address',
      title: 'Thêm ít nhất 1 địa chỉ',
      detail: 'Thêm địa chỉ nhận hàng mặc định.',
      completed: Boolean(profile?.addresses?.length),
      action: openAddressList,
    },
  ];
  // Cấp độ là field authoritative từ backend; FE KHÔNG tự suy ra để tránh lệch với hệ thống.
  const currentLevel = profile?.profileCompletionLevel ?? 1;
  // Checklist chỉ để hướng dẫn bước còn thiếu và thể hiện tiến độ thao tác của người dùng.
  const completedTaskCount = profileTasks.filter((task) => task.completed).length;
  const nextTask = profileTasks.find((task) => !task.completed);
  const showProgressCard = currentLevel < 3;

  // Địa chỉ dùng picker liên cấp Tỉnh → Phường/Xã (đơn vị hành chính mới sau sáp nhập).
  const watchedProvince = addressForm.watch('province');
  const watchedWard = addressForm.watch('ward');
  const handleSelectProvince = (province: string) => {
    addressForm.setValue('province', province, { shouldValidate: true, shouldDirty: true });
    // Đổi tỉnh thì xóa phường/xã cũ (không còn thuộc tỉnh mới).
    addressForm.setValue('ward', '', { shouldValidate: true, shouldDirty: true });
  };
  const handleSelectWard = (ward: string) => {
    addressForm.setValue('ward', ward, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: contentPaddingTop, paddingBottom: contentPaddingBottom }]}
      alwaysBounceVertical
      refreshControl={
        Platform.OS !== 'web' ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refreshAccount()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
    >
      <Text style={styles.title}>Tài khoản</Text>

      <ProfileHeader name={displayName} email={displayEmail} />

      {showProgressCard ? (
        <ProfileUpdateWidget
          completedCount={completedTaskCount}
          totalCount={profileTasks.length}
          nextTaskTitle={nextTask?.title}
          onPress={() => setModal('progress')}
        />
      ) : null}

      <WalletCard
        balance={profile?.balance ?? 0}
        onDeposit={() => Alert.alert('Nạp tiền', 'Vui lòng liên hệ nhân viên phụ trách để được hướng dẫn nạp tiền.')}
      />

      <MenuSection title="Tài khoản của tôi">
        <MenuItem title="Thông tin cá nhân" icon="user" onPress={() => setModal('profile')} />
        <MenuItem title="Xác minh tài khoản" icon="check-circle" onPress={() => setModal('verify')} />
        <MenuItem title="Nhân viên hỗ trợ" icon="help-circle" onPress={() => setModal('support')} isLast />
      </MenuSection>

      <MenuSection title="Thiết lập chung">
        <MenuItem title="Địa chỉ" icon="map-pin" onPress={openAddressList} />
        <MenuItem title="Bảo mật và mật khẩu" icon="shield" onPress={() => setModal('security')} />
        <MenuItem
          title={isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
          icon="log-out"
          variant="danger"
          onPress={handleLogoutNow}
          disabled={isLoggingOut}
        />
        <MenuItem
          title="Xóa tài khoản"
          icon="trash-2"
          variant="danger"
          onPress={() => setIsDeleteConfirmVisible(true)}
          disabled={isDeleting}
          isLast
        />
      </MenuSection>

      <Text style={styles.versionText}>{getAppVersionLabel()}</Text>

      <ProfileTasksSheet
        visible={modal === 'progress'}
        onClose={() => setModal(null)}
        tasks={profileTasks}
        completedCount={completedTaskCount}
      />

      <ModalShell visible={modal === 'profile'} title="Thông tin cá nhân" onClose={() => setModal(null)}>
        <FormInput control={profileForm.control} name="name" label="Họ tên" />
        <FormInput
          control={profileForm.control}
          name="email"
          label="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <FormInput
          control={profileForm.control}
          name="phone"
          label="Số điện thoại"
          keyboardType="phone-pad"
        />
        {!hasAssignedStaff ? (
          <Controller
            control={profileForm.control}
            name="staffId"
            render={({ field: { value, onChange } }) => (
              <SelectSheet label="Nhân viên giới thiệu" value={value} options={staffSelectOptions} onChange={onChange} />
            )}
          />
        ) : (
          <Text style={styles.helperText}>Nhân viên phụ trách: {profile?.dedicatedStaff?.name}</Text>
        )}
        <AppButton
          title="Lưu thông tin"
          onPress={onSaveProfile}
          isLoading={loading}
          disabled={!profileForm.formState.isValid}
        />
      </ModalShell>

      <ModalShell visible={modal === 'address'} title="Địa chỉ" onClose={() => setModal(null)}>
        {(profile?.addresses?.length ?? 0) > 0 ? (
          profile?.addresses.map((address) => (
            <View
              key={address.addressId}
              style={[
                styles.addressItem,
                pendingDeleteAddressId === String(address.addressId) && styles.addressItemDanger,
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.addressName}>{address.addressName || 'Địa chỉ nhận hàng'}</Text>
                <Text style={styles.addressLine}>{[address.streetAddress, address.ward, address.province].filter(Boolean).join(', ')}</Text>
              </View>
              <Pressable
                onPress={() => openAddressEditor(String(address.addressId))}
                style={styles.iconButton}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Sửa địa chỉ"
              >
                <Feather name="edit-2" size={16} color={colors.primaryDark} />
              </Pressable>
              <Pressable
                onPress={() => promptRemoveAddress(String(address.addressId))}
                style={styles.iconButton}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Xóa địa chỉ"
              >
                <Feather name="trash-2" size={16} color={colors.error} />
              </Pressable>
            </View>
          ))
        ) : (
          <View style={styles.emptyAddressState}>
            <Text style={styles.helperText}>Bạn chưa có địa chỉ nào. Hãy thêm địa chỉ để nhận hàng thuận tiện hơn.</Text>
          </View>
        )}
        <View style={styles.addressListActions}>
          <AppButton title="Thêm mới" variant="outline" onPress={() => openAddressEditor()} />
        </View>
      </ModalShell>

      <ModalShell
        visible={isAddressEditorVisible}
        title={addressId ? 'Chỉnh sửa địa chỉ' : 'Tạo địa chỉ'}
        onClose={closeAddressEditor}
      >
        <ProvinceWardPicker
          provinceName={watchedProvince}
          wardName={watchedWard}
          onChangeProvince={handleSelectProvince}
          onChangeWard={handleSelectWard}
        />
        <FormInput control={addressForm.control} name="street" label="Số nhà, đường" />
        <View style={styles.rowActions}>
          <AppButton title="Đóng" variant="outline" onPress={closeAddressEditor} style={{ flex: 1 }} />
          <AppButton
            title={addressId ? 'Lưu địa chỉ' : 'Tạo địa chỉ'}
            onPress={onSaveAddress}
            isLoading={loading}
            disabled={!addressForm.formState.isValid}
            style={{ flex: 1 }}
          />
        </View>
      </ModalShell>

      <ModalShell visible={modal === 'verify'} title="Xác minh tài khoản" onClose={() => setModal(null)}>
        <Text style={styles.helperText}>Email: {verifyEmailAddress()}</Text>
        {/* TODO(phone-otp): tạm ẩn dòng SĐT — chưa có API SMS OTP. Bật lại khi có API (#1375). */}
        {/* <Text style={styles.helperText}>Điện thoại: {profile?.phone || phone}</Text> */}
        <FormInput control={verifyForm.control} name="otp" label="Mã OTP" keyboardType="number-pad" />
        <View style={styles.verifyActions}>
          <AppButton title="Gửi OTP email" variant="outline" onPress={resendEmailOtp} isLoading={loading} />
          <AppButton
            title="Xác minh email"
            onPress={onVerifyEmail}
            isLoading={loading}
            disabled={!verifyForm.formState.isValid}
          />
          {/* TODO(phone-otp): tạm tắt xác minh SĐT — chưa có API SMS OTP. Bật lại khi có API (#1375). */}
          {/* <AppButton title="Gửi OTP điện thoại" variant="outline" onPress={requestPhoneVerify} isLoading={loading} /> */}
          {/* <AppButton title="Xác minh điện thoại" onPress={verifyPhone} isLoading={loading} /> */}
        </View>
      </ModalShell>

      <ModalShell visible={modal === 'security'} title="Bảo mật và mật khẩu" onClose={closeSecurityModal}>
        {profile?.hasPassword ? (
          <>
            <Controller
              control={changePasswordForm.control}
              name="oldPassword"
              render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
                <PasswordInput
                  label="Mật khẩu cũ"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={error?.message}
                  isVisible={isOldPasswordVisible}
                  onToggleVisibility={() => setIsOldPasswordVisible((visible) => !visible)}
                />
              )}
            />
            <Controller
              control={changePasswordForm.control}
              name="newPassword"
              render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
                <PasswordInput
                  label="Mật khẩu mới"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={error?.message}
                  isVisible={isNewPasswordVisible}
                  onToggleVisibility={() => setIsNewPasswordVisible((visible) => !visible)}
                />
              )}
            />
            <Controller
              control={changePasswordForm.control}
              name="confirmNewPassword"
              render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
                <PasswordInput
                  label="Xác nhận mật khẩu mới"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={error?.message}
                  isVisible={isConfirmPasswordVisible}
                  onToggleVisibility={() => setIsConfirmPasswordVisible((visible) => !visible)}
                />
              )}
            />
          </>
        ) : (
          <>
            <Controller
              control={createPasswordForm.control}
              name="password"
              render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
                <PasswordInput
                  label="Tạo mật khẩu"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={error?.message}
                  isVisible={isPasswordVisible}
                  onToggleVisibility={() => setIsPasswordVisible((visible) => !visible)}
                />
              )}
            />
            <Controller
              control={createPasswordForm.control}
              name="confirmNewPassword"
              render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
                <PasswordInput
                  label="Xác nhận mật khẩu"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={error?.message}
                  isVisible={isConfirmPasswordVisible}
                  onToggleVisibility={() => setIsConfirmPasswordVisible((visible) => !visible)}
                />
              )}
            />
          </>
        )}
        <AppButton
          title={profile?.hasPassword ? 'Đổi mật khẩu' : 'Tạo mật khẩu'}
          onPress={profile?.hasPassword ? onChangePassword : onCreatePassword}
          isLoading={loading}
          disabled={profile?.hasPassword ? !changePasswordForm.formState.isValid : !createPasswordForm.formState.isValid}
        />
      </ModalShell>

      <ModalShell visible={modal === 'support'} title="Nhân viên hỗ trợ" onClose={() => setModal(null)}>
        <View style={styles.supportCard}>
          <Text style={styles.supportName}>{profile?.dedicatedStaff?.name || 'Hỗ trợ TixiMax'}</Text>
          <Text style={styles.supportLine}>{profile?.dedicatedStaff?.phone || 'Vui lòng liên hệ hotline TixiMax'}</Text>
          <Text style={styles.supportLine}>{profile?.dedicatedStaff?.staffCode || 'Chăm sóc khách hàng'}</Text>
        </View>
      </ModalShell>
      {pendingDeleteAddress ? (
        <Modal transparent animationType="fade" onRequestClose={cancelRemoveAddress}>
          <View style={styles.confirmBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={cancelRemoveAddress} />
            <View style={styles.confirmDialog}>
              <Text style={styles.confirmTitle}>Xác nhận xóa địa chỉ?</Text>
              <Text style={styles.confirmText}>
                {pendingDeleteAddress.addressName || [pendingDeleteAddress.streetAddress, pendingDeleteAddress.ward, pendingDeleteAddress.province].filter(Boolean).join(', ')}
              </Text>
              <View style={styles.confirmActions}>
                <AppButton title="Hủy" variant="outline" onPress={cancelRemoveAddress} style={{ flex: 1 }} />
                <AppButton title="Xóa địa chỉ" variant="danger" onPress={confirmRemoveAddress} isLoading={loading} style={{ flex: 1 }} />
              </View>
            </View>
            <Toast />
          </View>
        </Modal>
      ) : null}
      {isDeleteConfirmVisible ? (
        <Modal transparent animationType="fade" onRequestClose={() => setIsDeleteConfirmVisible(false)}>
          <View style={styles.confirmBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsDeleteConfirmVisible(false)} />
            <View style={styles.confirmDialog}>
              <Text style={styles.confirmTitle}>Xóa tài khoản?</Text>
              <Text style={styles.confirmText}>
                Thao tác này sẽ vô hiệu hóa tài khoản và ẩn danh toàn bộ thông tin cá nhân của bạn (tên, email, số điện thoại, địa chỉ) — không thể hoàn tác. Dữ liệu đơn hàng và thanh toán được giữ lại theo quy định pháp luật kế toán.
                {'\n\n'}
                Lưu ý: chỉ xóa được khi tất cả đơn hàng đã ở trạng thái Đã giao hoặc Đã hủy.
              </Text>
              <View style={styles.confirmActions}>
                <AppButton
                  title="Hủy"
                  variant="outline"
                  onPress={() => setIsDeleteConfirmVisible(false)}
                  disabled={isDeleting}
                  style={{ flex: 1 }}
                />
                <AppButton
                  title="Xóa tài khoản"
                  variant="danger"
                  onPress={confirmDeleteAccount}
                  isLoading={isDeleting}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
            <Toast />
          </View>
        </Modal>
      ) : null}
    </ScrollView>
  );
}

function PasswordInput({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  isVisible,
  onToggleVisibility,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
}) {
  return (
    <View style={styles.passwordField}>
      <Text style={styles.passwordLabel}>{label}</Text>
      <View style={[styles.passwordInputBox, error && styles.passwordInputBoxError]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          secureTextEntry={!isVisible}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.passwordInput}
          placeholderTextColor={colors.textMuted}
        />
        <Pressable
          onPress={onToggleVisibility}
          style={styles.passwordToggle}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={isVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          <Feather name={isVisible ? 'eye-off' : 'eye'} size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
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
  },
  versionText: {
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  helperText: {
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  passwordField: {
    marginBottom: spacing.md,
  },
  passwordLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  passwordInputBox: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
  },
  passwordInputBoxError: {
    borderColor: colors.error,
  },
  fieldError: {
    fontSize: typography.fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
    fontFamily: fontFamilyForWeight('500'),
  },
  passwordToggle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
  },
  addressItemDanger: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  addressName: {
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  addressLine: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAddressState: {
    paddingVertical: spacing.sm,
  },
  addressListActions: {
    marginTop: spacing.sm,
  },
  deleteConfirmCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error,
    gap: spacing.sm,
  },
  deleteConfirmTitle: {
    color: colors.error,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
  },
  deleteConfirmText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  deleteConfirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  confirmBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(20,20,20,0.35)',
    padding: spacing.lg,
  },
  confirmDialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  confirmTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSize.base,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
  },
  confirmText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  verifyActions: {
    gap: spacing.sm,
  },
  supportCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  supportName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  supportLine: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
});
