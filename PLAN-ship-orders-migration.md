# Kế hoạch: Migrate tab "Giao hàng" (mobile) sang luồng ship-orders

> **TRẠNG THÁI: PR1–PR4 ĐÃ TRIỂN KHAI** (tsc sạch, đã review đối kháng 2 vòng).
> - PR1 ✅ types + service + hooks + query-keys.
> - PR2 ✅ màn `app/ship-orders/[draftId].tsx` + `AllingoTrackingStrip` + book Allingo. (Review: 2 fix.)
> - PR3 ✅ rewrite tab Giao hàng → list ship_orders + banner phiếu LOCKED. (Review: hardening refresh.)
> - PR4 ✅ deprecate 4 hàm Allingo cấp draft.
> - Còn lại: verify thủ công trên emulator/staging.


> Mục tiêu: sửa lỗi "Đặt ship" (modal bật rồi tắt) bằng cách port đúng kiến trúc
> **1 draft LOCKED → N ship_orders** như FE-2, thêm màn **"Tạo đơn giao"** và
> book Allingo theo ship_order.

---

## 1. Bối cảnh & nguyên nhân gốc

- Mobile hiện đặt Allingo ở **cấp draft**: `GET/POST /customer-portal/domestic-deliveries/:id/{shipping-quotes,book-allingo,...}`.
- BE endpoint đó vẫn tồn tại nhưng gọi `validateAllingoBookingEligibility` — chỉ hợp lệ khi draft `carrier=ALLINGO` + `status=EXPORTED` + chưa có đơn. Với draft `LOCKED` (đã sinh ship_orders) → **throw** → `catch` ở [orders.tsx](app/(tabs)/orders.tsx) đóng modal.
- FE-2 (bản đúng) đã chuyển sang **ship_order**: mọi thao tác Allingo nằm ở `/customer-portal/ship-orders/:id/*`, và "Tạo đơn giao" = `POST /customer-portal/ship-orders` từ draft LOCKED.

**Nguồn tham chiếu (FE-2):**
- Service: `src/features/customer-portal/shared/services/ship-order.service.ts`
- Types: `src/features/warehouse/domestic/types/ship-order.types.ts`
- UI Tạo đơn: `src/features/customer-portal/pages/receive-packages-delivery-step.component.tsx`
- UI Book Allingo: `src/features/customer-portal/pages/receive-packages-allingo-booking.component.tsx`

**BE endpoints (đã có sẵn, xác nhận ở `customer-portal.controller.ts`):**
| Method | Path | Dùng cho |
|---|---|---|
| GET | `/customer-portal/draft-domestics/:id/ship-order-summary` | Summary tạo đơn (totalKien/claimedKien/availableKien/shipOrders) |
| POST | `/customer-portal/ship-orders` | Tạo ship_order từ draft LOCKED |
| GET | `/customer-portal/ship-orders?draftDomesticId&status&page&size` | List ship_orders của khách |
| GET | `/customer-portal/ship-orders/:id` | Chi tiết ship_order |
| PATCH | `/customer-portal/ship-orders/:id` | Sửa khi PENDING |
| DELETE | `/customer-portal/ship-orders/:id` | Hủy ship_order (PENDING) |
| GET | `/customer-portal/ship-orders/:id/shipping-quotes` | Báo giá Allingo |
| POST | `/customer-portal/ship-orders/:id/book-allingo` `{serviceId}` | Book Allingo |
| POST | `/customer-portal/ship-orders/:id/sync-allingo` | Đồng bộ trạng thái/tài xế |
| POST | `/customer-portal/ship-orders/:id/cancel-allingo` `{reason}` | Hủy Allingo |

---

## 2. Kiến trúc đích trên mobile

```
Tab "Giao hàng" (danh sách draft domestic — GIỮ NGUYÊN nguồn hiện tại)
  └─ Draft LOCKED → nút "Tạo đơn giao"
        │
        ▼  màn app/ship-orders/[draftId].tsx (MỚI)
   ┌───────────────────────────────────────────────┐
   │ GET /draft-domestics/:id/ship-order-summary    │
   │   → availableKien, shipOrders                  │
   │                                                │
   │ Form tạo: chọn kiện + carrier(JT/ALLINGO/OTHER)│
   │   + địa chỉ/SĐT/giờ hẹn                        │
   │   POST /ship-orders                            │
   │                                                │
   │ Danh sách ship_orders đã tạo (mỗi dòng):       │
   │   - carrier=ALLINGO & chưa book → "Đặt ship"   │
   │       → modal quotes /ship-orders/:id/...      │
   │   - đã book → Đồng bộ / Hủy Allingo            │
   │   - PENDING → Sửa (PATCH) / Xóa (DELETE)       │
   └───────────────────────────────────────────────┘
```

Nguyên tắc: **giữ nguyên** phần list draft + 3 shortcut hiện tại; **thay** hành động
Allingo trực tiếp trên `DomesticDeliveryCard` bằng điều hướng sang màn ship-orders.

---

## 3. Thay đổi theo từng file

### 3.1 MỚI — `src/features/customer-portal/shared/types/ship-order.types.ts`
Port từ FE-2 (rút gọn cho phần customer dùng). Các type cần:
- `ShipOrderStatus = 'PENDING' | 'EXPORTED' | 'CANCELLED'`
- `CarrierCode = 'VNPOST' | 'JT' | 'OTHER' | 'ALLINGO'`
- `AllingoStatus`, `NON_CANCELLABLE_ALLINGO_STATUSES`, `isAllingoCancellationLocked()`
- `ShippingListItem`, `ShipOrder` (đầy đủ field Allingo)
- `CreateShipOrderRequest`, `UpdateShipOrderPayload`
- `AllingoQuote`, `BookAllingoResponse`, `SyncAllingoResponse`, `CancelAllingoRequest`
- `DraftShipOrderSummary` (`totalKien/claimedKien/availableKien/shipOrders`), `ShipOrderSummaryItem`
- `ShipOrderListResponse`
- `SHIP_ORDER_ERROR_CODES` (đặc biệt `ALLINGO_BOOKED_LOCK=10938`, `EMPTY_SHIPPING_LIST=10939`)

> Lưu ý chuẩn hóa: BE có thể trả `totalKien/claimedKien/availableKien` là `string[]` **hoặc** `object[]`, và `shippingList` tương tự — mapper phải normalize về `string[]` / object nhất quán (giống ghi chú trong types FE-2).

### 3.2 MỚI — `src/features/customer-portal/shared/services/ship-order.service.ts`
Theo mẫu service mobile hiện có (`toRecord/toNumber/toString/unwrapResult`, map cả camelCase/snake_case). Các hàm:
- `getShipOrderSummary(draftDomesticId): DraftShipOrderSummary`
- `getCustomerShipOrders({draftDomesticId?, status?, page?, size?}): ShipOrderListResponse`
- `getCustomerShipOrderDetail(shipOrderId): ShipOrder`
- `createCustomerShipOrder(payload: CreateShipOrderRequest): ShipOrder`
- `updateCustomerShipOrder(shipOrderId, payload): ShipOrder`
- `cancelCustomerShipOrder(shipOrderId): void` (DELETE)
- `getAllingoQuotes(shipOrderId): AllingoQuote[]`
- `bookAllingo(shipOrderId, {serviceId}): BookAllingoResponse`
- `syncAllingo(shipOrderId): SyncAllingoResponse`
- `cancelAllingo(shipOrderId, {reason}): void`

`BASE_URL = '/customer-portal/ship-orders'`. Summary dùng `/customer-portal/draft-domestics/:id/ship-order-summary`.

### 3.3 MỚI — `src/features/customer-portal/shared/hooks/use-ship-orders.ts`
- `useShipOrderSummary(draftId | null)` — `enabled: !!draftId`
- `useShipOrders(query)` / `useShipOrderDetail(id)`
- Mutations: `useCreateShipOrder`, `useUpdateShipOrder`, `useCancelShipOrder`, `useBookAllingo`, `useSyncAllingo`, `useCancelAllingo`
- `onSuccess` invalidate: `['customer-portal','ship-orders']`, `['customer-portal','ship-order-summary', draftId]`, và `['customer-portal','domestic-deliveries']`.

### 3.4 SỬA — `src/shared/lib/query/query-keys.ts`
Thêm nhánh:
```ts
shipOrders: {
  summary: (draftId: string | null) => ['customer-portal','ship-order-summary', draftId] as const,
  list: (query: unknown) => ['customer-portal','ship-orders', query] as const,
  detail: (id: string) => ['customer-portal','ship-orders', id] as const,
},
```

### 3.5 MỚI — `app/ship-orders/[draftId].tsx` (màn "Tạo đơn giao")
Port từ `receive-packages-delivery-step.component.tsx` sang RN (dùng component sẵn có: `ModalShell`, `SelectSheet`, `AppInput`, `AppButton`, `ProvinceWardPicker`/`SearchableSelectSheet`, `DatePickerField`, `StatusBadge`, `EmptyState`, `ErrorState`).
Bố cục:
- Header: mã ship của draft + badge LOCKED + thống kê (tổng/đã gán/còn trống kiện).
- Form tạo: `SelectSheet` carrier; nếu `OTHER` hiện input `subCarrierNote` (bắt buộc); địa chỉ (chọn từ sổ / nhập mới, prefill `draft.phoneNumber`); `DatePickerField` + slot giờ (07:00–21:00, bước 30'); multi-select kiện từ `availableKien` (+ nút "Chọn tất cả"); note.
- Submit → `useCreateShipOrder` với `{draftDomesticId, shippingList, carrierCode, subCarrierNote?, address?, phoneNumber?, bookingTime?, note?}`.
- Danh sách ship_orders đã tạo (từ `summary.shipOrders`): mỗi dòng hiện mã, carrier, số kiện, giờ hẹn, status; nút theo điều kiện:
  - `carrierCode==='ALLINGO' && !allingoStatus && status==='PENDING'` → **Đặt ship** (mở modal quotes).
  - `allingoStatus` có giá trị → **Theo dõi/Đồng bộ** + **Hủy Allingo** (ẩn Hủy khi `isAllingoCancellationLocked`).
  - `status==='PENDING'` → **Sửa** (PATCH) / **Xóa** (DELETE).

### 3.6 MỚI — modal/màn book Allingo theo ship_order
Có thể tái dùng modal quotes hiện có (đã có sẵn UI đẹp ở [orders.tsx](app/(tabs)/orders.tsx)) nhưng trỏ vào `getAllingoQuotes(shipOrderId)` + `bookAllingo(shipOrderId, {serviceId})`. Tận dụng logic vừa sửa (giữ modal mở khi lỗi, hiện `ErrorState` + Thử lại).

### 3.7 SỬA — `app/(tabs)/orders.tsx` (tab Giao hàng)
- **Bỏ** import và lời gọi Allingo cấp draft: `getDomesticDeliveryShippingQuotes`, `bookAllingoForDomesticDelivery`, `cancelAllingoForDomesticDelivery`, `syncAllingoForDomesticDelivery`.
- `DomesticDeliveryCard`: thay các nút Đặt/Đồng bộ/Hủy bằng **1 nút điều hướng** `router.push('/ship-orders/' + draftId)` — nhãn tùy `status`:
  - `LOCKED` → "Tạo đơn giao".
  - đã có ship_order → "Xem đơn giao".
  - chưa LOCKED (`DRAFT`) → giữ hướng dẫn hoàn tất ở màn Địa chỉ giao.
- Bỏ state `quoteItem/quotes/loadingQuotes/quotesError` và modal quotes khỏi tab (chuyển sang màn ship-orders).

### 3.8 SỬA — `src/features/customer-portal/shared/services/customer-portal.service.ts`
Đánh dấu `@deprecated` (hoặc xóa) 4 hàm Allingo cấp draft sau khi màn mới hoạt động:
`getDomesticDeliveryShippingQuotes`, `bookAllingoForDomesticDelivery`, `cancelAllingoForDomesticDelivery`, `syncAllingoForDomesticDelivery`. Giữ lại tới khi UI mới thay thế hoàn toàn để tránh vỡ.

### 3.9 SỬA — `app/_layout.tsx` (nếu cần khai báo route)
Expo Router tự nhận `app/ship-orders/[draftId].tsx`; kiểm tra header/title. Cân nhắc thêm route `book` riêng nếu tách màn book Allingo.

---

## 4. Hợp đồng dữ liệu quan trọng

`CreateShipOrderRequest` (POST /ship-orders):
```ts
{
  draftDomesticId: number;         // Number(draftDomesticId)
  shippingList: string[];          // tracking codes chọn từ availableKien
  carrierCode: 'JT'|'ALLINGO'|'OTHER'|'VNPOST';
  subCarrierNote?: string|null;    // bắt buộc khi carrier=OTHER
  address?: string|null;           // null = dùng địa chỉ draft
  phoneNumber?: string|null;       // 10-11 số
  bookingTime?: string|null;       // ISO (ngày + slot giờ)
  note?: string|null;
}
```
`DraftShipOrderSummary` (GET .../ship-order-summary): `{ draftDomesticId, shipCode, draftStatus, totalKien[], claimedKien[], availableKien[], shipOrders[] }`.

---

## 5. Xử lý lỗi / edge cases

- **Draft chưa LOCKED:** không cho tạo ship_order — hướng dẫn khách hoàn tất/khoá phiếu trước (BE sẽ chặn; hiện message rõ).
- **`ALLINGO_BOOKED_LOCK` (10938):** đã book Allingo → khóa Sửa carrier/kiện/địa chỉ; ẩn/disable nút Sửa.
- **`EMPTY_SHIPPING_LIST` (10939):** khi PATCH còn 0 kiện → dùng DELETE thay vì update.
- **Hủy Allingo:** chỉ khi `allingoStatus==='pending'`; ẩn nút khi `isAllingoCancellationLocked` (picked_up/delivering/delivered).
- **Modal lỗi:** giữ nguyên pattern vừa áp (không đóng modal, hiện `ErrorState` + Thử lại, đọc `error.response.data.message`).
- **Nhiều draft LOCKED / fallback thiếu draftId:** như FE-2 — nếu vào màn không kèm draftId, tra `domestic-deliveries` lọc `status==='LOCKED'`; 1 cái → dùng luôn, nhiều → cho chọn.

---

## 6. Thứ tự triển khai (đề xuất PR nhỏ)

1. **PR1 — nền tảng:** types + service + hooks + query-keys (không đụng UI). Có thể viết test mapper.
2. **PR2 — màn Tạo đơn giao:** `app/ship-orders/[draftId].tsx` + book Allingo theo ship_order (tái dùng modal quotes).
3. **PR3 — nối tab Giao hàng:** sửa `DomesticDeliveryCard` điều hướng sang màn mới; gỡ state/handler Allingo cũ khỏi `orders.tsx`.
4. **PR4 — dọn dẹp:** deprecate/xóa 4 hàm Allingo cấp draft trong `customer-portal.service.ts`.

---

## 7. Kiểm thử

- `npx tsc --noEmit` sạch sau mỗi PR.
- Thủ công trên emulator (theo memory [[run-mobile-scanner-emulator]] / [[customer-app-env-switch]] — staging):
  1. Draft LOCKED → Tạo đơn giao (JT) → thấy ship_order PENDING.
  2. Tạo ship_order carrier=ALLINGO → "Đặt ship" → **modal quotes hiện danh sách** (không tắt) → chọn → book thành công.
  3. Đồng bộ trạng thái, hủy Allingo (khi pending), sửa/xóa ship_order PENDING.
  4. Kiểm tra các nhánh lỗi 10938/10939.
- Đối chiếu hành vi với FE-2 trên cùng tài khoản staging.

---

## 8. Quyết định (đã chốt — hướng: đơn giản, tracking-first)

1. **KHÔNG** port J&T scan-to-ship (là luồng của staff). Customer app: carrier chỉ ở
   mức **khai báo** (JT / OTHER / ALLINGO). Chỉ **Allingo** có luồng book tương tác.
2. Book Allingo dùng **bottom-sheet (ModalShell) ngay trong màn ship-orders** — không
   tách route riêng. Ít điều hướng, hợp mobile.
3. **KHÔNG** làm màn theo dõi tài xế riêng. Gộp **status + tài xế** vào ngay card
   ship_order (tracking strip gọn). Đủ để khách tracking mà không phải chuyển màn.

---

## 9. Thiết kế UX — màn Đơn hàng (đơn giản, tracking-first)

Nguyên tắc: **1 màn hình = 1 việc rõ ràng**, thông tin tracking nổi bật, tái dùng
ngôn ngữ thiết kế của `OrderCard` đã làm (thumbnail bo góc, badge trạng thái semantic,
hàng chỉ số 3 cột, khối nhấn mạnh nền nhạt). Chỉ redesign **tab Giao hàng** + màn
ship-orders; 2 tab kia giữ nguyên `OrderCard`.

### 9.1 Tab "Giao hàng" — đổi trọng tâm sang ship_order (đơn giao thực tế)

Hiện tại tab list draft + book Allingo cấp draft (sai). Đổi thành **list ship_orders**
(cái khách thực sự cần tracking), kèm 1 banner CTA gom các phiếu LOCKED chưa tạo đơn.

```
┌───────────────────────────────────────────────┐
│  ĐƠN HÀNG                                       │
│  [ Đang xử lý ] [ Lịch sử ] [ Giao hàng• ]      │
│                                                 │
│  ┌─ có phiếu sẵn sàng ────────────────────────┐ │
│  │ 📦 2 phiếu sẵn sàng tạo đơn giao   [Tạo →] │ │  ← banner, ẩn nếu =0
│  └────────────────────────────────────────────┘ │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ C01921-4-SO1              [ĐANG GIAO]      │  │  ← card ship_order
│  │ Allingo · 2 kiện · 3.5 KG                  │  │
│  │ ●──●──◐──○  Đã lấy · Đang giao             │  │  ← tracking strip
│  │ 🛵 Nguyễn Văn A · 0901234567 · 59P1-12345  │  │  ← tài xế (khi đã lấy)
│  │ Phí Allingo: 35.000 đ                      │  │
│  │              [ Đồng bộ ]   [ Chi tiết ]    │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │ C01921-4-SO2   J&T        [CHỜ LẤY HÀNG]   │  │  ← carrier thường: gọn hơn
│  │ J&T · 1 kiện · giao 21/06 14:00            │  │
│  └──────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```
- Nguồn: `GET /customer-portal/ship-orders` (poll 30s như hiện tại).
- Banner "phiếu sẵn sàng": đếm draft `status==='LOCKED'` từ `domestic-deliveries`; tap → màn Tạo đơn giao.
- Card ALLINGO hiện **tracking strip 4 mốc** (Chờ lấy → Đã lấy → Đang giao → Đã giao) map từ `allingoStatus`; tài xế hiện khi `picked_up+`. Carrier thường (JT/OTHER) chỉ hiện status + giờ hẹn.
- Giữ 3 shortcut (Xác nhận / Địa chỉ / Thanh toán ship) — chuyển thành hàng nút gọn ở đầu tab hoặc trong màn liên quan.

### 9.2 Màn "Tạo đơn giao" — `app/ship-orders/[draftId].tsx`

Tinh giản từ form 2 cột của FE-2 xuống **1 cột cuộn dọc**, gom theo khối:

```
┌───────────────────────────────────────────────┐
│  ← Tạo đơn giao                                 │
│  ┌ Phiếu C01921-4  [LOCKED] ─────────────────┐  │
│  │  Tổng 5 · Đã gán 3 · Còn trống 2 kiện      │  │  ← summary 3 số
│  └────────────────────────────────────────────┘ │
│                                                 │
│  Đơn vị vận chuyển                              │
│  [ Allingo ▾ ]                                  │
│  Địa chỉ giao   [ chọn từ sổ / nhập mới ▾ ]     │
│  SĐT            [ 0901234567 ]                   │
│  Giờ hẹn lấy    [ 21/06 ▾ ] [ 14:00 ▾ ]         │
│  Chọn kiện (2)  [ ☑ VN123  ☑ VN124 ]  Chọn tất cả│
│  Ghi chú        [ ................ ]             │
│         [ Tạo đơn giao ]                         │
│                                                 │
│  ── Đơn giao đã tạo (2) ───────────────────     │
│  • C01921-4-SO1  Allingo · 2 kiện  [ĐẶT SHIP]   │  ← CTA theo trạng thái
│  • C01921-4-SO2  J&T · 1 kiện      PENDING  ✎ 🗑 │
└───────────────────────────────────────────────┘
```
- Component tái dùng: `SelectSheet`, `AppInput`, `DatePickerField`, `ProvinceWardPicker`, `StatusBadge`, `AppButton`, `EmptyState`, `ErrorState`.
- "Đặt ship" (chỉ ship_order ALLINGO chưa book) → mở bottom-sheet quotes.

### 9.3 Bottom-sheet "Đặt ship" (quotes) — tái dùng UI hiện có

```
┌ Chọn đơn vị vận chuyển ──────────────┐
│ ○ Giao nhanh 2h      45.000 đ  ⚡     │
│ ● Giao tiết kiệm     35.000 đ  🕐     │   ← chọn → xác nhận
│ ────────────────────────────────────  │
│ Tổng phí: 35.000 đ    [ Xác nhận ]    │
└───────────────────────────────────────┘
```
- Trỏ `getAllingoQuotes(shipOrderId)` / `bookAllingo(shipOrderId,{serviceId})`.
- Giữ pattern lỗi vừa sửa: **không đóng sheet khi lỗi**, hiện `ErrorState` + Thử lại.

### 9.4 Tracking strip (component dùng chung `AllingoTrackingStrip`)
Map `allingoStatus` → 4 mốc; mốc hiện tại tô `colors.primary`, đã qua tô `successText`:
`pending→Chờ lấy · picked_up→Đã lấy · delivering→Đang giao · delivered→Đã giao`
(`failed/canceled` → hiện badge đỏ + lý do `allingoFailureReason/allingoCancellationReason`).

---

## 10. Câu hỏi mở còn lại

- Tab Giao hàng nên **chỉ list ship_orders** (mục 9.1) hay vẫn giữ list draft và ẩn
  ship_orders vào trong màn Tạo đơn giao? (Đề xuất: list ship_orders — tracking rõ nhất.)
