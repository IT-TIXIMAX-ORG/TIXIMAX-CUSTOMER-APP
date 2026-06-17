import Constants from 'expo-constants';

const FALLBACK_VERSION = '1.0.0';

// Đọc version thật từ app đã cài: versionName + build number (versionCode trên Android,
// buildNumber trên iOS). Build number là giá trị auto +1 mỗi lần release (EAS autoIncrement).
//
// Dùng require động + try/catch vì dev build cũ có thể chưa link native module ExpoApplication
// → khi đó fallback về version trong app config (expo-constants) và bỏ build number.
const readNativeVersion = (): { version: string | null; build: string | null } => {
  try {
    const Application = require('expo-application') as typeof import('expo-application');
    return {
      version: Application.nativeApplicationVersion ?? null,
      build: Application.nativeBuildVersion ?? null,
    };
  } catch {
    return { version: null, build: null };
  }
};

// Chuỗi hiển thị ở footer màn đăng nhập, ví dụ: "Phiên bản 1.0.0 (5)".
export const getAppVersionLabel = (): string => {
  const { version, build } = readNativeVersion();
  const resolvedVersion = version ?? Constants.expoConfig?.version ?? FALLBACK_VERSION;
  return build ? `Phiên bản ${resolvedVersion} (${build})` : `Phiên bản ${resolvedVersion}`;
};
