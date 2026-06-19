# Yêu cầu của Google Play — Xóa tài khoản (Account Deletion)

> Tài liệu tham khảo nội bộ cho việc đưa app Tiximax lên Google Play. Tổng hợp yêu cầu bắt buộc của Google về **xóa tài khoản & dữ liệu**, cách Tiximax sẽ đáp ứng, và link chính sách gốc để đọc thêm.

## 🔗 Link chính sách gốc (đọc tham khảo)

- **Trang chính — Understanding Google Play's app account deletion requirements:**
  https://support.google.com/googleplay/android-developer/answer/13327111
- **Data Safety Form & Account Deletion (cách khai trong Play Console):**
  https://support.google.com/googleplay/android-developer/community-guide/246344978/about-the-data-safety-form-and-account-deletion
- **User Data policy (chính sách dữ liệu người dùng tổng quát):**
  https://support.google.com/googleplay/android-developer/answer/10144311

---

## 1. Vì sao Tiximax thuộc diện BẮT BUỘC

App cho phép **tạo tài khoản ngay trong app** (`POST /customer-portal/register`). Theo chính sách của Google: *app nào cho tạo tài khoản in-app thì BẮT BUỘC phải cho người dùng yêu cầu xóa tài khoản.* Không đáp ứng → **bị từ chối review hoặc gỡ app**.

## 2. Yêu cầu cốt lõi của Google

1. **Xóa được cả TRONG app lẫn NGOÀI app** — người dùng phải có lối yêu cầu xóa ngay trong app, **và** một lối ngoài app (vd qua website). Lý do: người đã gỡ app vẫn phải yêu cầu xóa được.
2. **Xóa tài khoản VÀ dữ liệu** — không chỉ vô hiệu hóa. Dữ liệu cá nhân (PII) phải được xóa hoặc ẩn danh thật sự.
3. **Khai trong Data safety form** (mục App content trên Play Console): có cung cấp xóa tài khoản không, và **dán URL web** để yêu cầu xóa.
4. **Công bố rõ ràng**: thời gian hoàn tất xóa, và dữ liệu nào được giữ lại + lý do + thời hạn.

### Yêu cầu riêng cho URL web (dán vào Data safety)
- **Hoạt động được** (load không lỗi).
- **Lối yêu cầu xóa phải nổi bật, dễ tìm** trên trang.
- **Xem được mà không cần cài/đăng nhập app.**
- **Nhắc đúng tên app/nhà phát triển** ("Tiximax") như hiển thị trên store.

## 3. Cách Tiximax đáp ứng

| Nơi | Việc cần làm | Bắt buộc |
|---|---|---|
| **App** | Nút "Xóa tài khoản" trong màn Tài khoản → dialog xác nhận → gọi API → tự logout | ✅ **ĐÃ LÀM** (verify emulator) |
| **Web** | **Trang công khai** trên https://sys.tiximax.net/ mô tả quy trình xóa + **hotline hỗ trợ** để khách yêu cầu xóa ngoài app (URL này dán vào Data safety) | ✅ (phần "ngoài app") |
| **Backend** | Endpoint: `DELETE /customer-portal/me/account` | ✅ (đã triển khai) |

### Quyết định kỹ thuật đã chốt (✅ ĐÃ TRIỂN KHAI ở BE)
- **Endpoint:** `DELETE /customer-portal/me/account` (JwtAuthGuard + CustomerGuard, chỉ role CUSTOMER).
- **Điều kiện xóa:** chỉ cho xóa khi **không còn đơn nào đang xử lý** — tức **tất cả đơn** phải ở trạng thái **"Đã Giao" (DA_GIAO)** hoặc **"Đã hủy" (DA_HUY)**. Còn đơn khác (kể cả status null) → **chặn xóa**: trả HTTP **409**, mã lỗi `CUSTOMER_ACCOUNT_DELETE_HAS_ACTIVE_ORDERS`, kèm số đơn chặn + tối đa 10 đơn để app hiển thị.
- **Cơ chế xóa = vô hiệu hóa + ẩn danh PII ngay** (soft-delete đạt chuẩn Google): khóa tài khoản (`status = BI_KHOA`); scrub email/username/google_id/password/avatar → null; name → "Deleted Customer <id>"; phone → "deleted-<id>"; địa chỉ scrub; OTP xóa; gỡ gán sale/route. PII bị ẩn danh thật, không chỉ gắn cờ `is_deleted`.
- **Giữ lại** đơn hàng & chứng từ **thanh toán** theo **Luật Kế toán Việt Nam (5–10 năm**, NĐ 174/2016/NĐ-CP) vì nghĩa vụ kế toán/pháp lý — phải công bố công khai. (Mode trong code: `ANONYMIZED_ACCOUNT_RETAIN_OPERATIONAL_SNAPSHOTS`.)
- **Thu hồi toàn bộ token/phiên** đăng nhập khi xóa (revoke `refresh_token`).

## 4. Thông tin phải công bố

> ⚠️ **Google KHÔNG quy định con số cụ thể** — không bắt "xóa trong X ngày" hay "giữ Y năm". Trích nguyên văn chính sách:
> - Thời gian xóa: *"complete their requests within a reasonably quick period of time"* (hoàn tất trong **thời gian hợp lý**) + **báo cho người dùng biết**.
> - Giữ dữ liệu: được phép giữ vì lý do chính đáng (bảo mật, chống gian lận, **tuân thủ pháp luật**), nhưng *"you must clearly inform users about your data retention practices"* (phải **công bố rõ**).

Vì vậy 2 con số dưới đây **do bạn / đội pháp lý tự quyết**, KHÔNG phải Google áp:

- **Thời gian hoàn tất (X) — ĐÃ CHỐT:** **vô hiệu hóa + ẩn danh dữ liệu cá nhân ngay lập tức** khi tài khoản **không còn đơn đang xử lý** (mọi đơn đã "Đã Giao" / "Đã hủy").
- **Thời hạn giữ dữ liệu (Y) — ĐÃ CHỐT:** chứng từ **đơn hàng & thanh toán** giữ theo **Luật Kế toán Việt Nam (5–10 năm**, NĐ 174/2016/NĐ-CP) vì nghĩa vụ kế toán/pháp lý. **Dữ liệu cá nhân (PII) KHÔNG** thuộc nhóm này — đã ẩn danh ngay khi xóa. (Khớp đúng code BE: giữ chứng từ, ẩn danh PII; không có job xóa sau 90 ngày.)

Thông tin này phải xuất hiện ở: màn xác nhận trong app, trang xóa trên web, và Privacy Policy.

## 5. Checklist trước khi submit

- [x] BE: endpoint `DELETE /customer-portal/me/account` — **ĐÃ TRIỂN KHAI** (chặn nếu còn đơn đang xử lý + ẩn danh PII + giữ đơn/thanh toán theo luật + thu hồi token)
- [x] App: nút "Xóa tài khoản" + dialog xác nhận (công bố ẩn danh PII + giữ chứng từ theo luật + điều kiện "mọi đơn đã giao/đã hủy") → gọi API → tự logout; lỗi 409 hiển thị message từ BE qua toast. **ĐÃ LÀM & verify emulator** (commit `bbbc0f2`, nhánh `J2T`). *Ghi chú: hiện chỉ hiển thị message lỗi, chưa render danh sách đơn còn chặn — có thể bổ sung sau.*
- [ ] Web: trang công khai trên https://sys.tiximax.net/ mô tả quy trình xóa + hotline hỗ trợ (URL dán vào Data safety)
- [x] Chốt X (ẩn danh PII ngay) và Y (giữ chứng từ theo Luật Kế toán) — xem mục 4
- [x] Cập nhật Privacy Policy mục "Xóa tài khoản" cho khớp (ẩn danh PII ngay + giữ chứng từ theo luật kế toán) — *nội dung đã sửa ở `Document/chinh-sach-quyen-rieng-tu.md`; còn điền tên/địa chỉ pháp lý + đăng lên URL cố định*
- [ ] Khai Data safety form + dán URL web vào Play Console

---

## 6. Tiến trình (cập nhật 18/06/2026)

- ✅ **Backend**: endpoint `DELETE /customer-portal/me/account` đã có sẵn & rà soát code (chặn đơn đang xử lý → 409, ẩn danh PII, thu hồi token, giữ chứng từ).
- ✅ **App (FE)**: đã code nút "Xóa tài khoản" + dialog xác nhận + tự logout + xử lý lỗi 409 — commit `bbbc0f2` trên nhánh `J2T` (đã push lên `origin/J2T`).
  - Verify trên emulator: nút hiển thị dưới "Đăng xuất"; dialog công bố đúng nội dung; nút "Hủy" hoạt động. **Không** chạy xóa thật (đường phá hủy trên tài khoản thật).
  - App version bump **1.0.1**; đã build **APK release** (debug-signed, ~100 MB) để test trên máy thật.
- ⏳ **Còn lại để submit Google Play** (không thuộc app, cần web/pháp lý):
  - [ ] **Web**: trang công khai mô tả quy trình xóa + hotline trên https://sys.tiximax.net/ (URL cho Data safety).
  - [x] **Privacy Policy**: đã cập nhật mục "Xóa tài khoản" + "Thời gian lưu trữ" trong `Document/chinh-sach-quyen-rieng-tu.md` (khớp BE). *Còn: điền tên/địa chỉ pháp lý + đăng lên URL cố định.*
  - [ ] **Data safety form** (Play Console): khai có hỗ trợ xóa tài khoản + dán URL web ở trên.
