import { z } from 'zod';

// Thông tin cá nhân
export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập họ tên'),
  email: z.string().trim().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
  phone: z.string().trim().min(1, 'Vui lòng nhập số điện thoại'),
  staffId: z.string(),
});
export type ProfileForm = z.infer<typeof profileSchema>;

// Địa chỉ nhận hàng (thêm/sửa)
export const addressSchema = z.object({
  province: z.string().trim().min(1, 'Vui lòng nhập tỉnh/thành phố'),
  ward: z.string().trim().min(1, 'Vui lòng nhập phường/xã'),
  street: z.string().trim().min(1, 'Vui lòng nhập số nhà, đường'),
});
export type AddressForm = z.infer<typeof addressSchema>;

// Xác minh email bằng OTP
export const verifyEmailOtpSchema = z.object({
  otp: z.string().trim().regex(/^\d{6}$/, 'Mã OTP phải gồm 6 chữ số'),
});
export type VerifyEmailOtpForm = z.infer<typeof verifyEmailOtpSchema>;

// Đổi mật khẩu (đã có mật khẩu)
export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Vui lòng nhập mật khẩu cũ'),
    newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
    confirmNewPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Xác nhận mật khẩu mới không khớp',
    path: ['confirmNewPassword'],
  });
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

// Tạo mật khẩu (chưa có mật khẩu, vd đăng nhập Google)
export const createPasswordSchema = z
  .object({
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
    confirmNewPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((data) => data.password === data.confirmNewPassword, {
    message: 'Xác nhận mật khẩu không khớp',
    path: ['confirmNewPassword'],
  });
export type CreatePasswordForm = z.infer<typeof createPasswordSchema>;
