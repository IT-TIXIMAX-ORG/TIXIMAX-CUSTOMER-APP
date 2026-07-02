# Hướng dẫn deploy Tiximax Customer App lên App Store (iOS)

> Áp dụng cho app Expo + EAS Build. **Không cần máy Mac** — build chạy trên cloud của Expo.
> Quy trình tương tự khi deploy lên CH Play, nhưng Apple khắt khe hơn ở screenshots, privacy và duyệt.

---

## 0. Điều kiện tiên quyết

| Hạng mục | Chi tiết |
|---|---|
| Tài khoản Apple Developer | **99 USD/năm** (Google Play chỉ 25 USD một lần). Đăng ký: https://developer.apple.com/programs/ |
| D-U-N-S (nếu đăng ký tên công ty) | Xin miễn phí, mất vài ngày–2 tuần. Đăng ký cá nhân thì không cần. |
| EAS CLI | `npm install -g eas-cli` rồi `eas login` (tài khoản Expo, owner: `tiximax`) |
| Máy Mac | **Không bắt buộc** vì dùng EAS Build cloud. |

---

## ⚠️ Bước 0 — Sửa bundle identifier TRƯỚC KHI build

Trong `app.json`, bundle ID iOS đang để mặc định của Expo:

```jsonc
"ios": {
  "bundleIdentifier": "com.anonymous.tiximaxcustomerapp"  // ← placeholder, PHẢI đổi
}
```

Đổi thành cho khớp Android (`net.tiximax.customer`):

```jsonc
"ios": {
  "bundleIdentifier": "net.tiximax.customer"
}
```

> **Quan trọng:** Bundle ID không đổi được sau khi đã tạo app trên App Store Connect. Apple cũng từ chối bundle ID chứa chữ `anonymous`.

---

## Bước 1 — Chọn đúng API endpoint (production)

App đọc endpoint từ `EXPO_PUBLIC_API_BASE_URL`. Mặc định `.env` đang trỏ **staging**.

- Production: `https://api-sys.tiximax.net`
- Staging:    `https://be-new-staging.tiximax.net`
- **Không** thêm dấu `/` ở cuối URL (gây `//` → 404).

**Cách khuyến nghị (tách theo profile trong `eas.json`)** để không bao giờ build nhầm:

```jsonc
{
  "cli": { "appVersionSource": "remote" },
  "build": {
    "preview": {
      "env": { "EXPO_PUBLIC_API_BASE_URL": "https://be-new-staging.tiximax.net" },
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true,
      "env": { "EXPO_PUBLIC_API_BASE_URL": "https://api-sys.tiximax.net" },
      "android": { "buildType": "app-bundle" },
      "ios": {}
    }
  }
}
```

Khi đó `eas build --profile production` luôn dùng production, khỏi phải sửa `.env` bằng tay.

---

## Bước 2 — Tạo App Identifier trên Apple Developer

1. Vào https://developer.apple.com/account → **Certificates, Identifiers & Profiles** → **Identifiers** → **(+)**.
2. Chọn **App IDs** → **App**:
   - Description: `Tiximax Customer`
   - Bundle ID: **Explicit** → `net.tiximax.customer` (đúng y hệt `app.json`).
3. Lưu lại. *(EAS có thể tự tạo, nhưng làm tay chủ động hơn.)*

---

## Bước 3 — Tạo app record trên App Store Connect

1. Vào https://appstoreconnect.apple.com → **My Apps** → **(+)** → **New App**.
2. Điền:
   - Platform: **iOS**
   - Name: `Tiximax` (tên hiển thị, phải **độc nhất toàn cầu**)
   - Primary Language: **Vietnamese**
   - Bundle ID: chọn `net.tiximax.customer` vừa tạo
   - SKU: tự đặt, ví dụ `tiximax-customer-001`
3. App sẽ ở trạng thái **Prepare for Submission**.

---

## Bước 4 — Build IPA bằng EAS (chạy trên Windows được)

```bash
cd tiximax-customer-app
eas build --platform ios --profile production
```

- Lần đầu EAS hỏi đăng nhập **Apple ID** (nhập mã 2FA nếu có).
- Chọn để EAS tự tạo **Distribution Certificate** + **Provisioning Profile** trên cloud.
- Build ~15–25 phút, xong cho link tải file `.ipa`.

---

## Bước 5 — Submit bản build lên App Store Connect

```bash
eas submit --platform ios --latest
```

- Cần **App Store Connect API Key**: App Store Connect → **Users and Access** → **Integrations / Keys** → tạo key role **App Manager**, tải file `.p8`.
- EAS upload build lên. Sau ~5–10 phút build hiện trong tab **TestFlight / Build**.

---

## Bước 6 — Điền thông tin store & gửi duyệt

Trong app vừa tạo trên App Store Connect:

- [ ] **Screenshots** bắt buộc: iPhone **6.7"** (1290×2796 px). Thiếu là không submit được.
- [ ] **Description, Keywords, Support URL**
- [ ] **Privacy Policy URL** (bắt buộc) — dùng nội dung `Document/chinh-sach-quyen-rieng-tu.md`
- [ ] **App Privacy** (Nutrition Label): kê khai dữ liệu thu thập. App dùng quyền thư viện ảnh → khai mục **Photos**.
- [ ] **Age Rating**: trả lời bộ câu hỏi.
- [ ] Gán build vừa upload vào phần **Build**.
- [ ] **App Review Information**: cung cấp **tài khoản demo** (email + mật khẩu) vì app có đăng nhập — Apple gần như luôn yêu cầu.
- [ ] Bấm **Add for Review** → **Submit**.

---

## Bước 7 — Chờ duyệt

- Apple duyệt thường **24–48 giờ**.
- Lỗi reject hay gặp: thiếu Privacy Policy, mô tả quyền không rõ, app crash khi reviewer test, thiếu tài khoản demo.

---

## So sánh nhanh với CH Play

| | CH Play | App Store |
|---|---|---|
| Phí | 25 USD/lần | 99 USD/**năm** |
| Screenshots | Linh hoạt | Bắt buộc đúng kích thước |
| Tài khoản demo | Tùy | Gần như bắt buộc nếu có login |
| Tốc độ duyệt | Vài ngày | 24–48h |

---

## Checklist tổng (bản build production)

- [ ] Đổi `bundleIdentifier` → `net.tiximax.customer` trong `app.json`
- [ ] Endpoint production (`api-sys.tiximax.net`, không có `/` cuối) qua `eas.json` profile `production`
- [ ] Tạo App ID trên Apple Developer
- [ ] Tạo app record trên App Store Connect
- [ ] `eas build --platform ios --profile production`
- [ ] `eas submit --platform ios --latest`
- [ ] Screenshots 6.7", mô tả, privacy policy, app privacy, tài khoản demo
- [ ] Submit for Review
