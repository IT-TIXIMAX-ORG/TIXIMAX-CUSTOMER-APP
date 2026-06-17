import Constants from 'expo-constants';

const FALLBACK_VERSION = '1.0.0';

// Đọc versionName thật từ app đã cài (vd "1.0.0"). Dùng require động + try/catch vì dev build
// cũ có thể chưa link native module ExpoApplication → khi đó fallback về version trong app config.
const readNativeAppVersion = (): string | null => {
  try {
    const Application = require('expo-application') as typeof import('expo-application');
    return Application.nativeApplicationVersion ?? null;
  } catch {
    return null;
  }
};

// Chuỗi hiển thị version ở footer (màn đăng nhập + tài khoản), ví dụ: "Phiên bản 1.0.0".
export const getAppVersionLabel = (): string => {
  const version = readNativeAppVersion() ?? Constants.expoConfig?.version ?? FALLBACK_VERSION;
  return `Phiên bản ${version}`;
};
