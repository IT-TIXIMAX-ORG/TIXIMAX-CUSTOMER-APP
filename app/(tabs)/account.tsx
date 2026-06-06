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

import { colors, typography, spacing, borderRadius, fontFamilyForWeight } from '@/src/theme/tokens';
import { useAuthUser, useAuthActions } from '@/src/features/auth/hooks/use-auth-store';
import { useCustomerProfile } from '@/src/features/customer-portal/shared/hooks/use-customer-profile';
import {
  addCustomerAddress,
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
import { formatCurrency } from '@/src/shared/lib/utils';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppInput } from '@/src/components/ui/AppInput';
import { ModalShell } from '@/src/components/ui/ModalShell';
import { SelectSheet } from '@/src/components/ui/SelectSheet';
import { QUERY_KEYS } from '@/src/shared/lib/query/query-keys';
import { useTabScreenBottomPadding } from '@/src/shared/lib/layout/safe-area';

type AccountModal = 'profile' | 'address' | 'security' | 'verify' | 'support' | null;

export default function AccountScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const contentPaddingBottom = useTabScreenBottomPadding(spacing.md);
  const user = useAuthUser();
  const { logout } = useAuthActions();
  const { data: profile, refetch } = useCustomerProfile();
  const [modal, setModal] = useState<AccountModal>(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [staffId, setStaffId] = useState('');
  const [staffOptions, setStaffOptions] = useState<ReferralStaffOption[]>([]);
  const [addressId, setAddressId] = useState('');
  const [province, setProvince] = useState('');
  const [ward, setWard] = useState('');
  const [street, setStreet] = useState('');
  const [isAddressEditorVisible, setIsAddressEditorVisible] = useState(false);
  const [pendingDeleteAddressId, setPendingDeleteAddressId] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isOldPasswordVisible, setIsOldPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  const displayName = profile?.name || user?.name || 'Khách hàng';
  const displayEmail = profile?.email || user?.email || '';
  const hasAssignedStaff = Boolean(profile?.dedicatedStaff);

  const refreshAccount = async () => {
    if (Platform.OS === 'web' || isRefreshing) return;

    try {
      setIsRefreshing(true);
      await refetch();
    } catch {
      // Keep the current profile visible when refresh fails.
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!profile || modal === 'profile') return;
    setName(profile.name || '');
    setEmail(profile.email || '');
    setPhone(profile.phone || '');
    setStaffId(profile.dedicatedStaff?.accountId || profile.dedicatedStaff?.staffId || '');
  }, [modal, profile]);

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

  const saveProfile = async () => {
    await runAction(async () => {
      await updateCustomerProfile({
        fullName: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        ...(staffId && !hasAssignedStaff ? { staffId } : {}),
      });
    }, 'Đã cập nhật thông tin');
  };

  const resetAddressForm = () => {
    setAddressId('');
    setProvince('');
    setWard('');
    setStreet('');
  };

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
    if (!id) {
      setPendingDeleteAddressId('');
      resetAddressForm();
      setIsAddressEditorVisible(true);
      return;
    }

    const address = profile?.addresses.find((item) => String(item.addressId) === id);
    if (!address) {
      setPendingDeleteAddressId('');
      resetAddressForm();
      setIsAddressEditorVisible(true);
      return;
    }

    setPendingDeleteAddressId('');
    setAddressId(String(address.addressId));
    setProvince(address.province || '');
    setWard(address.ward || '');
    setStreet(address.streetAddress || '');
    setIsAddressEditorVisible(true);
  };

  const saveAddress = async () => {
    const payload = {
      province: province.trim(),
      ward: ward.trim(),
      street: street.trim(),
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
  };

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

  // TODO(phone-otp): tạm tắt xác minh SĐT — chưa có API SMS OTP. Bật lại khi có API (#1375).
  // const requestPhoneVerify = async () => {
  //   if (!phone.trim()) {
  //     Toast.show({ type: 'error', text1: 'Vui lòng nhập số điện thoại' });
  //     return;
  //   }
  //   await runAction(async () => requestPhoneOtp(phone.trim()), 'Đã gửi mã OTP điện thoại');
  //   setModal('verify');
  // };

  // const verifyPhone = async () => {
  //   await runVerifyAction(async () => verifyPhoneOtp(otp.trim()), 'Đã xác minh điện thoại');
  // };

  const verifyEmail = async () => {
    await runVerifyAction(async () => verifyOtp(profile?.email || email, otp.trim()), 'Đã xác minh email');
  };

  const resendEmailOtp = async () => {
    await runAction(async () => resendOtp(profile?.email || email), 'Đã gửi lại OTP email');
    setModal('verify');
  };

  const resetPasswordForm = () => {
    setPassword('');
    setOldPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setIsPasswordVisible(false);
    setIsOldPasswordVisible(false);
    setIsNewPasswordVisible(false);
    setIsConfirmPasswordVisible(false);
  };

  const closeSecurityModal = () => {
    resetPasswordForm();
    setModal(null);
  };

  const savePassword = async () => {
    if (profile?.hasPassword) {
      if (!oldPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
        Toast.show({ type: 'error', text1: 'Vui lòng nhập đầy đủ mật khẩu' });
        return;
      }

      if (newPassword !== confirmNewPassword) {
        Toast.show({ type: 'error', text1: 'Xác nhận mật khẩu mới không khớp' });
        return;
      }

      await runAction(
        async () => changeCurrentPassword({
          oldPassword,
          newPassword,
          confirmNewPassword,
        }),
        'Đã đổi mật khẩu',
      );
    } else {
      if (!password.trim() || !confirmNewPassword.trim()) {
        Toast.show({ type: 'error', text1: 'Vui lòng nhập đầy đủ mật khẩu' });
        return;
      }

      if (password !== confirmNewPassword) {
        Toast.show({ type: 'error', text1: 'Xác nhận mật khẩu không khớp' });
        return;
      }

      await runAction(async () => createLocalPassword(password), 'Đã tạo mật khẩu');
    }
    resetPasswordForm();
  };

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
  const levelLabel = `Level ${currentLevel}`;
  // Checklist chỉ để hướng dẫn bước còn thiếu và thể hiện tiến độ thao tác của người dùng.
  const completedTaskCount = profileTasks.filter((task) => task.completed).length;
  const taskProgressPercent = Math.round((completedTaskCount / profileTasks.length) * 100);
  const nextTask = profileTasks.find((task) => !task.completed);
  const showProgressCard = currentLevel < 3;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}
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

      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{displayEmail}</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>Cấp độ {currentLevel}/3</Text>
          </View>
        </View>
      </View>

      {showProgressCard ? (
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View style={styles.progressContent}>
              <Text style={styles.progressTitle}>Tiến độ lên level 3</Text>
              <Text style={styles.progressSubtitle}>
                {completedTaskCount}/{profileTasks.length} nhiệm vụ hoàn thành • {levelLabel}
              </Text>
            </View>
            <Text style={styles.progressPercent}>{taskProgressPercent}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${taskProgressPercent}%` }]} />
          </View>
          <Text style={styles.progressHint}>
            {nextTask
              ? `Nhiệm vụ tiếp theo: ${nextTask.title}. Hệ thống sẽ tự cập nhật cấp độ khi bạn hoàn thành.`
              : 'Bạn đã hoàn thành các nhiệm vụ gợi ý. Hệ thống sẽ tự cập nhật cấp độ.'}
          </Text>
          <View style={styles.taskList}>
            {profileTasks.map((task) => (
              <Pressable
                key={task.key}
                style={[styles.taskItem, task.completed && styles.taskItemDone]}
                onPress={task.action}
              >
                <View style={[styles.taskIconWrap, task.completed && styles.taskIconWrapDone]}>
                  <Feather
                    name={task.completed ? 'check' : 'arrow-up-right'}
                    size={15}
                    color={task.completed ? colors.successText : colors.primaryDark}
                  />
                </View>
                <View style={styles.taskContent}>
                  <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]}>{task.title}</Text>
                  <Text style={styles.taskDetail}>{task.detail}</Text>
                </View>
                <Text style={[styles.taskStatus, task.completed && styles.taskStatusDone]}>
                  {task.completed ? 'Hoàn thành' : 'Thực hiện'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.walletCard}>
        <View style={styles.walletRow}>
          <View style={styles.walletIcon}>
            <Feather name="credit-card" size={20} color={colors.primaryDark} />
          </View>
          <View style={styles.walletInfo}>
            <Text style={styles.walletLabel}>Số dư khả dụng</Text>
            <Text style={styles.walletAmount}>{formatCurrency(profile?.balance ?? 0)}</Text>
          </View>
          <Pressable
            style={styles.depositBtn}
            onPress={() => Alert.alert('Nạp tiền', 'Vui lòng liên hệ nhân viên phụ trách để được hướng dẫn nạp tiền.')}
          >
            <Text style={styles.depositText}>Nạp tiền</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.menuContainer}>
        <MenuItem title="Thông tin cá nhân" icon="user" onPress={() => setModal('profile')} />
        <MenuItem title="Địa chỉ" icon="map-pin" onPress={openAddressList} />
        <MenuItem title="Xác minh tài khoản" icon="check-circle" onPress={() => setModal('verify')} />
        <MenuItem title="Bảo mật và mật khẩu" icon="shield" onPress={() => setModal('security')} />
        <MenuItem title="Nhân viên hỗ trợ" icon="help-circle" onPress={() => setModal('support')} isLast />
      </View>

      <Pressable
        style={[styles.logoutBtn, isLoggingOut && styles.logoutBtnDisabled]}
        onPress={handleLogoutNow}
        disabled={isLoggingOut}
        hitSlop={12}
      >
        <Feather name="log-out" size={18} color={colors.error} />
        <Text style={styles.logoutText}>{isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</Text>
      </Pressable>

      <ModalShell visible={modal === 'profile'} title="Thông tin cá nhân" onClose={() => setModal(null)}>
        <AppInput label="Họ tên" value={name} onChangeText={setName} />
        <AppInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <AppInput label="Số điện thoại" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        {!hasAssignedStaff ? (
          <SelectSheet label="Nhân viên giới thiệu" value={staffId} options={staffSelectOptions} onChange={setStaffId} />
        ) : (
          <Text style={styles.helperText}>Nhân viên phụ trách: {profile?.dedicatedStaff?.name}</Text>
        )}
        <AppButton title="Lưu thông tin" onPress={saveProfile} isLoading={loading} />
      </ModalShell>

      <ModalShell visible={modal === 'address'} title="Địa Chỉ" onClose={() => setModal(null)}>
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
              <Pressable onPress={() => openAddressEditor(String(address.addressId))} style={styles.iconButton} hitSlop={8}>
                <Feather name="edit-2" size={16} color={colors.primaryDark} />
              </Pressable>
              <Pressable onPress={() => promptRemoveAddress(String(address.addressId))} style={styles.iconButton} hitSlop={8}>
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
        <AppInput label="Tỉnh/Thành phố" value={province} onChangeText={setProvince} />
        <AppInput label="Phường/Xã" value={ward} onChangeText={setWard} />
        <AppInput label="Số nhà, đường" value={street} onChangeText={setStreet} />
        <View style={styles.rowActions}>
          <AppButton title="Đóng" variant="outline" onPress={closeAddressEditor} style={{ flex: 1 }} />
          <AppButton title={addressId ? 'Lưu địa chỉ' : 'Tạo địa chỉ'} onPress={saveAddress} isLoading={loading} style={{ flex: 1 }} />
        </View>
      </ModalShell>

      <ModalShell visible={modal === 'verify'} title="Xác minh tài khoản" onClose={() => setModal(null)}>
        <Text style={styles.helperText}>Email: {profile?.email || email}</Text>
        {/* TODO(phone-otp): tạm ẩn dòng SĐT — chưa có API SMS OTP. Bật lại khi có API (#1375). */}
        {/* <Text style={styles.helperText}>Điện thoại: {profile?.phone || phone}</Text> */}
        <AppInput label="Mã OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" />
        <View style={styles.verifyActions}>
          <AppButton title="Gửi OTP email" variant="outline" onPress={resendEmailOtp} isLoading={loading} />
          <AppButton title="Xác minh email" onPress={verifyEmail} isLoading={loading} />
          {/* TODO(phone-otp): tạm tắt xác minh SĐT — chưa có API SMS OTP. Bật lại khi có API (#1375). */}
          {/* <AppButton title="Gửi OTP điện thoại" variant="outline" onPress={requestPhoneVerify} isLoading={loading} /> */}
          {/* <AppButton title="Xác minh điện thoại" onPress={verifyPhone} isLoading={loading} /> */}
        </View>
      </ModalShell>

      <ModalShell visible={modal === 'security'} title="Bảo mật và mật khẩu" onClose={closeSecurityModal}>
        {profile?.hasPassword ? (
          <>
            <PasswordInput
              label="Mật khẩu cũ"
              value={oldPassword}
              onChangeText={setOldPassword}
              isVisible={isOldPasswordVisible}
              onToggleVisibility={() => setIsOldPasswordVisible((visible) => !visible)}
            />
            <PasswordInput
              label="Mật khẩu mới"
              value={newPassword}
              onChangeText={setNewPassword}
              isVisible={isNewPasswordVisible}
              onToggleVisibility={() => setIsNewPasswordVisible((visible) => !visible)}
            />
            <PasswordInput
              label="Xác nhận mật khẩu mới"
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              isVisible={isConfirmPasswordVisible}
              onToggleVisibility={() => setIsConfirmPasswordVisible((visible) => !visible)}
            />
          </>
        ) : (
          <>
            <PasswordInput
              label="Tạo mật khẩu"
              value={password}
              onChangeText={setPassword}
              isVisible={isPasswordVisible}
              onToggleVisibility={() => setIsPasswordVisible((visible) => !visible)}
            />
            <PasswordInput
              label="Xác nhận mật khẩu"
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              isVisible={isConfirmPasswordVisible}
              onToggleVisibility={() => setIsConfirmPasswordVisible((visible) => !visible)}
            />
          </>
        )}
        <AppButton title={profile?.hasPassword ? 'Đổi mật khẩu' : 'Tạo mật khẩu'} onPress={savePassword} isLoading={loading} />
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
    </ScrollView>
  );
}

function MenuItem({
  title,
  icon,
  onPress,
  isLast = false,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable style={[styles.menuItem, !isLast && styles.menuItemBorder]} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <View style={styles.menuIconBg}>
          <Feather name={icon} size={18} color={colors.textSecondary} />
        </View>
        <Text style={styles.menuTitle}>{title}</Text>
      </View>
      <Feather name="chevron-right" size={20} color={colors.border} />
    </Pressable>
  );
}

function PasswordInput({
  label,
  value,
  onChangeText,
  isVisible,
  onToggleVisibility,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}) {
  return (
    <View style={styles.passwordField}>
      <Text style={styles.passwordLabel}>{label}</Text>
      <View style={styles.passwordInputBox}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
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
    paddingTop: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: typography.fontSize.xl,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.black,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: typography.fontSize.md,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  levelBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  levelText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.primaryDark,
    textTransform: 'uppercase',
  },
  progressCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  progressContent: {
    flex: 1,
  },
  progressTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  progressSubtitle: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
  },
  progressPercent: {
    fontSize: typography.fontSize.lg,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.primaryDark,
  },
  progressTrack: {
    height: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  progressHint: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    lineHeight: 20,
  },
  taskList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  taskItemDone: {
    backgroundColor: colors.successLight,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  taskIconWrap: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskIconWrapDone: {
    backgroundColor: colors.white,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    fontSize: typography.fontSize.sm,
  },
  taskTitleDone: {
    color: colors.successText,
  },
  taskDetail: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    lineHeight: 16,
  },
  taskStatus: {
    color: colors.primaryDark,
    fontSize: typography.fontSize.xs,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    textTransform: 'uppercase',
  },
  taskStatusDone: {
    color: colors.successText,
  },
  walletCard: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  walletInfo: {
    flex: 1,
  },
  walletLabel: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  walletAmount: {
    fontSize: typography.fontSize.md,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  depositBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  depositText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.black,
    textTransform: 'uppercase',
  },
  menuContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconBg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuTitle: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.textPrimary,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius['2xl'],
    gap: spacing.sm,
  },
  logoutBtnDisabled: {
    opacity: 0.65,
  },
  logoutText: {
    color: colors.error,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
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
