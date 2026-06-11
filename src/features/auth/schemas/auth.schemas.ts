import { z } from 'zod';

// Field dùng chung
const emailField = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập email')
  .email('Email không hợp lệ');

const otpField = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Mã OTP phải gồm 6 chữ số');

// Đăng nhập
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});
export type LoginForm = z.infer<typeof loginSchema>;

// Đăng ký
export const registerSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên'),
    email: emailField,
    phone: z.string().trim().min(1, 'Vui lòng nhập số điện thoại'),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
    passwordConfirm: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
    staffId: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['passwordConfirm'],
  });
export type RegisterForm = z.infer<typeof registerSchema>;

// Xác thực OTP (sau đăng ký / đăng nhập chưa verify)
export const otpVerifySchema = z.object({
  email: emailField,
  otp: otpField,
});
export type OtpVerifyForm = z.infer<typeof otpVerifySchema>;

// Quên mật khẩu — bước 1: nhập email
export const forgotEmailSchema = z.object({
  email: emailField,
});
export type ForgotEmailForm = z.infer<typeof forgotEmailSchema>;

// Quên mật khẩu — bước 2: nhập OTP
export const forgotOtpSchema = z.object({
  otp: otpField,
});
export type ForgotOtpForm = z.infer<typeof forgotOtpSchema>;

// Quên mật khẩu — bước 3: đặt lại mật khẩu
export const forgotResetSchema = z
  .object({
    newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Xác nhận mật khẩu không khớp',
    path: ['confirmPassword'],
  });
export type ForgotResetForm = z.infer<typeof forgotResetSchema>;
