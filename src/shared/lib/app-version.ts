import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';

const FALLBACK_VERSION = '1.0.0';

type ExpoApplicationModule = {
  nativeApplicationVersion?: string | null;
};

// Đọc versionName thật từ app đã cài (vd "1.0.0"). Dùng optional native module vì dev build
// cũ có thể chưa link ExpoApplication; import package trực tiếp sẽ crash trước khi fallback.
const readNativeAppVersion = (): string | null => {
  const Application = requireOptionalNativeModule<ExpoApplicationModule>('ExpoApplication');
  return Application?.nativeApplicationVersion ?? null;
};

// Chuỗi hiển thị version ở footer (màn đăng nhập + tài khoản), ví dụ: "Phiên bản 1.0.0".
export const getAppVersionLabel = (): string => {
  const version = readNativeAppVersion() ?? Constants.expoConfig?.version ?? FALLBACK_VERSION;
  return `Phiên bản ${version}`;
};
