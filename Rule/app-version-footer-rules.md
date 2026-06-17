# App Version & Footer Rules

Quy ước hiển thị **phiên bản app** ở footer và cách **tăng version mỗi lần release**.

## General rules

- Footer dưới card đăng nhập (`app/(auth)/login.tsx`) và **dưới nút Đăng xuất** ở màn tài khoản
  (`app/(tabs)/account.tsx`) **phải hiển thị dòng version**, không hiển thị text bản quyền tĩnh.
- Dòng version phải lấy từ `getAppVersionLabel()` trong `src/shared/lib/app-version.ts`.
  **Không** hard-code chuỗi version trong UI.
- `getAppVersionLabel()` đọc versionName thật của app đã cài qua `expo-application`
  (`nativeApplicationVersion`), fallback `expo-constants` (`Constants.expoConfig.version`) nếu
  native module chưa sẵn sàng.
- Định dạng hiển thị: `Phiên bản <versionName>`, ví dụ `Phiên bản 1.0.0`.
  **Chỉ hiển thị semantic version, KHÔNG kèm build number.**

## Tăng version mỗi khi release

- Phiên bản hiển thị bắt đầu từ **1.0.0** và là **semantic version** (`expo.version` trong app.json).
- Mỗi khi release bản mới để cập nhật app, **tăng `expo.version`** trong `app.json`
  (vd `1.0.0` → `1.0.1` → `1.1.0`...). Đồng bộ `versionName` trong `android/app/build.gradle`
  cho bản build local.
- **Build number (versionCode)** vẫn auto +1 mỗi lần `eas build --profile production` nhờ
  `eas.json` (`cli.appVersionSource = "remote"` + `build.production.autoIncrement = true`) —
  dùng nội bộ cho Play Store, **không hiển thị** trong app.

## Native module

- Tính năng đọc versionName dùng `expo-application` (đã thêm vào `package.json`). Module được
  autolink lúc build (không cần `expo prebuild`), nên **lần build kế tiếp phải build lại** để
  bản app có native module.
- Dev build / bản build cũ chưa có `expo-application` sẽ fallback đọc version từ app config
  (`Constants.expoConfig.version`) — vẫn hiển thị `Phiên bản 1.0.0`, không crash.
