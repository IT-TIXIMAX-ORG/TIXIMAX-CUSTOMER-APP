import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import Toast from 'react-native-toast-message';
import * as WebBrowser from 'expo-web-browser';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { useAuthStore } from '@/src/features/auth/stores/auth.store';
import {
  getReferralSaleStaff,
  resetPasswordWithOtp,
  sendForgotPasswordOtp,
} from '@/src/features/auth/services/auth.service';
import {
  registerCustomer,
  requestOtp,
  verifyOtp,
} from '@/src/features/customer-portal/shared/services/customer-portal.service';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppInput } from '@/src/components/ui/AppInput';
import { ModalShell } from '@/src/components/ui/ModalShell';
import { SelectSheet } from '@/src/components/ui/SelectSheet';
import { colors, spacing, borderRadius, typography, fontFamilyForWeight } from '@/src/theme/tokens';
import type { ReferralStaffOption } from '@/src/features/customer-portal/shared/types/master-data.types';
import { ENV_CONFIG } from '@/src/shared/constants/env.constants';

const ACCOUNT_NOT_VERIFIED_CODE = 1009;
const GOOGLE_REDIRECT_URL = 'tiximaxcustomerapp://auth/google-callback';
const GOOGLE_LOGIN_DISABLED = true;

WebBrowser.maybeCompleteAuthSession();

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

const readUrlParam = (url: string, key: string) => {
  try {
    return new URL(url).searchParams.get(key);
  } catch {
    const query = url.split('?')[1]?.split('#')[0] ?? '';
    return new URLSearchParams(query).get(key);
  }
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isRegisterVisible, setIsRegisterVisible] = useState(false);
  const [isVerifyVisible, setIsVerifyVisible] = useState(false);
  const [isForgotPasswordEmailVisible, setIsForgotPasswordEmailVisible] = useState(false);
  const [isForgotPasswordOtpVisible, setIsForgotPasswordOtpVisible] = useState(false);
  const [isForgotPasswordResetVisible, setIsForgotPasswordResetVisible] = useState(false);

  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('');
  const [registerStaffId, setRegisterStaffId] = useState('');
  const [registerStaffOptions, setRegisterStaffOptions] = useState<ReferralStaffOption[]>([]);

  const [verifyEmailValue, setVerifyEmailValue] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordOtp, setForgotPasswordOtp] = useState('');
  const [forgotPasswordNewPassword, setForgotPasswordNewPassword] = useState('');
  const [forgotPasswordConfirmPassword, setForgotPasswordConfirmPassword] = useState('');

  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [isVerifyLoading, setIsVerifyLoading] = useState(false);
  const [isRequestOtpLoading, setIsRequestOtpLoading] = useState(false);
  const [isForgotPasswordSendOtpLoading, setIsForgotPasswordSendOtpLoading] = useState(false);
  const [isForgotPasswordResetLoading, setIsForgotPasswordResetLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isRegisterStaffLoading, setIsRegisterStaffLoading] = useState(false);
  const [registerStaffError, setRegisterStaffError] = useState('');

  const login = useAuthStore((s) => s.login);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const isLoading = useAuthStore((s) => s.isLoading);

  const loadRegisterStaff = useCallback(async () => {
    try {
      setIsRegisterStaffLoading(true);
      setRegisterStaffError('');
      const staff = await getReferralSaleStaff();
      setRegisterStaffOptions(staff);

      if (!staff.length) {
        setRegisterStaffError('Không có nhân viên giới thiệu');
      }
    } catch (error: any) {
      setRegisterStaffOptions([]);
      setRegisterStaffError(getErrorMessage(error, 'Không tải được danh sách nhân viên'));
    } finally {
      setIsRegisterStaffLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isRegisterVisible) return;

    void loadRegisterStaff();
  }, [isRegisterVisible, loadRegisterStaff]);

  const resetRegisterForm = () => {
    setRegisterName('');
    setRegisterEmail('');
    setRegisterPhone('');
    setRegisterPassword('');
    setRegisterPasswordConfirm('');
    setRegisterStaffId('');
    setRegisterStaffError('');
  };

  const resetForgotPasswordForm = () => {
    setForgotPasswordEmail('');
    setForgotPasswordOtp('');
    setForgotPasswordNewPassword('');
    setForgotPasswordConfirmPassword('');
  };

  const closeRegisterModal = () => {
    setIsRegisterVisible(false);
    resetRegisterForm();
  };

  const openVerifyModal = (nextEmail?: string) => {
    const resolvedEmail = normalizeEmail(nextEmail || email || registerEmail || verifyEmailValue);
    setVerifyEmailValue(resolvedEmail);
    setOtpCode('');
    setIsVerifyVisible(true);
  };

  const closeVerifyModal = () => {
    setIsVerifyVisible(false);
    setOtpCode('');
  };

  const openForgotPasswordEmailModal = () => {
    setForgotPasswordEmail(normalizeEmail(email || forgotPasswordEmail));
    setForgotPasswordOtp('');
    setForgotPasswordNewPassword('');
    setForgotPasswordConfirmPassword('');
    setIsForgotPasswordEmailVisible(true);
  };

  const closeForgotPasswordFlow = () => {
    setIsForgotPasswordEmailVisible(false);
    setIsForgotPasswordOtpVisible(false);
    setIsForgotPasswordResetVisible(false);
    resetForgotPasswordForm();
  };

  const registerStaffSelectOptions = [
    { label: 'Không chọn', value: '' },
    ...registerStaffOptions.map((staff) => ({
      value: staff.accountId,
      label: `${staff.name}${staff.staffCode ? ` (${staff.staffCode})` : ''}`,
      description: staff.phone,
    })),
  ];
  const registerStaffStatusText = isRegisterStaffLoading
    ? 'Đang tải danh sách nhân viên...'
    : registerStaffError;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Toast.show({ type: 'error', text1: 'Vui lòng nhập email và mật khẩu' });
      return;
    }

    try {
      await login(normalizeEmail(email), password);
    } catch (error: any) {
      const errorCode = error?.response?.data?.code;
      const message = getErrorMessage(error, 'Đăng nhập thất bại');

      if (errorCode === ACCOUNT_NOT_VERIFIED_CODE) {
        setEmail(normalizeEmail(email));
        openVerifyModal(email);
      }

      Toast.show({ type: 'error', text1: 'Lỗi đăng nhập', text2: message });
    }
  };

  const handleGoogleLogin = async () => {
    if (GOOGLE_LOGIN_DISABLED) return;

    try {
      setIsGoogleLoading(true);
      const startUrl = `${ENV_CONFIG.apiBaseUrl.replace(/\/$/, '')}/auth/google`;
      const result = await WebBrowser.openAuthSessionAsync(startUrl, GOOGLE_REDIRECT_URL);

      if (result.type !== 'success') {
        Toast.show({ type: 'info', text1: 'Đăng nhập Google đã bị hủy' });
        return;
      }

      const error = readUrlParam(result.url, 'error');
      if (error) {
        Toast.show({
          type: 'error',
          text1: 'Đăng nhập Google thất bại',
          text2: error === 'oauth_cancelled'
            ? 'Bạn đã hủy đăng nhập Google.'
            : 'Vui lòng thử lại sau.',
        });
        return;
      }

      const accessToken = readUrlParam(result.url, 'accessToken');
      const refreshToken = readUrlParam(result.url, 'refreshToken');

      if (!accessToken || !refreshToken) {
        Toast.show({
          type: 'error',
          text1: 'Đăng nhập Google thất bại',
          text2: 'Không nhận được token đăng nhập từ máy chủ.',
        });
        return;
      }

      await loginWithGoogle({ accessToken, refreshToken });
      Toast.show({ type: 'success', text1: 'Đăng nhập Google thành công' });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Đăng nhập Google thất bại',
        text2: getErrorMessage(error, 'Không thể đăng nhập bằng Google'),
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerName.trim()) {
      Toast.show({ type: 'error', text1: 'Vui lòng nhập họ tên' });
      return;
    }

    if (!registerEmail.trim()) {
      Toast.show({ type: 'error', text1: 'Vui lòng nhập email' });
      return;
    }

    if (!registerPhone.trim()) {
      Toast.show({ type: 'error', text1: 'Vui lòng nhập số điện thoại' });
      return;
    }

    if (registerPassword.trim().length < 6) {
      Toast.show({ type: 'error', text1: 'Mật khẩu phải có ít nhất 6 ký tự' });
      return;
    }

    if (registerPassword !== registerPasswordConfirm) {
      Toast.show({ type: 'error', text1: 'Mật khẩu xác nhận không khớp' });
      return;
    }

    try {
      setIsRegisterLoading(true);
      const normalizedRegisterEmail = normalizeEmail(registerEmail);
      await registerCustomer({
        fullName: registerName.trim(),
        email: normalizedRegisterEmail,
        phone: registerPhone.trim(),
        password: registerPassword,
        locale: 'vi',
        ...(registerStaffId ? { staffId: registerStaffId } : {}),
      });
      setEmail(normalizedRegisterEmail);
      setPassword('');
      setIsRegisterVisible(false);
      resetRegisterForm();
      openVerifyModal(normalizedRegisterEmail);
      Toast.show({
        type: 'success',
        text1: 'Đăng ký thành công',
        text2: 'Mã OTP đã được gửi tới email của bạn.',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Đăng ký thất bại',
        text2: getErrorMessage(error, 'Không thể đăng ký tài khoản'),
      });
    } finally {
      setIsRegisterLoading(false);
    }
  };

  const handleRequestVerifyOtp = async () => {
    const resolvedEmail = normalizeEmail(verifyEmailValue || email);

    if (!resolvedEmail) {
      Toast.show({ type: 'error', text1: 'Vui lòng nhập email để nhận OTP' });
      return;
    }

    try {
      setIsRequestOtpLoading(true);
      await requestOtp(resolvedEmail);
      setVerifyEmailValue(resolvedEmail);
      Toast.show({
        type: 'success',
        text1: 'Đã gửi OTP',
        text2: 'Vui lòng kiểm tra email để lấy mã xác thực.',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Không thể gửi OTP',
        text2: getErrorMessage(error, 'Gửi OTP thất bại'),
      });
    } finally {
      setIsRequestOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const resolvedEmail = normalizeEmail(verifyEmailValue || email);

    if (!resolvedEmail) {
      Toast.show({ type: 'error', text1: 'Vui lòng nhập email xác thực' });
      return;
    }

    if (otpCode.trim().length !== 6) {
      Toast.show({ type: 'error', text1: 'Mã OTP phải gồm 6 ký tự' });
      return;
    }

    try {
      setIsVerifyLoading(true);
      await verifyOtp(resolvedEmail, otpCode.trim());
      setEmail(resolvedEmail);
      closeVerifyModal();
      Toast.show({
        type: 'success',
        text1: 'Xác thực thành công',
        text2: 'Bạn có thể đăng nhập bằng tài khoản vừa tạo.',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Xác thực thất bại',
        text2: getErrorMessage(error, 'Mã OTP không hợp lệ hoặc đã hết hạn'),
      });
    } finally {
      setIsVerifyLoading(false);
    }
  };

  const handleForgotPasswordSendOtp = async () => {
    const resolvedEmail = normalizeEmail(forgotPasswordEmail);

    if (!resolvedEmail) {
      Toast.show({ type: 'error', text1: 'Vui lòng nhập email để nhận mã OTP' });
      return;
    }

    try {
      setIsForgotPasswordSendOtpLoading(true);
      await sendForgotPasswordOtp(resolvedEmail, 'vi');
      setForgotPasswordEmail(resolvedEmail);
      setIsForgotPasswordEmailVisible(false);
      setIsForgotPasswordOtpVisible(true);
      setTimeout(() => {
        Toast.show({
          type: 'success',
          text1: 'Đã gửi mã OTP',
          text2: 'Vui lòng kiểm tra email để tiếp tục đặt lại mật khẩu.',
        });
      }, 0);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Không thể gửi mã OTP',
        text2: getErrorMessage(error, 'Gửi OTP thất bại'),
      });
    } finally {
      setIsForgotPasswordSendOtpLoading(false);
    }
  };

  const handleForgotPasswordContinue = () => {
    if (forgotPasswordOtp.trim().length !== 6) {
      Toast.show({ type: 'error', text1: 'Mã OTP phải gồm 6 ký tự' });
      return;
    }

    setIsForgotPasswordOtpVisible(false);
    setIsForgotPasswordResetVisible(true);
  };

  const handleForgotPasswordReset = async () => {
    const resolvedEmail = normalizeEmail(forgotPasswordEmail);

    if (!resolvedEmail) {
      Toast.show({ type: 'error', text1: 'Thiếu email khôi phục mật khẩu' });
      return;
    }

    if (forgotPasswordOtp.trim().length !== 6) {
      Toast.show({ type: 'error', text1: 'Mã OTP phải gồm 6 ký tự' });
      return;
    }

    if (forgotPasswordNewPassword.trim().length < 6) {
      Toast.show({ type: 'error', text1: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
      return;
    }

    if (forgotPasswordNewPassword !== forgotPasswordConfirmPassword) {
      Toast.show({ type: 'error', text1: 'Xác nhận mật khẩu không khớp' });
      return;
    }

    try {
      setIsForgotPasswordResetLoading(true);
      await resetPasswordWithOtp(
        resolvedEmail,
        forgotPasswordOtp.trim(),
        forgotPasswordNewPassword,
      );
      setEmail(resolvedEmail);
      setPassword('');
      closeForgotPasswordFlow();
      Toast.show({
        type: 'success',
        text1: 'Đặt lại mật khẩu thành công',
        text2: 'Bạn có thể đăng nhập bằng mật khẩu mới.',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Đặt lại mật khẩu thất bại',
        text2: getErrorMessage(error, 'Không thể đặt lại mật khẩu'),
      });
    } finally {
      setIsForgotPasswordResetLoading(false);
    }
  };

  return (
    <>
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        bottomOffset={spacing.md}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/app-icons/TIXIMAX-icon.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandName}>TIXIMAX</Text>
            <Text style={styles.subtitle}>Customer Portal</Text>
        </View>

        <View style={styles.formCard}>
            <Text style={styles.formTitle}>Đăng nhập</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="email@example.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu</Text>
              <TextInput
                style={styles.input}
                placeholder="********"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isLoading}
                onSubmitEditing={handleLogin}
              />
            </View>

            <Pressable
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.black} />
              ) : (
                <Text style={styles.loginButtonText}>Đăng nhập</Text>
              )}
            </Pressable>

            {!GOOGLE_LOGIN_DISABLED ? (
              <>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Hoặc</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Pressable
                  style={[
                    styles.googleButton,
                    (isLoading || isGoogleLoading) && styles.googleButtonDisabled,
                  ]}
                  onPress={handleGoogleLogin}
                  disabled={isLoading || isGoogleLoading}
                >
                  {isGoogleLoading ? (
                    <ActivityIndicator color={colors.textSecondary} />
                  ) : (
                    <Text style={styles.googleButtonText}>Đăng nhập bằng Google</Text>
                  )}
                </Pressable>
              </>
            ) : null}

            <Pressable style={styles.registerCta} onPress={() => setIsRegisterVisible(true)}>
              <Text style={styles.registerCtaText}>Đăng ký</Text>
            </Pressable>

            <Pressable style={styles.secondaryLink} onPress={openForgotPasswordEmailModal}>
              <Text style={styles.secondaryLinkText}>Quên mật khẩu</Text>
            </Pressable>
        </View>

        <Text style={styles.footer}>© 2026 TixiMax. All rights reserved.</Text>
      </KeyboardAwareScrollView>

      <ModalShell
        visible={isRegisterVisible}
        title="Đăng ký"
        onClose={closeRegisterModal}
        keyboardContentMaxHeight={228}
      >
        <AppInput label="Họ tên" value={registerName} onChangeText={setRegisterName} />
        <AppInput
          label="Email"
          value={registerEmail}
          onChangeText={setRegisterEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <AppInput
          label="Số điện thoại"
          value={registerPhone}
          onChangeText={setRegisterPhone}
          keyboardType="phone-pad"
        />
        <AppInput
          label="Mật khẩu"
          value={registerPassword}
          onChangeText={setRegisterPassword}
          secureTextEntry
        />
        <AppInput
          label="Nhập lại mật khẩu"
          value={registerPasswordConfirm}
          onChangeText={setRegisterPasswordConfirm}
          secureTextEntry
        />
        <SelectSheet
          label="Nhân viên giới thiệu"
          value={registerStaffId}
          options={registerStaffSelectOptions}
          onChange={setRegisterStaffId}
          onOpen={() => {
            if (!isRegisterStaffLoading && !registerStaffOptions.length) {
              void loadRegisterStaff();
            }
          }}
          statusText={registerStaffStatusText}
          statusTone={registerStaffError && !isRegisterStaffLoading ? 'error' : 'muted'}
        />
        <View style={styles.modalActions}>
          <AppButton title="Đóng" variant="outline" onPress={closeRegisterModal} style={{ flex: 1 }} />
          <AppButton title="Đăng ký" onPress={handleRegister} isLoading={isRegisterLoading} style={{ flex: 1 }} />
        </View>
      </ModalShell>

      <ModalShell visible={isVerifyVisible} title="Xác thực OTP" onClose={closeVerifyModal}>
        <AppInput
          label="Email"
          value={verifyEmailValue}
          onChangeText={setVerifyEmailValue}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <AppInput
          label="Mã OTP"
          value={otpCode}
          onChangeText={setOtpCode}
          keyboardType="number-pad"
          autoCapitalize="none"
        />
        <View style={styles.otpActions}>
          <AppButton
            title="Gửi OTP"
            variant="outline"
            onPress={handleRequestVerifyOtp}
            isLoading={isRequestOtpLoading}
          />
          <AppButton title="Xác thực" onPress={handleVerifyOtp} isLoading={isVerifyLoading} />
        </View>
      </ModalShell>

      <ModalShell
        visible={isForgotPasswordEmailVisible}
        title="Quên mật khẩu"
        onClose={closeForgotPasswordFlow}
      >
        <Text style={styles.modalHelperText}>
          Nhập email của bạn để nhận mã OTP đặt lại mật khẩu.
        </Text>
        <AppInput
          label="Email"
          value={forgotPasswordEmail}
          onChangeText={setForgotPasswordEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <AppButton
          title="Gửi mã OTP"
          onPress={handleForgotPasswordSendOtp}
          isLoading={isForgotPasswordSendOtpLoading}
        />
      </ModalShell>

      <ModalShell
        visible={isForgotPasswordOtpVisible}
        title="Nhập mã OTP"
        onClose={closeForgotPasswordFlow}
      >
        <Text style={styles.modalHelperText}>
          Nhập mã OTP đã được gửi tới email {forgotPasswordEmail || 'của bạn'}.
        </Text>
        <AppInput
          label="Mã OTP"
          value={forgotPasswordOtp}
          onChangeText={setForgotPasswordOtp}
          keyboardType="number-pad"
          autoCapitalize="none"
        />
        <AppButton title="Tiếp tục" onPress={handleForgotPasswordContinue} />
      </ModalShell>

      <ModalShell
        visible={isForgotPasswordResetVisible}
        title="Đặt lại mật khẩu"
        onClose={closeForgotPasswordFlow}
      >
        <Text style={styles.modalHelperText}>
          Tạo mật khẩu mới cho tài khoản {forgotPasswordEmail || 'của bạn'}.
        </Text>
        <AppInput
          label="Mật khẩu mới"
          value={forgotPasswordNewPassword}
          onChangeText={setForgotPasswordNewPassword}
          secureTextEntry
        />
        <AppInput
          label="Xác nhận mật khẩu"
          value={forgotPasswordConfirmPassword}
          onChangeText={setForgotPasswordConfirmPassword}
          secureTextEntry
        />
        <AppButton
          title="Đặt lại mật khẩu"
          onPress={handleForgotPasswordReset}
          isLoading={isForgotPasswordResetLoading}
        />
      </ModalShell>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['3xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: colors.borderLight,
  },
  formTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.base,
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  input: {
    height: 48,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.base,
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  loginButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.black,
    textTransform: 'uppercase',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: typography.fontSize.xs,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  googleButton: {
    height: 48,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    color: colors.textSecondary,
  },
  registerCta: {
    minHeight: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  registerCtaText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    fontFamily: fontFamilyForWeight('900'),
    color: colors.primaryDark,
    textTransform: 'uppercase',
  },
  secondaryLink: {
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  secondaryLinkText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    fontFamily: fontFamilyForWeight('800'),
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  otpActions: {
    gap: spacing.sm,
  },
  modalHelperText: {
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontWeight: '700',
    fontFamily: fontFamilyForWeight('700'),
    lineHeight: 20,
  },
  footer: {
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    fontFamily: fontFamilyForWeight('600'),
    color: colors.textMuted,
    marginTop: spacing['2xl'],
  },
});
