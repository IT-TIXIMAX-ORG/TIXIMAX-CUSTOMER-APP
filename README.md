# TIXIMAX Customer App

App khách hàng TixiMax — **Expo SDK 56 + React Native (New Architecture) + expo-router**.

> ⚠️ Thư mục **`android/`, `ios/` và file `.env` KHÔNG được commit** (gitignore).
> Clone/pull về là **chưa build được ngay** — làm theo mục Setup bên dưới trước.

## 1. Setup lần đầu (sau khi clone)

```powershell
# B1: Cài dependency
npm install
```

**B2: Tạo file `.env`** ở gốc project (không commit):

```properties
PORT=5173
RCT_METRO_PORT=5173
EXPO_PUBLIC_DEV_SERVER_PORT=5173
EXPO_PUBLIC_API_BASE_URL=https://be-new-staging.tiximax.net
```

**B3: Sinh project native** (tạo thư mục `android/` / `ios/`):

```powershell
npx expo prebuild --platform android     # Windows/Linux
npx expo prebuild --platform ios         # chỉ trên macOS
```

> Icon launcher, splash screen và tên app **"Tiximax"** được sinh tự động từ `app.json`
> (các file logo nguồn đã commit sẵn trong `assets/app-icons/` và `assets/images/`).

**B4 (chỉ Windows): Áp lại fix MAX_PATH** trước khi build native — nếu không sẽ gặp lỗi
`ninja: Filename longer than 260 characters`. Chi tiết ở
[Plan/build_apk_test_android.md — mục 8](Plan/build_apk_test_android.md#8-fix-loi-max_path-260-ky-tu-windows--new-architecture), tóm tắt:

1. Bật `LongPathsEnabled=1` trong registry (Admin, mỗi máy 1 lần)
2. Cài `cmake;3.31.6` qua sdkmanager (mỗi máy 1 lần)
3. Ghim version trong `android/app/build.gradle` → block `android { }`:
   ```gradle
   externalNativeBuild {
       cmake {
           version "3.31.6"
       }
   }
   ```
   > ⚠️ **Mỗi lần chạy lại `npx expo prebuild`**, dòng ghim này bị xóa → phải thêm lại.

## 2. Chạy dev hằng ngày

```powershell
npm run android      # Metro (port 5173) + tự mở dev build trên emulator/máy đã cắm
```

- ❌ **KHÔNG dùng Expo Go** — app có native module không có trong Expo Go
  (sẽ lỗi `Failed to download remote update`). Project đã cài `expo-dev-client`
  nên `expo start` mặc định luôn nhắm dev build.
- Lần đầu máy/emulator chưa có app: build + cài dev build bằng
  `npx expo run:android --port 5173`
  (hoặc `cd android; .\gradlew.bat assembleDebug` rồi `adb install -r app\build\outputs\apk\debug\app-debug.apk`).

## 3. Build APK test cho Android thật

Xem hướng dẫn đầy đủ: [Plan/build_apk_test_android.md](Plan/build_apk_test_android.md).

## 4. Khi thay đổi logo thương hiệu

Thay file `img/LOGO TXM.png` bằng logo mới rồi chạy:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/generate-launcher-icons.ps1
```

Script tự động:
- Cắt viền trắng logo → `assets/images/logo-tiximax.png` (dùng ở màn login)
- Sinh icon nguồn 1024×1024 → `assets/app-icons/tiximax-logo-icon.png` (app.json trỏ vào)
- Sinh splash nguồn → `assets/images/splash-logo.png` (scale 60% để Android 12+ không cắt tròn mất chữ)
- Nếu máy đã có `android/`: thay luôn toàn bộ `ic_launcher*` (mipmap) + `splashscreen_logo` (drawable)
  đủ 5 mật độ, backup bản cũ vào `backup-launcher-icons/`. Máy chưa có `android/` thì chỉ cần
  chạy `prebuild` sau đó là đủ.

Commit các file trong `assets/` + `img/` sau khi sinh để máy khác dùng chung.
