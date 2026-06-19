# KẾ HOẠCH: Sửa lỗi sau review (Kho VN · Thanh toán ship · Ký gửi)

## Context — vì sao làm

Sau khi thêm các luồng mới cho app mobile (`tiximax-customer-app`, nhánh `J2T`):
xác nhận nhận hàng + tạo phiếu giao, thanh toán ship + voucher, và mở lại tạo đơn
Ký gửi — đã chạy một đợt code-review (recall cao). Kết quả: **5 lỗi đã sửa ngay**
trong working tree và **5 mục tồn đọng** cần quyết định/triển khai tiếp. File này
ghi lại để theo dõi và xử lý dứt điểm.

Quality gate hiện tại: `npx tsc --noEmit` PASS (strict), `npm run check:encoding`
PASS, không có conflict marker.

## Summary

- **Phần A** — đã sửa (đang nằm trong working tree, **chưa commit**): liệt kê để rà lại khi commit.
- **Phần B** — tồn đọng: 5 mục, kèm cách sửa cụ thể + mức ưu tiên.
- Mỗi thay đổi phải qua lại quality gate: `npx tsc --noEmit` + `npm run check:encoding` (repo không có ESLint).

---

## Phần A — Đã sửa (rà khi commit)

| # | File | Lỗi | Đã sửa |
|---|---|---|---|
| A1 | `src/features/customer-portal/shared/schemas/create-order.schemas.ts` | Ký gửi (`KY_GUI`) không validate "Mã vận đơn" → gửi `shipmentCode` rỗng | Thêm nhánh `KY_GUI` trong `superRefine`: bắt buộc `shipmentCode` |
| A2 | `app/warehouse/confirm.tsx` (`createDraft`) | Địa chỉ mới thiếu phường/xã vẫn lọt validation (`formatAddress` ghép phần còn lại) → gửi địa chỉ thiếu | Chặn rõ: phải đủ tỉnh + phường + số nhà mới cho tạo |
| A3 | `app/shipping-payments/index.tsx` (`onPay`) | Mở mã ship mới không reset `paymentResult` → có thể hiện QR cũ của mã khác | `onPay` reset `paymentResult` trước khi set `payingItem` |
| A4 | `app/shipping-payments/index.tsx` (ước tính giảm voucher) | Voucher cố định theo tuyến bị cap theo tổng phí ship thay vì phí tuyến khớp → giảm quá tay | Cap theo `discountBase` (phí tuyến đã khớp) |
| A5 | `src/features/customer-portal/shared/services/shipping-payment.service.ts` | `pollPaymentStatus` chết (đã bỏ auto-poll QR) | Xóa hàm |

> Không đụng các kết luận đã verify là KHÔNG lỗi: cache `queryClient.clear()` khi
> login/logout, thứ tự hooks form/QR, nhánh retry voucher, SelectSheet label rỗng,
> import `Alert` ở create-order.

---

## Phần B — Tồn đọng cần sửa

### B1. `customerCode` rỗng khi tạo phiếu giao (ưu tiên: trung bình)

- **File:** `app/warehouse/confirm.tsx` (`createDraft`).
- **Vấn đề:** payload fallback `customerCode` rỗng khi `useCustomerProfile`
  chưa load xong mà khách bấm "Tạo phiếu giao", `customerCode` gửi rỗng. Không có
  validation cho field này (chỉ check phone/address/selectedCodes).
- **Mức độ thực tế:** thấp — endpoint `/customer-portal/draft-domestics` thuộc khối
  customer-portal nên BE nhiều khả năng suy ra khách từ token (gửi rỗng vẫn chạy,
  đây cũng là hành vi gốc trước đây). Cần xác nhận với BE.
- **Cách sửa (phòng thủ):** trong `createDraft`, nếu profile chưa có `customerCode` →
  `Toast.show({ type:'error', text1:'Đang tải hồ sơ, vui lòng thử lại' })` rồi
  `return`. (Hoặc disable nút "Tạo phiếu giao" ở bottom bar khi `!profile`.)

### B2. Modal "Thêm kiện" cắt cứng ở 100 kiện (ưu tiên: trung bình)

- **File:** `app/warehouse/addresses.tsx` (`availableQuery` `page:1, size:100`).
- **Vấn đề:** khách có > 100 kiện khả dụng thì các kiện ngoài 100 đầu không bao giờ
  hiện trong modal "Thêm kiện vào phiếu" → không thể thêm; cắt dữ liệu âm thầm.
- **Cách sửa:** thêm phân trang "Tải thêm" trong modal (state `page`, merge theo
  `shipmentCode`/key) — tái dùng pattern "Tải thêm" của `app/warehouse/confirm.tsx`.
  Tối thiểu: hiển thị cảnh báo khi đạt ngưỡng 100.

### B3. Lưu sổ địa chỉ nuốt lỗi im lặng (ưu tiên: thấp)

- **File:** `app/warehouse/confirm.tsx` (sau `createMutation` thành công).
- **Vấn đề:** `void addCustomerAddress(...).then(refetchProfile).catch(() => undefined)`
  — nếu lưu sổ thất bại (trùng, validate, refresh token), khách không được báo,
  tưởng đã lưu; lần sau mở modal không thấy địa chỉ trong dropdown.
- **Cách sửa:** đổi `.catch` thành thông báo nhẹ, không chặn luồng chính:
  `.catch(() => Toast.show({ type:'info', text1:'Đã tạo phiếu, nhưng chưa lưu được địa chỉ vào sổ' }))`.

### B4. Dead code luồng kho (ưu tiên: thấp — cần quyết định)

- **File:** `src/features/customer-portal/shared/hooks/use-customer-warehouse.ts`
  (`useUpdateShipments`), `src/features/customer-portal/shared/services/customer-warehouse.service.ts`
  (`updateDraftShipments`, `getDraftShipFeePreview`).
- **Vấn đề:** cả 3 không có nơi tiêu thụ (grep toàn repo chỉ thấy định nghĩa). Luồng
  thêm/bớt kiện hiện dùng `addDraftShipments`/`removeDraftShipments`, không dùng
  `updateDraftShipments` (PUT thay cả danh sách). `tsc` không bắt export thừa.
- **Quyết định:**
  - Nếu **không** có kế hoạch "sửa cả danh sách kiện" / "xem trước cước trong app" →
    **xóa** 3 thứ này (gỡ cả import `updateDraftShipments` trong hook).
  - Nếu **có** kế hoạch → giữ, thêm `// TODO: wire khi làm tính năng …` để khỏi nhầm là rác.

### B5. Icon modal xác nhận tạo đơn trên web cứng "shopping-bag" (ưu tiên: thấp, web-only)

- **File:** `app/(tabs)/create-order.tsx` (ModalShell xác nhận, chỉ chạy khi `Platform.OS === 'web'`).
- **Vấn đề:** sau khi mở Ký gửi, dialog xác nhận Ký gửi vẫn hiện icon `shopping-bag`
  (của Mua hộ) thay vì `truck`. Chỉ là lệch hình, không sai dữ liệu.
- **Cách sửa:** chọn icon theo loại đơn — `KY_GUI` dùng `truck`, còn lại dùng `shopping-bag`.

---

## Thứ tự đề xuất

1. B1 (chặn `customerCode` rỗng) — nhanh, giảm rủi ro tạo phiếu mồ côi.
2. B3 (báo lỗi lưu sổ) — nhanh, cải thiện UX.
3. B5 (icon web) — nhanh, cosmetic.
4. B2 (phân trang Thêm kiện) — vừa, làm khi có khách nhiều kiện.
5. B4 (dead code) — chờ xác nhận có dùng `updateDraftShipments`/`ship-fee-preview` không.

## Test Plan / Verification

- Mỗi mục: `npx tsc --noEmit` sạch + `npm run check:encoding` sạch.
- QA thủ công trên dev build (`com.anonymous.tiximaxcustomerapp`):
  - **A1:** Ký gửi để trống "Mã vận đơn" → báo lỗi đỏ, không submit.
  - **A2/B1:** Tạo phiếu giao với địa chỉ mới thiếu phường → báo lỗi; tạo khi profile chưa load → báo "Đang tải hồ sơ".
  - **A3:** mở mã ship A tạo QR, đóng, mở mã ship B → thấy form B (không phải QR của A).
  - **A4:** voucher cố định gắn 1 tuyến → giảm hiển thị ≤ phí tuyến đó.
  - **B2:** tài khoản > 100 kiện khả dụng → có thể tải thêm và chọn kiện thứ > 100.
  - **B3:** giả lập lỗi `addCustomerAddress` → có toast báo "chưa lưu được địa chỉ", phiếu vẫn tạo.
- Backup/commit theo từng mục; chưa commit phần A cho tới khi rà xong.

## Assumptions & rủi ro

- **B1:** giả định BE customer-portal suy ra khách từ token (gửi `customerCode`
  rỗng vẫn hợp lệ). Nếu BE yêu cầu `customerCode` thật → nâng B1 thành bắt buộc
  (chặn cứng + chờ profile).
- **B4:** xóa `updateDraftShipments`/`getDraftShipFeePreview` là không thể đảo nếu sau
  này cần — xác nhận roadmap trước khi xóa.
- Các fix ở Phần A đang ở working tree, **chưa commit**; cần rà diff trước khi commit lên `J2T`.
