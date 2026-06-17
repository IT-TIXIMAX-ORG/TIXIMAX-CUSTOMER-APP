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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

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
import { ModalShell } from '@/src/components/ui/ModalShell';
import { SelectSheet } from '@/src/components/ui/SelectSheet';
import { FormInput } from '@/src/components/form/FormInput';
import { colors, spacing, borderRadius, typography, fontFamilyForWeight } from '@/src/theme/tokens';
import { getAppVersionLabel } from '@/src/shared/lib/app-version';
import type { ReferralStaffOption } from '@/src/features/customer-portal/shared/types/master-data.types';
import { ENV_CONFIG } from '@/src/shared/constants/env.constants';
import {
  loginSchema,
  type LoginForm,
  registerSchema,
  type RegisterForm,
  otpVerifySchema,
  type OtpVerifyForm,
  forgotEmailSchema,
  type ForgotEmailForm,
  forgotOtpSchema,
  type ForgotOtpForm,
  forgotResetSchema,
  type ForgotResetForm,
} from '@/src/features/auth/schemas/auth.schemas';

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
  // Hiển thị modal
  const [isRegisterVisible, setIsRegisterVisible] = useState(false);
  const [isVerifyVisible, setIsVerifyVisible] = useState(false);
  const [isForgotPasswordEmailVisible, setIsForgotPasswordEmailVisible] = useState(false);
  const [isForgotPasswordOtpVisible, setIsForgotPasswordOtpVisible] = useState(false);
  const [isForgotPasswordResetVisible, setIsForgotPasswordResetVisible] = useState(false);

  // Carry-over giữa 3 bước quên mật khẩu (email + otp từ bước trước)
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');

  // Nhân viên giới thiệu — trạng thái async, không phải lỗi validation
  const [registerStaffOptions, setRegisterStaffOptions] = useState<ReferralStaffOption[]>([]);
  const [isRegisterStaffLoading, setIsRegisterStaffLoading] = useState(false);
  const [registerStaffError, setRegisterStaffError] = useState('');

  // Loading cho các submit gọi API trực tiếp
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [isVerifyLoading, setIsVerifyLoading] = useState(false);
  const [isRequestOtpLoading, setIsRequestOtpLoading] = useState(false);
  const [isForgotPasswordSendOtpLoading, setIsForgotPasswordSendOtpLoading] = useState(false);
  const [isForgotPasswordResetLoading, setIsForgotPasswordResetLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const login = useAuthStore((s) => s.login);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const isLoading = useAuthStore((s) => s.isLoading);

  // ===== Forms (react-hook-form + Zod) =====
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  });
  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      passwordConfirm: '',
      staffId: '',
    },
  });
  const verifyForm = useForm<OtpVerifyForm>({
    resolver: zodResolver(otpVerifySchema),
    mode: 'onChange',
    defaultValues: { email: '', otp: '' },
  });
  const forgotEmailForm = useForm<ForgotEmailForm>({
    resolver: zodResolver(forgotEmailSchema),
    mode: 'onChange',
    defaultValues: { email: '' },
  });
  const forgotOtpForm = useForm<ForgotOtpForm>({
    resolver: zodResolver(forgotOtpSchema),
    mode: 'onChange',
    defaultValues: { otp: '' },
  });
  const forgotResetForm = useForm<ForgotResetForm>({
    resolver: zodResolver(forgotResetSchema),
    mode: 'onChange',
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

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

  const closeRegisterModal = () => {
    setIsRegisterVisible(false);
    registerForm.reset();
    setRegisterStaffError('');
  };

  const openVerifyModal = (nextEmail?: string) => {
    const resolvedEmail = normalizeEmail(
      nextEmail ||
        loginForm.getValues('email') ||
        registerForm.getValues('email') ||
        verifyForm.getValues('email'),
    );
    verifyForm.reset({ email: resolvedEmail, otp: '' });
    setIsVerifyVisible(true);
  };

  const closeVerifyModal = () => {
    setIsVerifyVisible(false);
    verifyForm.setValue('otp', '');
  };

  const openForgotPasswordEmailModal = () => {
    const prefill = normalizeEmail(loginForm.getValues('email') || forgotEmail);
    forgotEmailForm.reset({ email: prefill });
    forgotOtpForm.reset({ otp: '' });
    forgotResetForm.reset({ newPassword: '', confirmPassword: '' });
    setForgotEmail(prefill);
    setForgotOtp('');
    setIsForgotPasswordEmailVisible(true);
  };

  const closeForgotPasswordFlow = () => {
    setIsForgotPasswordEmailVisible(false);
    setIsForgotPasswordOtpVisible(false);
    setIsForgotPasswordResetVisible(false);
    forgotEmailForm.reset({ email: '' });
    forgotOtpForm.reset({ otp: '' });
    forgotResetForm.reset({ newPassword: '', confirmPassword: '' });
    setForgotEmail('');
    setForgotOtp('');
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

  const onLogin = loginForm.handleSubmit(async (values) => {
    const normalizedEmail = normalizeEmail(values.email);
    try {
      await login(normalizedEmail, values.password);
    } catch (error: any) {
      const errorCode = error?.response?.data?.code;
      const message = getErrorMessage(error, 'Đăng nhập thất bại');

      if (errorCode === ACCOUNT_NOT_VERIFIED_CODE) {
        loginForm.setValue('email', normalizedEmail);
        openVerifyModal(normalizedEmail);
      }

      Toast.show({ type: 'error', text1: 'Lỗi đăng nhập', text2: message });
    }
  });

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

  const onRegister = registerForm.handleSubmit(async (values) => {
    try {
      setIsRegisterLoading(true);
      const normalizedRegisterEmail = normalizeEmail(values.email);
      await registerCustomer({
        fullName: values.fullName,
        email: normalizedRegisterEmail,
        phone: values.phone,
        password: values.password,
        locale: 'vi',
        ...(values.staffId ? { staffId: values.staffId } : {}),
      });
      loginForm.setValue('email', normalizedRegisterEmail);
      loginForm.setValue('password', '');
      setIsRegisterVisible(false);
      registerForm.reset();
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
  });

  const handleRequestVerifyOtp = async () => {
    const resolvedEmail = normalizeEmail(verifyForm.getValues('email'));

    if (!resolvedEmail) {
      verifyForm.setError('email', { message: 'Vui lòng nhập email để nhận OTP' });
      return;
    }

    try {
      setIsRequestOtpLoading(true);
      await requestOtp(resolvedEmail);
      verifyForm.setValue('email', resolvedEmail);
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

  const onVerifyOtp = verifyForm.handleSubmit(async (values) => {
    const resolvedEmail = normalizeEmail(values.email);
    try {
      setIsVerifyLoading(true);
      await verifyOtp(resolvedEmail, values.otp);
      loginForm.setValue('email', resolvedEmail);
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
  });

  const onForgotPasswordSendOtp = forgotEmailForm.handleSubmit(async (values) => {
    const resolvedEmail = normalizeEmail(values.email);
    try {
      setIsForgotPasswordSendOtpLoading(true);
      await sendForgotPasswordOtp(resolvedEmail, 'vi');
      setForgotEmail(resolvedEmail);
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
  });

  const onForgotPasswordContinue = forgotOtpForm.handleSubmit((values) => {
    setForgotOtp(values.otp);
    setIsForgotPasswordOtpVisible(false);
    setIsForgotPasswordResetVisible(true);
  });

  const onForgotPasswordReset = forgotResetForm.handleSubmit(async (values) => {
    const resolvedEmail = normalizeEmail(forgotEmail);

    if (!resolvedEmail || forgotOtp.trim().length !== 6) {
      Toast.show({
        type: 'error',
        text1: 'Thiếu thông tin khôi phục',
        text2: 'Vui lòng thực hiện lại từ bước nhập email.',
      });
      closeForgotPasswordFlow();
      return;
    }

    try {
      setIsForgotPasswordResetLoading(true);
      await resetPasswordWithOtp(resolvedEmail, forgotOtp.trim(), values.newPassword);
      loginForm.setValue('email', resolvedEmail);
      loginForm.setValue('password', '');
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
  });

  const isLoginDisabled = isLoading || !loginForm.formState.isValid;

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
                source={require('../../assets/images/logo-tiximax.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.subtitle}>Customer Portal</Text>
        </View>

        <View style={styles.formCard}>
            <Text style={styles.formTitle}>Đăng nhập</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <Controller
                control={loginForm.control}
                name="email"
                render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
                  <>
                    <TextInput
                      style={[styles.input, error && styles.inputError]}
                      placeholder="email@example.com"
                      placeholderTextColor={colors.textMuted}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                    />
                    {error ? <Text style={styles.fieldError}>{error.message}</Text> : null}
                  </>
                )}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu</Text>
              <Controller
                control={loginForm.control}
                name="password"
                render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
                  <>
                    <TextInput
                      style={[styles.input, error && styles.inputError]}
                      placeholder="********"
                      placeholderTextColor={colors.textMuted}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry
                      editable={!isLoading}
                      onSubmitEditing={onLogin}
                    />
                    {error ? <Text style={styles.fieldError}>{error.message}</Text> : null}
                  </>
                )}
              />
            </View>

            <Pressable
              style={[styles.loginButton, isLoginDisabled && styles.loginButtonDisabled]}
              onPress={onLogin}
              disabled={isLoginDisabled}
              accessibilityRole="button"
              accessibilityLabel="Đăng nhập"
              accessibilityState={{ disabled: isLoginDisabled, busy: isLoading }}
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

            <Pressable
              style={styles.registerCta}
              accessibilityRole="button"
              accessibilityLabel="Đăng ký tài khoản mới"
              onPress={() => setIsRegisterVisible(true)}
            >
              <Text style={styles.registerCtaText}>Đăng ký</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryLink}
              accessibilityRole="button"
              accessibilityLabel="Quên mật khẩu"
              hitSlop={8}
              onPress={openForgotPasswordEmailModal}
            >
              <Text style={styles.secondaryLinkText}>Quên mật khẩu</Text>
            </Pressable>
        </View>

        <Text style={styles.footer}>{getAppVersionLabel()}</Text>
      </KeyboardAwareScrollView>

      <ModalShell
        visible={isRegisterVisible}
        title="Đăng ký"
        onClose={closeRegisterModal}
        keyboardContentMaxHeight={228}
      >
        <FormInput control={registerForm.control} name="fullName" label="Họ tên" />
        <FormInput
          control={registerForm.control}
          name="email"
          label="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <FormInput
          control={registerForm.control}
          name="phone"
          label="Số điện thoại"
          keyboardType="phone-pad"
        />
        <FormInput
          control={registerForm.control}
          name="password"
          label="Mật khẩu"
          secureTextEntry
        />
        <FormInput
          control={registerForm.control}
          name="passwordConfirm"
          label="Nhập lại mật khẩu"
          secureTextEntry
        />
        <Controller
          control={registerForm.control}
          name="staffId"
          render={({ field: { value, onChange } }) => (
            <SelectSheet
              label="Nhân viên giới thiệu"
              value={value}
              options={registerStaffSelectOptions}
              onChange={onChange}
              onOpen={() => {
                if (!isRegisterStaffLoading && !registerStaffOptions.length) {
                  void loadRegisterStaff();
                }
              }}
              statusText={registerStaffStatusText}
              statusTone={registerStaffError && !isRegisterStaffLoading ? 'error' : 'muted'}
            />
          )}
        />
        <View style={styles.modalActions}>
          <AppButton title="Đóng" variant="outline" onPress={closeRegisterModal} style={{ flex: 1 }} />
          <AppButton
            title="Đăng ký"
            onPress={onRegister}
            isLoading={isRegisterLoading}
            disabled={!registerForm.formState.isValid}
            style={{ flex: 1 }}
          />
        </View>
      </ModalShell>

      <ModalShell visible={isVerifyVisible} title="Xác thực OTP" onClose={closeVerifyModal}>
        <FormInput
          control={verifyForm.control}
          name="email"
          label="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <FormInput
          control={verifyForm.control}
          name="otp"
          label="Mã OTP"
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
          <AppButton
            title="Xác thực"
            onPress={onVerifyOtp}
            isLoading={isVerifyLoading}
            disabled={!verifyForm.formState.isValid}
          />
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
        <FormInput
          control={forgotEmailForm.control}
          name="email"
          label="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <AppButton
          title="Gửi mã OTP"
          onPress={onForgotPasswordSendOtp}
          isLoading={isForgotPasswordSendOtpLoading}
          disabled={!forgotEmailForm.formState.isValid}
        />
      </ModalShell>

      <ModalShell
        visible={isForgotPasswordOtpVisible}
        title="Nhập mã OTP"
        onClose={closeForgotPasswordFlow}
      >
        <Text style={styles.modalHelperText}>
          Nhập mã OTP đã được gửi tới email {forgotEmail || 'của bạn'}.
        </Text>
        <FormInput
          control={forgotOtpForm.control}
          name="otp"
          label="Mã OTP"
          keyboardType="number-pad"
          autoCapitalize="none"
        />
        <AppButton
          title="Tiếp tục"
          onPress={onForgotPasswordContinue}
          disabled={!forgotOtpForm.formState.isValid}
        />
      </ModalShell>

      <ModalShell
        visible={isForgotPasswordResetVisible}
        title="Đặt lại mật khẩu"
        onClose={closeForgotPasswordFlow}
      >
        <Text style={styles.modalHelperText}>
          Tạo mật khẩu mới cho tài khoản {forgotEmail || 'của bạn'}.
        </Text>
        <FormInput
          control={forgotResetForm.control}
          name="newPassword"
          label="Mật khẩu mới"
          secureTextEntry
        />
        <FormInput
          control={forgotResetForm.control}
          name="confirmPassword"
          label="Xác nhận mật khẩu"
          secureTextEntry
        />
        <AppButton
          title="Đặt lại mật khẩu"
          onPress={onForgotPasswordReset}
          isLoading={isForgotPasswordResetLoading}
          disabled={!forgotResetForm.formState.isValid}
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
    width: 240,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoImage: {
    width: '100%',
    height: '100%',
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
  inputError: {
    borderColor: colors.error,
  },
  fieldError: {
    fontSize: typography.fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
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
