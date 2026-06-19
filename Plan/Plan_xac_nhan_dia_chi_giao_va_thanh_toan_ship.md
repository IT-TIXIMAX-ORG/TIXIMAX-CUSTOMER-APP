# KẾ HOẠCH: Thêm "Xác nhận địa chỉ giao" & "Tạo thanh toán ship" cho app mobile

## Context — vì sao làm

Bản web `TIXIMAX-FE-2` đã có đủ chuỗi self-service kho VN cho khách:
**hàng về kho VN → xác nhận + gán địa chỉ giao (tạo phiếu giao nội địa) → sinh mã ship → tạo thanh toán phí ship (QR) → đặt giao Allingo.**

App mobile `tiximax-customer-app` hiện **chỉ có khúc cuối**: danh sách giao nội địa + đặt/huỷ/đồng bộ Allingo (tab "Nội địa" trong `app/(tabs)/orders.tsx`), render QR trong chi tiết đơn, và CRUD địa chỉ ví cá nhân. **Thiếu 2 mắt xích đầu**:
1. **Xác nhận địa chỉ giao** — khách không thể tự xem kiện đã về kho VN rồi gom + gán địa chỉ giao để tạo phiếu giao.
2. **Tạo thanh toán ship** — khách không thể tự xem cước theo mã ship và thanh toán (QR).

Kết quả mong muốn: khách hoàn tất toàn bộ chuỗi ngay trên app, không cần web/nhân viên thao tác hộ.

## Summary

- Port 2 feature từ web sang mobile, **bám đầy đủ** logic/endpoint của web.
- **Feature 1 (full luồng kho VN):** màn "Xác nhận nhận hàng" (chọn kiện đã về kho VN + nhập địa chỉ giao + chọn đơn vị vận chuyển → tạo phiếu giao) **và** màn "Danh sách phiếu giao / địa chỉ" (sửa địa chỉ–SĐT–ghi chú, thêm/bớt kiện, xoá phiếu).
- **Feature 2 (ship payment đầy đủ):** màn danh sách mã ship (lọc chưa/đã TT + tìm kiếm + lọc ngày) → sheet thanh toán (dùng số dư ví + bank cố định TIXIMAX + voucher cá nhân/hệ thống) → dialog QR + auto-poll trạng thái tới khi `LOCKED`.
- **Điều hướng:** thêm màn dạng **stack push**, giữ nguyên 5 bottom tab. Điểm vào từ khu "Nội địa" của tab Đơn hàng + nút action ở Dashboard.
- Tái dùng tối đa thành phần mobile sẵn có; tách `PaymentSessionCard` ra component chung để dùng lại cho QR ship.

## Phạm vi & quyết định (đã chốt với chủ dự án)

| Hạng mục | Quyết định |
|---|---|
| Phạm vi (1) | Toàn bộ luồng kho VN: xác nhận kiện → tạo phiếu giao + màn quản lý danh sách phiếu (sửa/thêm-bớt kiện/xoá) |
| Vị trí | Stack push, giữ 5 tab |
| Phạm vi (2) | Bám web đầy đủ: list + sheet (ví + bank cố định + voucher) + QR + auto-poll |

## Kiến trúc mobile & quy ước (tái dùng)

Layered: **Screen (`app/*`) → Hook (`features/*/hooks`) → Service (`features/*/services`) → `httpClient`**. Data = TanStack Query, auth = Zustand + interceptor tự refresh 401/403. UI tự xây, brand `#F7B82D` qua `src/theme/tokens.ts`.

Thành phần **tái dùng** (đường dẫn từ gốc `tiximax-customer-app`):
- HTTP: `src/shared/lib/http/http-client.ts` (`httpClient`, đã gắn token + unwrap).
- Query keys: `src/shared/lib/query/query-keys.ts` → **mở rộng** thêm nhánh `warehouse` & `shipPayment`.
- Địa chỉ: `src/components/address/ProvinceWardPicker.tsx` (+ `src/components/ui/SearchableSelectSheet.tsx`, data `src/shared/data/vn-administrative-units.json`).
- UI kit: `src/components/ui/` → `ModalShell`, `SelectSheet`, `SearchableSelectSheet`, `AppButton`, `AppInput`, `AppCard`, `StatusBadge`, `EmptyState`, `ErrorState`, `SegmentedControl`, `DatePickerField`.
- Tiện ích: `src/shared/lib/utils.ts` (`formatCurrency`, `formatDate`, `formatWeight`), `src/shared/lib/labels.ts` (`statusLabel`, `humanizeEnum`), `src/shared/lib/notify.ts` (Toast), `src/shared/lib/layout/safe-area.ts`.
- Service/types/hook customer-portal sẵn có: `src/features/customer-portal/shared/{services,types,hooks}/...` (mở rộng, không phá vỡ).

## File web tham chiếu (port logic 1-1)

Đọc kỹ và bám sát các file của `TIXIMAX-FE-2` để mirror nghiệp vụ:
- **Ship payment:** `src/features/customer-portal/shared/services/shipping-payment.service.ts`, `.../types/shipping-payment.types.ts`, `.../pages/shipping-payment.page.tsx`, `.../components/shipping-payment/ship-payment-modal.component.tsx`, `.../components/shipping-payment/customer-payment-session-dialog.component.tsx`.
- **Kho VN / phiếu giao:** `src/features/customer-portal/shared/services/customer-warehouse-domestic.service.ts`, `src/features/customer-portal/shared/hooks/use-customer-warehouse-domestic.ts`, các component `customer-warehouse-confirm-board`, `customer-warehouse-available-table`, `customer-warehouse-filters`, `customer-delivery-address-board`, `customer-delivery-address-modal`; types `src/features/warehouse/domestic/types/warehouse-domestic.types.ts` (DraftDomesticAddPayload / AvailableQuery / UpdateInfoPayload) + adapter `warehouse-domestic-adapter.service.ts` (mapper `mapDraftDomesticAvailableItem`/`mapDraftDomesticAddressItem`).

## Endpoints cần wire (mobile mới)

**Kho VN / phiếu giao** — prefix `/customer-portal/draft-domestics`:

| Method | Path | Dùng cho |
|---|---|---|
| GET | `/carriers` | Danh sách đơn vị vận chuyển |
| GET | `/available-add` | Kiện đã về kho VN, có thể gom vào phiếu (params: page,size,shipmentCode,status,carrier,startDate,endDate,routeId) |
| GET | `/` | Danh sách phiếu giao (params: page,size,shipmentCode,status,carrier) |
| POST | `/` | Tạo phiếu giao (địa chỉ + carrier + danh sách kiện) |
| PUT | `/{id}/info` | Sửa địa chỉ/SĐT/ghi chú/carrier |
| DELETE | `/{id}` | Xoá phiếu |
| POST | `/{id}/shipments/add` · `/remove` | Thêm/bớt kiện |
| PUT | `/{id}/shipments` | Cập nhật danh sách kiện |
| GET | `/{id}/ship-fee-preview`, `/{id}/ship-order-summary` | Xem trước cước (optional, dùng cho màn chi tiết phiếu) |

**Ship payment**:

| Method | Path | Dùng cho |
|---|---|---|
| GET | `/customer-portal/draft-domestics/ship-code/payment` | List mã ship + cước (params: payment,page,size,keyword,dateFrom,dateTo) |
| POST | `/customer-portal/draft-domestics/ship-code/{shipCode}/payment` | Tạo thanh toán (body: `isUseBalance`, `bankId`, `customerVoucherId?`, `systemVoucherIds?`) |
| GET | `/customer-portal/bank-accounts` | Bank nhận tiền (revenue) |

Nhánh kết quả `POST .../payment`: `collected_amount === 0` → ví phủ hết, auto-confirm (phiếu `LOCKED`); `> 0` → trả QR (`qr_code`, `payment_code`, `content`, `collected_amount`) → mở dialog QR + poll `getShipCodePayments({keyword, payment:true})` tới khi `payment === true`.

## Chi tiết triển khai

### A. Tầng service + types + hooks (mobile mới)

1. **`src/features/customer-portal/shared/types/shipping-payment.types.ts`** (mới) — copy nguyên từ web: `ShipCodePaymentItem`, `FeeBreakdown`, `RouteSummary`, `ShipCodePaymentListResult`, `ShipCodePaymentQuery`, `CreateShipPaymentRequest`, `ShipPaymentResult` (snake_case, amount kiểu string), `BankAccount`, `ShipPaymentErrorCode`.
2. **`src/features/customer-portal/shared/services/shipping-payment.service.ts`** (mới) — copy từ web: `getShipCodePayments`, `createShipPayment`, `getBankAccounts`, `pollPaymentStatus`. Đổi import `httpClient` sang `@/src/shared/lib/http/http-client`.
3. **`src/features/customer-portal/shared/types/warehouse-domestic.types.ts`** (mới) — port các type cần: `DraftDomesticAvailableItem`, `DraftDomesticAddressItem`, `DraftDomesticAddPayload`, `DraftDomesticUpdateInfoPayload`, `DraftDomesticShipmentMutationPayload`, `Carrier`. (Xác nhận shape từ web types + adapter.)
4. **`src/features/customer-portal/shared/services/customer-warehouse.service.ts`** (mới) — port từ `customer-warehouse-domestic.service.ts`: carriers, available-add, list draft, create, update-info, delete, shipments add/remove/update, ship-fee-preview. Gói mapper tương đương `mapDraftDomesticAvailableItem`/`mapDraftDomesticAddressItem` ngay trong file (mobile không có sẵn adapter web).
5. **Hooks** (mới):
   - `src/features/customer-portal/shared/hooks/use-ship-payments.ts`: `useShipCodePayments(query)`, `useCreateShipPayment()` (mutation), `useBankAccounts()`.
   - `src/features/customer-portal/shared/hooks/use-customer-warehouse.ts`: `useCarriers()`, `useAvailableShipments(query)`, `useDraftDomestics(query)`, mutations `useCreateDraftDomestic()`, `useUpdateDraftInfo()`, `useDeleteDraft()`, `useAddShipments()`, `useRemoveShipments()`. Theo đúng pattern hook hiện có (`enabled: isAuthenticated`, `refetchOnWindowFocus:false`); mutation `onSuccess` invalidate các key liên quan + `['customer-portal','domestic-deliveries']`.
6. **`src/shared/lib/query/query-keys.ts`** — thêm:
   ```ts
   warehouse: {
     carriers: () => ['customer-portal','warehouse','carriers'] as const,
     available: (q) => ['customer-portal','warehouse','available', q] as const,
     drafts: (q) => ['customer-portal','warehouse','drafts', q] as const,
   },
   shipPayment: {
     list: (q) => ['customer-portal','ship-payment', q] as const,
     bankAccounts: () => ['customer-portal','ship-payment','banks'] as const,
   },
   ```

### B. Tách component QR dùng chung

- Trích `PaymentSessionCard` đang nằm trong `app/orders/[id].tsx` ra **`src/components/payment/PaymentSessionCard.tsx`** (giữ nguyên hành vi: render `Image` QR + copy `payment_code`/`content` bằng `expo-clipboard`, **không hiển thị `session.amount`** theo `Rule/order-label-rules.md`). Cập nhật `app/orders/[id].tsx` import từ vị trí mới (không đổi UI).
- Ở dialog QR ship: map `ShipPaymentResult` → shape session mà `PaymentSessionCard` nhận (`paymentCode`, `qrCode`, `content`, `status`...), hiển thị **`collected_amount`** riêng ở header dialog (đúng rule: amount không nằm trên QR card).

### C. Feature 1 — Xác nhận địa chỉ giao (màn + component)

- **`app/warehouse/confirm.tsx`** — "Xác nhận nhận hàng":
  - Query `useAvailableShipments` (kiện đã về kho VN). FlatList + bộ lọc (shipmentCode/status/carrier) trong `ModalShell`. Mỗi item chọn được (multi-select).
  - Nút "Tạo phiếu giao" mở form (ModalShell hoặc push `app/warehouse/new.tsx`): `ProvinceWardPicker` + `AppInput` SĐT/ghi chú + `SelectSheet` chọn carrier (từ `useCarriers`) → `useCreateDraftDomestic` (POST `/draft-domestics`). Thành công → Toast + điều hướng sang danh sách phiếu, invalidate `domestic-deliveries`.
- **`app/warehouse/addresses.tsx`** — "Danh sách phiếu giao / địa chỉ":
  - Query `useDraftDomestics`. List `DraftDomesticCard` (mã ship, trạng thái qua `StatusBadge`, địa chỉ, số kiện).
  - Mỗi phiếu: sửa địa chỉ/SĐT/ghi chú (`useUpdateDraftInfo`), thêm/bớt kiện (`useAddShipments`/`useRemoveShipments` + chọn từ available), xoá (`useDeleteDraft`, xác nhận bằng `Alert.alert`). Khoá sửa khi `status === 'LOCKED'`.
- Components mới gom trong `src/features/customer-portal/components/warehouse/`: `AvailableShipmentItem`, `DeliveryAddressForm`, `DraftDomesticCard`, `WarehouseFilterSheet`.

### D. Feature 2 — Tạo thanh toán ship (màn + component)

- **`app/shipping-payments/index.tsx`** — danh sách mã ship:
  - `SegmentedControl` "Chưa thanh toán / Đã thanh toán" (map `payment` false/true), `AppInput` tìm kiếm, `DatePickerField` lọc ngày. Query `useShipCodePayments`.
  - List `ShipCodePaymentCard`: mã ship, trọng lượng, `totalPriceShip`, phí ngoại, số dư, trạng thái (`paid`/`notReady` khi `!isReadyForPayment`/`waitingPayment`). Nút "Thanh toán" khoá khi `!isReadyForPayment` hoặc đã `payment`.
- **`ShipPaymentSheet`** (`ModalShell`): bóc cước từ `feeBreakdown` (giống web), checkbox "Dùng số dư ví", bank cố định TIXIMAX (id `'2'`, disabled), 2 input voucher (cá nhân/hệ thống), nút Xác nhận → `useCreateShipPayment`. Map `ShipPaymentErrorCode` ra Toast message (port nguyên các nhánh lỗi từ web `ship-payment-modal`).
- **`ShipPaymentQrDialog`** (`ModalShell`): nếu `collected_amount > 0` hiện `PaymentSessionCard` (QR) + header số tiền cần trả; chạy `pollPaymentStatus(shipCode)` (interval 3s, tối đa 30 lần) → khi `LOCKED` thì Toast thành công, đóng, refetch list. Nếu `collected_amount === 0` thì bỏ qua dialog, Toast "đã thanh toán bằng ví", refetch.
- Components mới trong `src/features/customer-portal/components/shipping-payment/`: `ShipCodePaymentCard`, `ShipPaymentSheet`, `ShipPaymentQrDialog`.

### E. Điều hướng & điểm vào (giữ 5 tab)

- Thêm route stack (sibling của `(tabs)`, giống `app/orders/[id].tsx`): `app/warehouse/confirm.tsx`, `app/warehouse/addresses.tsx`, `app/shipping-payments/index.tsx`. Header tuỳ biến theo pattern màn `app/orders/[id].tsx` (back + title); điều hướng bằng `router.push('/warehouse/confirm')`, `'/warehouse/addresses'`, `'/shipping-payments'`.
- **Điểm vào:** trong `app/(tabs)/orders.tsx` (segment "Nội địa") thêm thanh nút "Xác nhận nhận hàng" · "Địa chỉ giao" · "Thanh toán ship"; thêm nút action tương ứng ở dashboard `app/(tabs)/index.tsx`.
- Nếu cần nhóm header riêng có thể thêm `app/warehouse/_layout.tsx` (Stack) — optional, không bắt buộc.

## Quy tắc tuân thủ (thư mục `Rule/`)

- Trạng thái/nhãn: dùng `statusLabel`/`humanizeEnum` từ `src/shared/lib/labels.ts`, **không render enum thô**; bổ sung nhãn cho status phiếu giao (`EXPORTED`, `LOCKED`) và status ship payment vào bảng map của `labels.ts`.
- **QR card không hiển thị `amount`** (giữ đúng `PaymentSessionCard`); số tiền hiển thị ở sheet/dialog header.
- Không hardcode version; UI tiếng Việt; dùng token màu (`colors.primary` thay vì hex rời); touch target ≥ 44px; font size tối thiểu `xs = 11`.

## Test Plan / Verification

- `npx tsc --noEmit` sạch lỗi.
- `npm run check:encoding` (kiểm tra tiếng Việt) sạch.
- QA thủ công trên **dev build** (`com.anonymous.tiximaxcustomerapp`) theo chuỗi đầu-cuối:
  1. Vào "Xác nhận nhận hàng" → thấy kiện đã về kho VN → chọn kiện + nhập địa chỉ (ProvinceWardPicker) + chọn carrier → tạo phiếu → phiếu xuất hiện ở "Địa chỉ giao".
  2. Sửa địa chỉ/SĐT phiếu; thêm/bớt kiện; xoá phiếu; kiểm tra phiếu `LOCKED` bị khoá sửa.
  3. Vào "Thanh toán ship" → lọc chưa TT → mở sheet → (a) tick dùng ví đủ trả: auto-confirm, phiếu chuyển `LOCKED`; (b) không đủ ví: hiện QR, poll tới khi `LOCKED`, list tự refetch.
  4. Kiểm tra map lỗi BE (vd `DOMESTIC_TRACKING_NOT_IN_VN_WAREHOUSE`, `PARTIAL_SHIPMENT_ALREADY_PENDING`) hiện Toast đúng.
  5. Đối chiếu phiếu vừa tạo dùng được ở tab "Nội địa" để đặt Allingo (chuỗi nối liền mạch).
- Backup tag/commit trước khi sửa; commit theo từng phần (service → hooks → feature 1 → feature 2 → điều hướng).

## Assumptions & rủi ro

- **Body POST `/customer-portal/draft-domestics` (`DraftDomesticAddPayload`)** và shape `available-add`/`carriers` cần xác nhận lại từ web types + adapter trước khi code service (đã trỏ file tham chiếu ở mục trên). Đây là rủi ro chính nếu BE trả khác web.
- Mobile chưa có adapter `warehouse-domestic-adapter.service.ts` như web → phải tự viết mapper trong service mới.
- Bank thanh toán hiện hardcode TIXIMAX (id `'2'`) giống web; nếu BE yêu cầu chọn từ `/bank-accounts` thì thay `SelectSheet` (đã có `useBankAccounts`).
- expo-router: route ngoài `(tabs)` cần đảm bảo header/back nhất quán; theo đúng pattern `app/orders/[id].tsx`.
- Không sửa logic Allingo/đơn hàng hiện có ngoài việc thêm điểm vào điều hướng + tách `PaymentSessionCard`.
