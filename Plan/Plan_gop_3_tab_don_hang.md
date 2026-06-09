# KẾ HOẠCH: GỘP 3 TAB MÀN "ĐƠN HÀNG" THÀNH 1 + LỌC THEO NHÓM

**Tính năng:** Gộp 3 tab (Đang xử lý / Lịch sử / Nội địa) trong màn `Đơn hàng` thành một danh sách duy nhất, đưa việc chọn nhóm vào bộ lọc.
**Trạng thái:** Sẵn sàng triển khai (Ready for Dev)
**File chính bị tác động:** [app/(tabs)/orders.tsx](app/(tabs)/orders.tsx) (chiếm ~95% công việc) + 1 thay đổi nhỏ tuỳ chọn ở [use-customer-portal-data.ts](src/features/customer-portal/shared/hooks/use-customer-portal-data.ts)

---

## PHẦN 0: QUYẾT ĐỊNH ĐÃ CHỐT (đầu vào của plan)

| # | Quyết định | Lựa chọn |
|---|---|---|
| 1 | Cách gộp & xử lý trùng đơn | **Lọc theo nhóm**: bỏ thanh tab, thêm trường **"Nhóm đơn"** vào bộ lọc (`Tất cả / Đang xử lý / Lịch sử / Nội địa`). Giữ nguyên 3 nguồn dữ liệu & 3 kiểu thẻ. Khi chọn **"Tất cả"** sẽ **khử trùng theo `orderId`**. |
| 2 | Phân trang ("Tải thêm") | **Tải thêm theo từng nguồn**: mỗi nguồn giữ con trỏ trang riêng (`activePage`/`historyPage`/`domesticPage`). Ở chế độ "Tất cả", nút "Tải thêm" sẽ tăng trang cho **mọi nguồn còn dữ liệu**. |

---

## PHẦN 1: HIỆN TRẠNG (THE "AS-IS")

Màn hình hiện dùng `SegmentedControl` với 3 tab, mỗi tab là một "thế giới" riêng:

| Thuộc tính | Tab **Đang xử lý** | Tab **Lịch sử** | Tab **Nội địa** |
|---|---|---|---|
| `activeTab` | `'active'` | `'history'` | `'domestic'` |
| Hook | `useCustomerActiveOrders` | `useCustomerOrders` | `useCustomerDomesticDeliveries` |
| API | `/customer-portal/orders/active` | `/customer-portal/orders` | `/customer-portal/domestic-deliveries` |
| Kiểu dữ liệu | `CustomerActiveOrder` | `CustomerOrder` | `CustomerDomesticDeliveryItem` |
| Khóa (key) | `orderId` | `orderId` | `draftDomesticId` |
| Thẻ render | `ActiveOrderCard` (giàu thông tin: journey, tracking) | `OrderListItem` (gọn) | `DomesticDeliveryCard` (inline, có nút hành động) |
| Mở chi tiết | `/orders/{orderId}` | `/orders/{orderId}` | ❌ Không mở chi tiết |
| Phân trang | `activePage` / `activeItems` | `historyPage` / `historyItems` | `domesticPage` / `domesticItems` |
| Query lọc | `CustomerActiveOrderQuery` (keyword, type, `orderMainStatusIn[]`, dateFrom/To, sort) | `CustomerOrderQuery` (keyword, type, `status`, dateFrom/To) | ❌ **Không có filter** (chỉ `page`/`size`) |
| Tự refetch | Không | Không | Có — mỗi 30s |

### 3 điểm "gai" cần lưu ý
1. **Đang xử lý ⊆ Lịch sử (trùng đơn):** endpoint `/orders` là tập cha (toàn bộ đơn, kể cả đang chạy). `/orders/active` chỉ là các đơn đang chạy nhưng kèm dữ liệu hành trình. → Cùng một `orderId` có thể xuất hiện ở cả hai. **Bắt buộc khử trùng khi "Tất cả".**
2. **Nội địa là thực thể khác loại:** key khác (`draftDomesticId`), không mở trang chi tiết, có nút Đặt ship/Đồng bộ/Hủy, và **API không nhận tham số lọc** → mọi filter cho nội địa phải làm **ở phía client**.
3. **3 con trỏ trang độc lập:** không thể dùng 1 biến page chung.

---

## PHẦN 2: THIẾT KẾ GIẢI PHÁP (THE "TO-BE")

### 2.1. Mô hình hiển thị
- **Bỏ `SegmentedControl`.** Thay bằng một biến trạng thái `group: 'all' | 'active' | 'history' | 'domestic'` (mặc định `'all'`), **nằm trong bộ lọc**.
- Thanh filter (ô tìm kiếm + nút lọc) **luôn hiển thị** (hiện tại đang ẩn ở tab Nội địa).
- Một `FlatList` duy nhất render hỗn hợp 3 kiểu thẻ, chọn thẻ theo **loại dữ liệu của từng item** (không theo tab nữa).

### 2.2. Thứ tự danh sách khi chọn "Tất cả"
Giữ thứ tự **theo nhóm** (KHÔNG sort trộn theo ngày — vì sort toàn cục sẽ phá vỡ cơ chế "tải thêm theo từng nguồn"):

```
[ Đang xử lý ]  → activeItems
[ Lịch sử ]     → historyItems đã loại các orderId đã có trong activeItems
[ Nội địa ]     → domesticItems (đã lọc client theo keyword/ngày)
```

> *Tuỳ chọn nâng cao (không bắt buộc):* chèn dòng tiêu đề phân nhóm ("Đang xử lý", "Lịch sử", "Nội địa") giữa các cụm để rõ ràng hơn. Xem mục 5.

### 2.3. Áp dụng bộ lọc theo từng nhóm

| Bộ lọc | Đang xử lý (server) | Lịch sử (server) | Nội địa (client) |
|---|---|---|---|
| Từ khóa | `keyword` | `keyword` | Lọc client trên `shipCode`, `address`, `phoneNumber`, `carrierName` |
| Loại đơn (`MUA_HO`...) | `type` | `type` | **Không áp dụng** → ở "Tất cả" nếu đặt Loại đơn thì **ẩn nội địa** |
| Trạng thái | `orderMainStatusIn:[status]` | `status` | **Không áp dụng** → ở "Tất cả" nếu đặt Trạng thái thì **ẩn nội địa** |
| Từ ngày / Đến ngày | `dateFrom`/`dateTo` | `dateFrom`/`dateTo` | Lọc client trên `createdAt` |

Lý do: "Loại đơn" và "Trạng thái" là khái niệm của đơn mua hộ/ký gửi/đấu giá, không có ý nghĩa với đơn vận chuyển nội địa Allingo. Khi người dùng cố ý lọc theo 2 tiêu chí này thì hiển nhiên họ đang tìm đơn hàng, nên ta loại nội địa khỏi kết quả "Tất cả".

### 2.4. Phân trang ("Tải thêm")
- **Nhóm đơn = một nguồn cụ thể:** y như hiện tại (tăng đúng con trỏ của nguồn đó).
- **Nhóm đơn = Tất cả:** nút "Tải thêm" tăng trang cho **mọi nguồn còn `total > items.length`**.
- Footer "Tải thêm" hiện khi **bất kỳ nguồn liên quan** còn dữ liệu.

---

## PHẦN 3: DANH SÁCH THAY ĐỔI CODE CHI TIẾT

> Toàn bộ nằm trong [app/(tabs)/orders.tsx](app/(tabs)/orders.tsx), trừ Thay đổi #11 (tuỳ chọn).

### Thay đổi #1 — Đổi kiểu & hằng số (dòng ~53–70)
```ts
// CŨ: type OrdersTab = 'active' | 'history' | 'domestic';
type OrderGroup = 'all' | 'active' | 'history' | 'domestic';
type OrderListRow = CustomerActiveOrder | CustomerOrder | CustomerDomesticDeliveryItem;

const GROUP_OPTIONS = [
  { label: 'Tất cả đơn', value: 'all' },
  { label: 'Đang xử lý', value: 'active' },
  { label: 'Lịch sử', value: 'history' },
  { label: 'Nội địa', value: 'domestic' },
];
```
Giữ nguyên `ORDER_TYPE_OPTIONS`, `MAIN_STATUS_OPTIONS`, `isValidDateFilter`.

### Thay đổi #2 — State (dòng ~82)
```ts
// XÓA: const [activeTab, setActiveTab] = useState<OrdersTab>('active');
const [group, setGroup] = useState<OrderGroup>('all');
const [draftGroup, setDraftGroup] = useState<OrderGroup>('all');
```
Giữ nguyên toàn bộ state phân trang/items/filter còn lại.

### Thay đổi #3 — Gate query để tránh gọi API thừa (dòng ~130–132)
```ts
const activeOrdersQuery   = useCustomerActiveOrders(activePage, pageSize, activeQuery,
  { enabled: group === 'all' || group === 'active' });
const historyOrdersQuery  = useCustomerOrders(historyPage, pageSize, historyQuery,
  { enabled: group === 'all' || group === 'history' });
const domesticQuery       = useCustomerDomesticDeliveries(domesticPage, pageSize,
  { enabled: group === 'all' || group === 'domestic' });
```
> Phụ thuộc **Thay đổi #11**. Nếu không làm #11 thì giữ nguyên 3 lời gọi cũ (cả 3 luôn fetch — vẫn chạy đúng, chỉ tốn request thừa khi xem 1 nhóm).

### Thay đổi #4 — Xoá `handleTabChange` (dòng ~158–160)
Không còn cần (đã thay bằng filter).

### Thay đổi #5 — `openFilter` / `applyFilters` / `clearFilters` thêm `group` (dòng ~162–202)
```ts
const openFilter = () => {
  setDraftGroup(group);            // + thêm
  setDraftKeyword(keyword);
  setDraftOrderType(orderType);
  setDraftStatus(status);
  setDraftDateFrom(dateFrom);
  setDraftDateTo(dateTo);
  setFilterOpen(true);
};

const applyFilters = () => {
  if (!isValidDateFilter(draftDateFrom) || !isValidDateFilter(draftDateTo)) { /* ...toast... */ return; }
  setGroup(draftGroup);            // + thêm
  setKeyword(draftKeyword.trim());
  setOrderType(draftOrderType);
  setStatus(draftStatus);
  setDateFrom(draftDateFrom.trim());
  setDateTo(draftDateTo.trim());
  resetPageAndData();              // đã reset cả 3 trang/3 mảng — giữ nguyên
  setFilterOpen(false);
};

const clearFilters = () => {
  setDraftGroup('all'); setGroup('all');   // + thêm: xoá lọc đưa về Tất cả
  // ...phần reset keyword/type/status/date như cũ...
  resetPageAndData();
};
```

### Thay đổi #6 — Hàm lọc nội địa phía client (thêm mới, đặt cạnh `mergeByKey`)
```ts
const filterDomesticClientSide = (
  items: CustomerDomesticDeliveryItem[],
  f: { keyword: string; dateFrom: string; dateTo: string },
) => {
  let out = items;
  if (f.keyword) {
    const kw = f.keyword.toLowerCase();
    out = out.filter((d) =>
      [d.shipCode, d.address, d.phoneNumber, d.carrierName]
        .some((v) => v?.toLowerCase().includes(kw)));
  }
  if (f.dateFrom) out = out.filter((d) => d.createdAt >= f.dateFrom);
  if (f.dateTo)   out = out.filter((d) => d.createdAt <= `${f.dateTo}T23:59:59`);
  return out;
};
```

### Thay đổi #7 — Danh sách hợp nhất (thay khối `currentItems` dòng ~303–307)
```ts
const mergedItems = useMemo<OrderListRow[]>(() => {
  const domestic = filterDomesticClientSide(domesticItems, { keyword, dateFrom, dateTo });

  if (group === 'active')   return activeItems;
  if (group === 'history')  return historyItems;
  if (group === 'domestic') return domestic;

  // group === 'all' → khử trùng + ẩn nội địa khi có lọc loại/trạng thái
  const activeIds = new Set(activeItems.map((o) => o.orderId));
  const historyOnly = historyItems.filter((h) => !activeIds.has(h.orderId));
  const domesticForAll = orderType || status ? [] : domestic;
  return [...activeItems, ...historyOnly, ...domesticForAll];
}, [group, activeItems, historyItems, domesticItems, keyword, dateFrom, dateTo, orderType, status]);
```

### Thay đổi #8 — State phụ trợ cho loading/error/footer (thay `currentQuery`/`currentData`)
```ts
const relevantQueries =
  group === 'active'   ? [activeOrdersQuery]
: group === 'history'  ? [historyOrdersQuery]
: group === 'domestic' ? [domesticQuery]
: [activeOrdersQuery, historyOrdersQuery, domesticQuery];

const showLoading = mergedItems.length === 0 && relevantQueries.some((q) => q.isLoading);
const showError   = mergedItems.length === 0 && relevantQueries.every((q) => q.isError);
const isFetchingAny = relevantQueries.some((q) => q.isFetching);

const sourceHasMore = (g: OrderGroup) =>
  (g === 'all' || g === 'active')   && (activeOrdersQuery.data?.total ?? 0)   > activeItems.length   ? true :
  (g === 'all' || g === 'history')  && (historyOrdersQuery.data?.total ?? 0)  > historyItems.length  ? true :
  (g === 'all' || g === 'domestic') && (domesticQuery.data?.total ?? 0)       > domesticItems.length;

const hasMore =
  (group === 'all' || group === 'active')   && (activeOrdersQuery.data?.total ?? 0)  > activeItems.length   ||
  (group === 'all' || group === 'history')  && (historyOrdersQuery.data?.total ?? 0) > historyItems.length  ||
  (group === 'all' || group === 'domestic') && (domesticQuery.data?.total ?? 0)      > domesticItems.length;
```
*(Có thể rút gọn `sourceHasMore` — viết tách cho dễ đọc; chỉ cần `hasMore` cho footer.)*

### Thay đổi #9 — `keyExtractor` & `renderItem` theo loại dữ liệu (dòng ~393–411)
```ts
const keyExtractor = (item: OrderListRow) =>
  'draftDomesticId' in item ? `dom:${item.draftDomesticId}`
  : 'journey' in item       ? `act:${item.orderId}`
  :                           `his:${item.orderId}`;

const renderItem = ({ item }: { item: OrderListRow }) => {
  if ('draftDomesticId' in item)
    return <DomesticDeliveryCard item={item} onBook={openQuotes} onCancel={cancelAllingo} onSync={syncAllingo} />;
  if ('journey' in item)
    return <ActiveOrderCard order={item} />;
  return <OrderListItem order={item} />;
};
```
> Bộ phân biệt: `draftDomesticId` ⇒ nội địa; `journey` ⇒ đang xử lý (`CustomerActiveOrder`); còn lại ⇒ lịch sử (`CustomerOrder`).

### Thay đổi #10 — Header, Footer, Empty (dòng ~309–391, 408–428)
- **`renderHeader`:** bỏ `<SegmentedControl>`; thanh filter **bỏ điều kiện** `activeTab !== 'domestic'` (luôn hiện). Cập nhật text tóm tắt:
```ts
const hasFilter = group !== 'all' || keyword || orderType || status || dateFrom || dateTo;
// ...
{hasFilter ? 'Đang áp dụng bộ lọc' : 'Tìm kiếm và lọc đơn hàng'}
```
- **`FlatList`:** `data={mergedItems}`, `keyExtractor={keyExtractor}`.
- **`renderFooter`:** thay điều kiện `currentData...` bằng `hasMore`; `onPress={loadMore}`; `isLoading={isFetchingAny}`.
```ts
const loadMore = () => {
  if ((group === 'all' || group === 'active')   && (activeOrdersQuery.data?.total ?? 0)  > activeItems.length)   setActivePage((p) => p + 1);
  if ((group === 'all' || group === 'history')  && (historyOrdersQuery.data?.total ?? 0) > historyItems.length)  setHistoryPage((p) => p + 1);
  if ((group === 'all' || group === 'domestic') && (domesticQuery.data?.total ?? 0)      > domesticItems.length) setDomesticPage((p) => p + 1);
};
```
- **`renderEmpty`:** thay `currentQuery` bằng `showLoading`/`showError`; thông điệp theo `group` (Tất cả → "Bạn chưa có đơn hàng nào"; domestic → giữ thông điệp nội địa cũ).

### Thay đổi #11 — (Tuỳ chọn, khuyến nghị) Cho hook nhận `enabled`
File [use-customer-portal-data.ts](src/features/customer-portal/shared/hooks/use-customer-portal-data.ts):
```ts
export const useCustomerActiveOrders = (page = 1, size = 10, query?: CustomerActiveOrderQuery,
  options?: { enabled?: boolean }) => {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ['customer-portal', 'orders', 'active', page, size, query],
    queryFn: () => getCustomerActiveOrders(page, size, query),
    enabled: isAuthenticated && (options?.enabled ?? true),   // ← thay đổi
    refetchOnWindowFocus: false,
  });
};
```
Làm tương tự cho `useCustomerOrders` và `useCustomerDomesticDeliveries` (riêng domestic vẫn giữ `refetchInterval: 30000`; khi `enabled = false` thì interval tự ngừng). Lợi ích: khi xem 1 nhóm cụ thể, không gọi 2 API còn lại và dừng polling nội địa 30s.

### Thay đổi #12 — Bộ lọc trong `ModalShell` (dòng ~430–451)
Thêm `SelectSheet` "Nhóm đơn" lên **đầu** form lọc:
```tsx
<SelectSheet label="Nhóm đơn" value={draftGroup} options={GROUP_OPTIONS} onChange={setDraftGroup} />
<AppInput label="Từ khóa" .../>
<SelectSheet label="Loại đơn" .../>
<SelectSheet label="Trạng thái" .../>
{/* ...date row, actions giữ nguyên... */}
```

### Thay đổi #13 — Dọn import
Xoá import `SegmentedControl` nếu không còn dùng trong file này (kiểm tra: chỉ dùng ở `orders.tsx`).

---

## PHẦN 4: EDGE CASES

| Tình huống | Xử lý mong đợi |
|---|---|
| "Tất cả" + đơn vừa ở Đang xử lý vừa ở Lịch sử | Chỉ hiện **1 lần** (thẻ `ActiveOrderCard`), nhờ khử trùng theo `orderId`. |
| "Tất cả" + đặt Loại đơn hoặc Trạng thái | Ẩn toàn bộ đơn nội địa khỏi kết quả (xem 2.3). |
| Nhóm = Nội địa + nhập Từ khóa/ngày | Lọc client trên `shipCode/address/phoneNumber/carrierName` + `createdAt`. |
| Nhóm = Nội địa + chọn Loại đơn/Trạng thái | 2 tiêu chí này **không lọc** nội địa (bỏ qua, không làm rỗng list). *Khuyến nghị UX: có thể disable/làm mờ 2 field này khi nhóm = Nội địa — tuỳ chọn.* |
| 1 trong 3 API lỗi ở chế độ "Tất cả" | Vẫn hiển thị dữ liệu từ các nguồn thành công; chỉ hiện `ErrorState` khi **list rỗng và tất cả nguồn liên quan đều lỗi**. |
| "Tải thêm" ở "Tất cả" | Tăng trang cho mọi nguồn còn dữ liệu; các cụm dài thêm đúng thứ tự nhóm. |
| Pull-to-refresh | `refreshAllOrderTabs` đã refresh cả 3 nguồn — giữ nguyên, hoạt động đúng cho mọi nhóm. |
| Tổng số đơn nội địa (badge "Tải thêm") | Dựa trên `total` server (chưa trừ lọc client) → có thể "Tải thêm" rồi lọc bớt. Chấp nhận được; ghi chú để QA không hiểu nhầm là lỗi. |

---

## PHẦN 5: TUỲ CHỌN NÂNG CAO (không bắt buộc — có thể làm sau)
- **Tiêu đề phân nhóm** trong chế độ "Tất cả": chèn các dòng header "Đang xử lý / Lịch sử / Nội địa" giữa các cụm. Cách làm gọn: chuyển `mergedItems` sang mảng có phần tử header (`{ __header: 'Đang xử lý' }`) và xử lý trong `renderItem`, vẫn dùng `FlatList`.
- **Disable field Loại đơn/Trạng thái** khi nhóm = Nội địa (rõ ràng hơn cho người dùng).
- **Bộ đếm trên mỗi nhóm** hiển thị trong `SelectSheet` (vd "Đang xử lý (12)").

---

## PHẦN 6: TIÊU CHÍ NGHIỆM THU (Definition of Done)

✅ **Chức năng**
- Màn "Đơn hàng" **không còn thanh tab**; có một danh sách cuộn duy nhất.
- Bộ lọc có trường **"Nhóm đơn"** với 4 lựa chọn; mặc định **"Tất cả"**.
- "Tất cả" hiển thị đủ 3 loại đơn theo thứ tự nhóm, **không có đơn trùng** (cùng `orderId` chỉ 1 lần).
- Từ khóa/ngày lọc đúng cho cả 3 loại (nội địa lọc phía client); Loại đơn & Trạng thái lọc đúng cho đơn hàng và **ẩn nội địa** ở "Tất cả".
- Mỗi loại đơn vẫn mở đúng thẻ: đang xử lý (journey), lịch sử (gọn), nội địa (có nút Đặt ship/Đồng bộ/Hủy, không điều hướng chi tiết).
- "Tải thêm" nạp thêm đúng nguồn/đa nguồn; pull-to-refresh làm mới cả màn.
- Tap đơn hàng (active/history) → mở `/orders/{orderId}`; tap nút trên thẻ nội địa → mở báo giá/đồng bộ/hủy như cũ.

✅ **Kỹ thuật / chất lượng**
- Không lỗi TypeScript; không cảnh báo "duplicate key" trong `FlatList`.
- Khi xem 1 nhóm cụ thể, không gọi API của 2 nhóm còn lại và **dừng polling nội địa 30s** (nếu làm Thay đổi #11).
- Không sập app khi 1 nguồn lỗi; trạng thái loading/empty/error hiển thị hợp lý.

---

## PHẦN 7: THỨ TỰ TRIỂN KHAI ĐỀ XUẤT
1. (Tuỳ chọn) Thay đổi #11 — thêm `enabled` cho 3 hook.
2. Thay đổi #1, #2 — kiểu + state.
3. Thay đổi #6, #7, #8 — logic dữ liệu hợp nhất + state phụ trợ.
4. Thay đổi #9, #10, #12 — render (item/header/footer/empty) + form lọc.
5. Thay đổi #3, #4, #5, #13 — nối query gate, xoá tab cũ, cập nhật open/apply/clear, dọn import.
6. Tự kiểm theo PHẦN 6, rồi build kiểm thử (xem [build_apk_test_android.md](Plan/build_apk_test_android.md)).

---

## PHẦN 8: RỦI RO & GHI CHÚ
- **Rủi ro thấp – cô lập tốt:** ~95% thay đổi nằm trong 1 file `orders.tsx`; không đụng tới trang chi tiết đơn, không đổi service/API.
- **Nội địa không filter server** là giới hạn của backend hiện tại → mọi lọc nội địa là client-side (chỉ trên trang đã tải). Nếu sau này backend hỗ trợ filter cho `/domestic-deliveries`, có thể nâng cấp sang lọc server.
- **Không sort trộn theo ngày** là chủ đích (để giữ "tải thêm theo từng nguồn"). Nếu muốn 1 dòng chảy sắp theo ngày thật sự, phải đổi sang phân trang phía client — nằm ngoài phạm vi plan này.
- Khuyến nghị backup (tag/ZIP) trước khi sửa theo quy ước dự án.
