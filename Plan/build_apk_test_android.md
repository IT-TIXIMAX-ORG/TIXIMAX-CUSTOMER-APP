# Hướng dẫn build APK để test trên máy Android thật

> App `tiximax-customer-app` là **Expo + React Native**, đã prebuild sẵn thư mục `android/`.
> Tài liệu này hướng dẫn build **1 file APK Release** (ký bằng debug keystore — đủ để cài thử),
> luôn **xóa bản release cũ** và **lấy code local mới nhất** mỗi lần build.

---

## TL;DR — chạy nhanh (copy 1 lần)

Mở **PowerShell** tại thư mục gốc project `d:\Tiximax_FE\tiximax-customer-app` rồi dán nguyên khối:

```powershell
# 1) Xóa APK release cũ
Remove-Item -Recurse -Force .\android\app\build\outputs\apk\release -ErrorAction SilentlyContinue

# 2) Clean Gradle (ép đóng gói lại JS bundle mới) + build Release
Set-Location android
.\gradlew.bat clean
.\gradlew.bat assembleRelease
Set-Location ..

# 3) In ra đường dẫn + dung lượng + thời gian build của APK
Get-Item .\android\app\build\outputs\apk\release\app-release.apk |
  Select-Object FullName, @{N='SizeMB';E={[math]::Round($_.Length/1MB,1)}}, LastWriteTime
```

APK kết quả:
`d:\Tiximax_FE\tiximax-customer-app\android\app\build\outputs\apk\release\app-release.apk`

Sau đó copy file `app-release.apk` sang điện thoại và cài (xem [mục 6](#6-cài-lên-điện-thoại-tự-copy)).

---

## 1. Yêu cầu môi trường (chỉ kiểm 1 lần)

| Thành phần | Ghi chú |
|---|---|
| Node + npm | Đã cài, `node_modules` đã có sẵn |
| Android SDK | Đã cấu hình ở `android\local.properties` → `C:\Users\LOC\AppData\Local\Android\Sdk` |
| Java (JBR) | Android Studio JBR: `F:\AndroidStudio\jbr` |

Nếu build báo **không tìm thấy Java**, set một trong hai cách:

```powershell
# Cách A: set biến môi trường cho phiên PowerShell hiện tại
$env:JAVA_HOME = "F:\AndroidStudio\jbr"
```

Hoặc thêm dòng sau vào `android\gradle.properties` (cố định, không cần set lại):

```properties
org.gradle.java.home=F:\\AndroidStudio\\jbr
```

---

## 2. Chuẩn bị trước khi build

1. Mở PowerShell tại `d:\Tiximax_FE\tiximax-customer-app`.
2. Nếu **vừa thay đổi/cài thêm dependency** (sửa `package.json`):
   ```powershell
   npm install
   ```
3. Kiểm tra file `.env` đang trỏ đúng API muốn test:
   ```
   EXPO_PUBLIC_API_BASE_URL=https://be-new-staging.tiximax.net
   ```
   > ⚠️ Giá trị `EXPO_PUBLIC_*` được **nhúng vào bundle lúc build**. Đổi API thì phải build lại APK.
4. **Chỉ khi đổi cấu hình native** (sửa `app.json`, icon, splash, thêm thư viện native...) mới cần:
   ```powershell
   npx expo prebuild --platform android
   ```
   > ⚠️ Lệnh này có thể **ghi đè** các sửa đổi tay trong thư mục `android/`. Nếu chỉ đổi code
   > JS/TS thông thường thì **BỎ QUA** bước này.

---

## 3. Xóa bản release cũ + đảm bảo lấy code mới nhất

Đây là phần cốt lõi đảm bảo không cài nhầm bản cũ và JS được đóng gói lại từ source hiện tại.

```powershell
# B1: Xóa toàn bộ thư mục APK release cũ
Remove-Item -Recurse -Force .\android\app\build\outputs\apk\release -ErrorAction SilentlyContinue

# B2: Clean Gradle để bỏ cache build cũ -> buộc đóng gói lại JS bundle mới
Set-Location android
.\gradlew.bat clean
Set-Location ..

# B3 (tùy chọn): xóa cache Metro/Expo nếu nghi ngờ JS bị cũ
Remove-Item -Recurse -Force .\.expo -ErrorAction SilentlyContinue
```

> **Vì sao chắc chắn lấy code mới?** Trong `android/app/build.gradle`, build dùng
> `bundleCommand = "export:embed"` của Expo, nên tác vụ `assembleRelease` **đóng gói lại
> JavaScript từ source local mỗi lần build**. Chạy `gradlew clean` trước để loại bỏ cache,
> đảm bảo bundle được tạo lại hoàn toàn.

---

## 4. Build Release APK

```powershell
Set-Location android
.\gradlew.bat assembleRelease
Set-Location ..
```

- Lần build đầu sau khi `clean` sẽ lâu hơn (vài phút) vì biên dịch lại native + bundle JS.
- Kết quả:
  `d:\Tiximax_FE\tiximax-customer-app\android\app\build\outputs\apk\release\app-release.apk`

---

## 5. Xác minh APK vừa build (đúng là bản mới)

```powershell
Get-Item .\android\app\build\outputs\apk\release\app-release.apk |
  Select-Object FullName, @{N='SizeMB';E={[math]::Round($_.Length/1MB,1)}}, LastWriteTime
```

Kiểm tra cột **`LastWriteTime`** đúng là thời điểm bạn vừa build.

---

## 6. Cài lên điện thoại (tự copy)

1. Copy file `app-release.apk` sang điện thoại bằng:
   - Cáp USB (để chế độ **truyền file/MTP**), hoặc
   - Google Drive / Zalo / Telegram... rồi tải về máy.
2. Trên điện thoại, mở file APK bằng trình quản lý file/trình duyệt.
3. Nếu Android cảnh báo, **cho phép "Cài đặt từ nguồn không xác định"** cho ứng dụng đang dùng để mở file.
4. Bấm **Cài đặt** → mở app → kiểm tra app kết nối được API staging.

> 💡 Vì các bản đều ký bằng cùng `debug.keystore`, bạn có thể **cài đè** lên bản cũ trên máy.
> Nếu báo lỗi xung đột chữ ký, hãy **gỡ app cũ** rồi cài lại.

---

## 7. Khắc phục sự cố thường gặp

| Triệu chứng | Cách xử lý |
|---|---|
| Build báo thiếu/không thấy Java | Set `JAVA_HOME` hoặc `org.gradle.java.home` về `F:\AndroidStudio\jbr` (xem mục 1) |
| Lỗi "SDK location not found" | Kiểm tra `android\local.properties` có dòng `sdk.dir=...` đúng |
| Cài lỗi sau khi đổi thư viện | Chạy `npm install`, rồi build lại từ B1 (mục 3) |
| Nghi ngờ app chạy code cũ | Đảm bảo đã chạy `gradlew clean` (B2) + xóa `.expo` (B3), build lại |
| Build hết RAM / treo | Tăng `org.gradle.jvmargs` trong `android\gradle.properties` (vd `-Xmx4096m`) |
| Cần đổi server API test | Sửa `.env` → `EXPO_PUBLIC_API_BASE_URL` → **build lại** APK |
| Gradle daemon lỗi linh tinh | `Set-Location android; .\gradlew.bat --stop; Set-Location ..` rồi build lại |

---

## Phụ lục — thông tin app

- **Package:** `com.anonymous.tiximaxcustomerapp`
- **Version:** `1.0.0` (versionCode `1`) — sửa ở `android\app\build.gradle` nếu cần tăng phiên bản
- **Ký APK:** debug keystore (`android\app\debug.keystore`) — chỉ dùng để test, **không** dùng lên Play Store
- **Khi nào cần keystore production:** chỉ khi phát hành chính thức lên Google Play (tạo keystore riêng, thay `signingConfig` trong `build.gradle`)
