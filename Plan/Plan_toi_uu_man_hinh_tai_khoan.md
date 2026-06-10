# Phân tích requirement: Tối ưu màn hình Cá Nhân (Tài Khoản)

> Ngày phân tích: 2026-06-10 • File đích: `app/(tabs)/account.tsx` (1172 dòng) • Trạng thái: **CHỜ XÁC NHẬN 5 câu hỏi blocker trước khi code**

## 0. Requirement gốc (nguyên văn)

> Nhờ các bạn tối ưu lại màn hình Cá Nhân (Tài Khoản) theo thiết kế mới:
> 1. Thay dải tiến trình cũ bằng widget "Cập nhật thông tin" gọn gàng ngay dưới thông tin User (chiều cao tối đa 110px).
> 2. Khi người dùng click vào Widget này, sẽ mở một Bottom Sheet (Slide-up Modal) chứa chi tiết các đầu mục thông tin cần cập nhật.
> 3. Chuyển mục "Sổ địa chỉ nhận hàng" xuống nhóm "Thiết lập chung".
> 4. Đổi tên "Ví tích lũy & tài chính" thành "Số dư ví".
> 5. Đổi tên "Cấu hình tài khoản" thành "Thông tin cá nhân".
> 6. Bổ sung mục "Đăng xuất" màu đỏ nằm dưới cùng trong danh sách "Thiết lập chung".

## 1. Verdict tổng quan

**Khả thi, effort ~1 ngày dev** (không cần dependency mới, không đụng backend). Tuy nhiên:

- Requirement được viết theo **từ vựng của bản web/design**, không khớp code mobile. Đã grep cả 2 repo để xác minh:
  - "Cấu hình tài khoản", "Sổ địa chỉ" = label sidebar của **web** (`TIXIMAX-FE-2/public/locales/vi/customer.json` → `sidebar.settings`, `sidebar.addresses`).
  - "Ví tích lũy & tài chính" và "Thiết lập chung" **không tồn tại ở cả 2 repo** → từ vựng trong Figma thiết kế mới.
- Hệ quả: **mục 5 đã thỏa mãn sẵn** trên mobile (no-op), mục 3/4 phải ánh xạ lại, mục 6 nếu làm nguyên văn sẽ tạo **2 nút Đăng xuất**.
- Phần khó nhất không phải widget mà là: (a) **IA menu theo nhóm chưa được spec đủ** — requirement chỉ nêu 1 nhóm và 2 thành viên; (b) **điều hướng từ bottom sheet sang các modal con** (deep-link checklist) cần quy ước rõ.
- Tin tốt: `ModalShell` hiện có **đã chính là** "Bottom Sheet (Slide-up Modal)" mà requirement mô tả → tái sử dụng, không cần cài `@gorhom/bottom-sheet`.

## 2. Bảng ánh xạ Requirement → Code thực tế

| # | Yêu cầu | Thực tế code mobile | Thay đổi cụ thể | Trạng thái |
|---|---|---|---|---|
| 1 | Widget "Cập nhật thông tin" ≤110px thay dải tiến trình | Progress Card `account.tsx` L428-472 (~300px: header + bar + hint + checklist 3 task), ngay dưới Profile Card L415-426. Logic dữ liệu L357-395 | Xóa JSX L428-472 + styles `progress*`; **giữ nguyên** logic `profileTasks`/`currentLevel`/`showProgressCard`; thay bằng component `ProfileUpdateWidget` (spec mục 4.1) | ✅ Làm được, chờ chốt Q3 |
| 2 | Click widget → Bottom Sheet chi tiết các đầu mục | `ModalShell` (`src/components/ui/ModalShell.tsx`) đã là slide-up sheet: RN Modal `animationType="slide"`, backdrop 0.35, maxHeight 88%, header + close. Modal state là union đơn `AccountModal` (L43) | Thêm `'progress'` vào union; widget onPress → `setModal('progress')`; chuyển checklist L447-470 vào sheet mới (spec mục 4.2) | ✅ Làm được, chờ chốt Q4 |
| 3 | Chuyển "Sổ địa chỉ nhận hàng" xuống nhóm "Thiết lập chung" | Mobile chỉ có item **"Địa chỉ"** (L494, map-pin → `openAddressList`); menu là **danh sách phẳng 5 item, không có nhóm** (L492-498) | Dựng menu 2 section có header (spec mục 4.3); đổi label "Địa chỉ" → "Sổ địa chỉ nhận hàng" (kèm title modal L522 "Địa Chỉ" đang viết hoa lệch chuẩn) | ⚠️ Cần xác nhận Q1+Q2 |
| 4 | Đổi "Ví tích lũy & tài chính" → "Số dư ví" | Không có label này; Wallet Card đang là **"Số dư khả dụng"** (L480). Dashboard đã dùng "Số dư ví" (`index.tsx` L100) — đang lệch nhau | Sửa 1 string L480 → "Số dư ví", đồng nhất với dashboard. Nút "Nạp tiền" giữ nguyên | ⚠️ Cần xác nhận Q1+Q5 |
| 5 | Đổi "Cấu hình tài khoản" → "Thông tin cá nhân" | Mobile **đã là "Thông tin cá nhân"** (menu L493, title modal L510). "Cấu hình tài khoản" chỉ có bên web | Không sửa code. Ghi chú lại cho stakeholder; khả năng đây là item của ticket web lọt sang | ✅ Đã thỏa mãn |
| 6 | "Đăng xuất" đỏ dưới cùng nhóm "Thiết lập chung" | Đã có nút standalone nền `errorLight` NGOÀI menu card (L500-508); handler `handleLogoutNow` L122-133 (`useAuthActions.logout`, có `isLoggingOut`) | **Di chuyển** (không phải bổ sung): xóa nút standalone, thêm `MenuItem variant="danger"` làm row cuối nhóm, giữ nguyên handler + loading state | ⚠️ Cần xác nhận Q1 (xóa nút cũ, confirm dialog) |

## 3. Câu hỏi cần stakeholder/designer xác nhận

### Blocker (chưa trả lời thì chưa nên code)

- **Q1 — Mapping label**: Xác nhận bảng ánh xạ ở mục 2, cụ thể: (a) có đổi "Địa chỉ" → "Sổ địa chỉ nhận hàng" không; (b) mục 4 là đổi label Wallet Card "Số dư khả dụng" đúng không (hay ví trở thành 1 row trong menu?); (c) mục 5 mobile đã đúng — đây có phải item của web không; (d) mục 6 = di chuyển nút logout hiện có (xóa nút standalone) đúng không?
- **Q2 — IA menu nhóm đầy đủ**: Requirement chỉ nêu nhóm "Thiết lập chung" + 2 thành viên. Cần danh sách đủ: có những nhóm nào, tên từng nhóm, 5 item hiện tại ("Thông tin cá nhân", "Địa chỉ", "Xác minh tài khoản", "Bảo mật và mật khẩu", "Nhân viên hỗ trợ") nằm đâu, thứ tự, Wallet Card nằm trong hay ngoài cấu trúc nhóm? (Đề xuất mặc định ở mục 4.3.)
- **Q3 — Widget tại level 3 & nguồn số liệu**: Card cũ **ẩn khi `profileCompletionLevel ≥ 3`** (L395). Widget mới ẩn theo (→ bottom sheet mất lối vào) hay hiện trạng thái "đã hoàn tất"? Và khi 2 nguồn lệch nhau (3/3 task xong nhưng backend vẫn trả level 2 — trạng thái có thật vì level là backend-authoritative, L388-391) widget hiển thị số nào? (Đề xuất ở 4.1.)
- **Q4 — Điều hướng từ sheet**: Checklist hiện deep-link thẳng vào modal con (`task.action` L357-387: profile/verify/addressList). Khi checklist nằm trong sheet: đóng sheet rồi mở modal con (đề xuất, vì modal state là union đơn) hay yêu cầu sheet dạng gesture (drag-to-dismiss, snap point — phải cài `@gorhom/bottom-sheet`, tăng scope)? Sau khi hoàn thành thao tác trong modal con có tự quay lại sheet không? (Đề xuất: không.)
- **Q5 — Logout UX**: Hiện tap là đăng xuất ngay, **không có confirm** (L122-133). Row logout nằm cuối danh sách cuộn dễ bấm nhầm hơn nút standalone — có thêm confirm dialog không? Loading state trong row hiển thị thế nào (text "Đang đăng xuất..." + disabled như cũ?)?

### Nên hỏi (có default hợp lý, cần sign-off)

- **Q6 — Ngữ nghĩa "Số dư ví" vs "Số dư khả dụng"**: cả 2 chỗ đều render `profile.balance`. Trong ví logistics, "khả dụng" ≠ "tích lũy" (có thể có tiền đang hold). Cần backend xác nhận `profile.balance` là số dư khả dụng và không có field số dư thứ 2 sắp ra — tránh đổi tên xong thành bug ngữ nghĩa.
- **Q7 — Badge "Cấp độ {n}/3"**: badge ở Profile Card (L422-424) nằm ngay trên widget mới → 2 chỉ báo tiến trình trong ~150px. Giữ cả 2, gộp, hay bỏ badge?
- **Q8 — "110px"**: là dp, có tính margin không? App **chưa set `maxFontSizeMultiplier`** ở đâu cả — fontScale Android 2.0 sẽ làm widget vượt 110px hoặc clip chữ. Chốt: cap font scale trong widget / cho phép giãn / ellipsize?
- **Q9 — Back Android & web**: sheet đóng bằng nút back Android (ModalShell đã có `onRequestClose`); bản web (app có bundle web) nút back trình duyệt không đóng sheet, sheet 88% trên desktop xấu — web có nằm trong scope redesign không?

### Tham khảo (không chặn, nên ghi nhận)

- **Q10 — Analytics**: nếu mục tiêu redesign là tăng conversion hoàn thiện hồ sơ, cần định nghĩa event (widget impression, sheet open, task tap) — hiện app chưa có tracking.
- **Q11 — Task phone OTP (#1375)**: đang tắt chờ API SMS. Khi bật lại, mẫu số đổi 3→4, % trong widget tụt xuống. Nên build widget/sheet nhận `tasks` động ngay từ đầu (đề xuất đã làm vậy).

## 4. Đề xuất phương án triển khai (sau khi chốt Q1-Q5)

### 4.1. Widget `ProfileUpdateWidget` (≤110px)

File mới `src/components/account/ProfileUpdateWidget.tsx`. Props: `{ completedCount, totalCount, level, nextTaskTitle, onPress }` (nextTaskTitle là prop tùy chọn) — `level` lấy từ `profileCompletionLevel` (backend-authoritative, **không** suy từ checklist); count từ `profileTasks` (guidance).

Layout 3 hàng theo token scale (`src/theme/tokens.ts`):

| Hàng | Nội dung | Chi tiết |
|---|---|---|
| 1 | Icon + text + chevron | Icon tròn 36px nền `primaryLight`, Feather `user-check`; Title "Cập nhật thông tin" (14/900); Subtitle "{x}/{n} mục hoàn thành • Cấp độ {level}/3" (12/700, textSecondary); chevron-right 20 |
| 2 | Progress bar | track 6px `borderRadius.full` nền `background`, fill `primary`, width = % task |
| 3 | Hint (có điều kiện) | "Tiếp theo: {nextTaskTitle}" (10/700, numberOfLines=1); khi 3/3 nhưng level<3: "Hệ thống sẽ tự cập nhật cấp độ." |

Ngân sách chiều cao: padding 12×2 + hàng1 36 + gap 8 + bar 6 + gap 4 + hint 14 + border 2 ≈ **94px** (76px khi không có hint) → đạt ≤110px.

- **Hiển thị**: đề xuất **giữ rule ẩn khi `level ≥ 3`** — level 3 = backend xác nhận hoàn tất, widget done thường trực chỉ chiếm chỗ và trùng badge "Cấp độ 3/3"; mọi tác vụ vẫn truy cập được qua menu. (Chờ Q3.)
- **Accessibility**: `accessibilityRole="button"`, label đọc đủ trạng thái, hint "Mở danh sách các mục cần cập nhật"; cả card là Pressable (cao >44px, không cần hitSlop).

### 4.2. Bottom Sheet `ProfileTasksSheet`

- **Tái sử dụng `ModalShell`** — đã đúng spec "Slide-up Modal", đồng nhất với 6 flow hiện có; không cài `@gorhom/bottom-sheet` (reanimated 4.3.1 + gesture-handler 3.0.0 có sẵn nhưng use case này không cần snap point).
- Wiring: `type AccountModal = 'progress' | 'profile' | 'address' | 'security' | 'verify' | 'support' | null` (L43); `<ModalShell visible={modal === 'progress'} title="Cập nhật thông tin">`.
- Nội dung: khối tóm tắt (bar 10px cũ + "{x}/{n} mục hoàn thành • Cấp độ {level}/3" + hint giữ nguyên copy L443-445) + checklist chuyển nguyên markup/styles L447-470.
- **Chống stack modal**: vì modal state là union đơn, `setModal('profile')` từ row của sheet tự unmount sheet → không bao giờ 2 ModalShell cùng visible. Nếu iOS flicker khi swap cùng frame: helper `switchFromSheet = (open) => { setModal(null); setTimeout(open, 250); }` (pattern setTimeout đã dùng tại L239/L266). Hoàn thành thao tác trong modal con → **không** tự mở lại sheet (`runAction`/`runVerifyAction` đã đóng + refetch, L141/L155).
- Lưu ý sẵn có ngoài scope: address editor là boolean riêng `isAddressEditorVisible` stack đè modal 'address' — hành vi hiện hữu, không đụng.

### 4.3. Menu theo nhóm (đề xuất mặc định, chờ Q2)

```
Section "Tài khoản của tôi"            Section "Thiết lập chung"
├─ Thông tin cá nhân  (user)           ├─ Sổ địa chỉ nhận hàng (map-pin)
├─ Xác minh tài khoản (check-circle)   ├─ Bảo mật và mật khẩu  (shield)
└─ Nhân viên hỗ trợ   (help-circle)    └─ Đăng xuất            (log-out, ĐỎ, cuối)
```

- `MenuSection` mới: header text 10/900 uppercase textSecondary + card = style `menuContainer` hiện tại.
- `MenuItem` (extract từ in-file L657-679): thêm 2 prop tùy chọn — `variant` nhận `'default' | 'danger'` (danger: icon + title màu `colors.error`, nền icon `errorLight`, **ẩn chevron** — là hành động, không phải điều hướng) và `disabled` kiểu boolean (opacity 0.65, phục vụ `isLoggingOut`). Giữ minHeight 48 ≥ 44px touch target.
- Xóa nút logout standalone L500-508 + styles `logout*`.
- Lưu ý màu: `#F43F5E` trên nền `#FFE4E6` fail WCAG AA cho text nhỏ → row danger dùng **nền surface + chữ/icon đỏ** (không dùng nền errorLight cho text 12px).

### 4.4. Tách component (theo khuyến nghị sẵn có trong `frontend_ui_ux_code_review.md`)

Thư mục mới `src/components/account/`: `ProfileHeader.tsx` (L415-426), `ProfileUpdateWidget.tsx`, `ProfileTasksSheet.tsx`, `WalletCard.tsx` (L474-490), `MenuSection.tsx`, `MenuItem.tsx`, `types.ts` (`ProfileTask`). Giữ trong `account.tsx`: state/handlers/modal forms/`profileTasks` (vì action bind vào `setModal`/`openAddressList`).

## 5. Kế hoạch thực hiện + QA

| Bước | Việc | Effort |
|---|---|---|
| 0 | Backup tag + baseline `npx tsc --noEmit` + `node scripts/check-encoding.js` | S |
| 1 | Rename text-only: L480 "Số dư khả dụng"→"Số dư ví"; L494 "Địa chỉ"→"Sổ địa chỉ nhận hàng"; L522 "Địa Chỉ"→"Sổ địa chỉ nhận hàng". Commit | S |
| 2 | `ProfileUpdateWidget` + thêm `'progress'` vào union; thay JSX L428-472; xóa styles chết. Commit | M |
| 3 | `ProfileTasksSheet` (ModalShell) + chuyển checklist; wire chuyển modal; QA iOS flicker → fallback 250ms. Commit | M |
| 4 | `MenuSection`/`MenuItem` (danger, disabled); dựng 2 section; chuyển Đăng xuất vào row cuối; xóa nút standalone. Commit | M |
| 5 | Tách `ProfileHeader`, `WalletCard`; dọn styles chết. Commit | M |
| 6 | Verify tổng: tsc + check-encoding + QA thủ công theo ma trận | S |

**Ma trận QA thủ công:**
- Level 1, 0 địa chỉ, email chưa verify → widget hiện đúng đếm, hint "Tiếp theo: ..."; sheet 3 row đúng trạng thái; mỗi row deep-link đúng modal.
- Level 2 → subtitle khớp badge "Cấp độ 2/3" (backend).
- Level 3 → widget ẩn, layout không hở; menu + ví bình thường.
- Level <3 nhưng 3/3 task → widget hiện, hint "Hệ thống sẽ tự cập nhật cấp độ."
- Handoff sheet→modal (iOS + Android): mở "Cập nhật họ tên" → modal mượt → Lưu → toast → sheet KHÔNG tự mở lại; "Thêm ít nhất 1 địa chỉ" → modal địa chỉ → editor stack như cũ.
- Đăng xuất: row đỏ cuối; tap → "Đang đăng xuất..." + disabled → về `/(auth)/login`; nhánh lỗi → toast + enable lại.
- Pull-to-refresh cập nhật đếm widget; sanity bản web.

## 6. Rủi ro & lưu ý kỹ thuật

1. **Không vi phạm backend-authoritative**: tuyệt đối không suy `profileCompletionLevel` từ checklist (comment L388-391); widget chỉ hiển thị % task như "tiến độ thao tác".
2. **Encoding**: string Việt mới phải pass `node scripts/check-encoding.js` (quy ước repo).
3. **Diff lớn**: `account.tsx` 1172 dòng — bắt buộc chia commit theo bước ở mục 5, mỗi commit pass `tsc --noEmit`.
4. **Không stack 2 ModalShell**: dùng union state làm cơ chế đảm bảo; không thêm boolean visible rời.
5. **Touch target**: row menu giữ minHeight 48; widget cao ≥76px; không tạo icon-button <44px mới.
6. **Repo/nhánh**: làm trong `tiximax-customer-app` (root `d:\Tiximax_FE` không phải repo), nhánh theo team quyết (J2T đang là nhánh làm việc), backup tag trước khi sửa.
