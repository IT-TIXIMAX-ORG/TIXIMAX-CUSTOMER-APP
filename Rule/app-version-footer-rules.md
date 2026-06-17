# App Version & Login Footer Rules

Quy ước hiển thị **phiên bản app** và cách **tăng version mỗi lần release** để cập nhật app.

## General rules

- Footer dưới card đăng nhập (`app/(auth)/login.tsx`) **phải hiển thị dòng version**, không hiển thị
  text bản quyền tĩnh.
- Dòng version phải lấy từ `getAppVersionLabel()` trong `src/shared/lib/app-version.ts`.
  **Không** hard-code chuỗi version trong UI.
- `getAppVersionLabel()` đọc version thật của app đã cài qua `expo-application`
  (`nativeApplicationVersion` = versionName, `nativeBuildVersion` = build number / versionCode),
  fallback `expo-constants` (`Constants.expoConfig.version`) nếu native module chưa sẵn sàng.
- Định dạng hiển thị: `Phiên bản <versionName> (<build>)`, ví dụ `Phiên bản 1.0.0 (5)`.
  Khi không đọc được build number thì chỉ hiển thị `Phiên bản <versionName>`.

## Build number tự động +1 mỗi release

- **Build number là giá trị auto +1 mỗi lần release** (KHÔNG sửa tay cho bản production).
- Cơ chế: `eas.json` đã cấu hình
  - `cli.appVersionSource = "remote"` — EAS quản lý số phiên bản trên server.
  - `build.production.autoIncrement = true` — mỗi lần `eas build --profile production`,
    EAS tự tăng build number (+1) rồi nhúng vào bản build.
- Footer đọc build number từ chính bản build đã cài nên **tự phản ánh giá trị mới** sau mỗi release,
  không cần sửa code.

## Quy trình release bản mới (cập nhật app)

1. Release production qua EAS:
   ```
   eas build --profile production --platform android
   ```
   → EAS tự +1 build number. Footer bản mới sẽ hiển thị build number mới.
2. **Chỉ** khi đổi phiên bản ngữ nghĩa (semantic) mới sửa tay `expo.version` trong `app.json`
   (vd `1.0.0` → `1.0.1`/`1.1.0`). Build number vẫn do EAS tự tăng.
3. Không cần sửa `versionCode`/`versionName` trong `android/app/build.gradle` cho luồng EAS
   (vì `appVersionSource = remote`).

## Local test APK (không tự tăng)

- APK build local theo `Plan/build_apk_test_android.md` dùng `versionCode`/`versionName` cố định trong
  `android/app/build.gradle` → **không** auto +1. Footer sẽ hiển thị đúng giá trị cố định đó.
- Muốn mô phỏng tăng version ở bản test local thì sửa tay `versionCode` trong `build.gradle` trước khi build.

## Native module

- Tính năng này phụ thuộc `expo-application` (đã thêm vào `package.json`). Module được autolink lúc
  build (không cần `expo prebuild`), nên **lần build kế tiếp phải build lại** để bản app có native module.
- Dev build / bản build cũ chưa có `expo-application` sẽ tự fallback hiển thị `Phiên bản <versionName>`
  (không có build number) — không crash.
