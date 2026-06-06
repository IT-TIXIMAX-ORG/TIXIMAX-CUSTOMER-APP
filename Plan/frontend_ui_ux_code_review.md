# Review toàn diện Frontend UI/UX - TixiMax Customer App

Ngày review: 06/06/2026  
Phạm vi: toàn bộ mã nguồn trong `app/`, `src/`, `components/`, `constants/` và cấu hình Expo/package hiện tại.  
Mục tiêu: xác định các cải tiến cần thiết trước khi app sẵn sàng cho beta/production, ưu tiên tính đúng nghiệp vụ, khả dụng trên mobile, accessibility và khả năng bảo trì.

## 1. Tóm tắt điều hành

App đã có nền tảng tốt cho một MVP:

- Kiến trúc dữ liệu tương đối rõ với Expo Router, React Query, Zustand và service layer.
- Đã có design tokens, base UI components, safe-area handling và pull-to-refresh.
- Các luồng nghiệp vụ chính đã hiện diện: auth, dashboard, orders, order detail, create order, transactions và account.
- `npx tsc --noEmit` và `npm run check:encoding` đều pass tại thời điểm review.

Tuy nhiên, app chưa nên coi là production-ready. Các rủi ro lớn nhất hiện tại:

1. Một số thông tin quan trọng đang được FE tự suy diễn, có thể hiển thị sai số tiền, cấp độ hoặc dấu giao dịch.
2. Lỗi mạng/API thường bị hiển thị thành trạng thái "không có dữ liệu", khiến người dùng hiểu sai.
3. Form dài thiếu inline validation, lưu nháp và cảnh báo mất dữ liệu.
4. Accessibility và độ tương phản màu chưa đạt mức phát hành rộng rãi.
5. Các screen chính quá lớn, ít test tự động và chưa có lint/format gate.

Khuyến nghị triển khai theo thứ tự: **đúng nghiệp vụ -> error/form UX -> accessibility/design system -> kiến trúc/performance -> test/release hardening**.

## 2. Số liệu review

| Hạng mục | Kết quả |
|---|---:|
| `Pressable` trong app/UI components | 39 |
| `accessibilityRole` | 6 |
| `accessibilityLabel` | 4 |
| Chỗ sử dụng inline error của `AppInput` | 0 |
| Khai báo text cỡ `10` hoặc token `xs` | 53 |
| Screen lớn nhất | `account.tsx` - 1.164 dòng |
| Screen lớn tiếp theo | `create-order.tsx` - 988 dòng |
| Auth screen | `login.tsx` - 904 dòng |
| TypeScript check | Pass |
| Encoding check | Pass |
| Expo Doctor | 19/21 checks pass |
| Test/lint scripts trong `package.json` | Chưa có |

Expo Doctor đang báo:

- `assets/app-icons/TIXIMAX-icon.jpg` có nội dung PNG nhưng phần mở rộng JPG.
- Sáu Expo packages lệch patch version được SDK 56 khuyến nghị.

## 3. Findings ưu tiên

### P0 - Cần xử lý trước beta/production

#### P0.1. FE đang tự suy diễn dữ liệu nghiệp vụ quan trọng

**Bằng chứng**

- `app/orders/[id].tsx:132-1  kép.

**Rủi ro**

- Hiển thị sai số tiền cần thanh toán hoặc QR không đúng ngữ cảnh.
- Hiển thị sai cấp độ tài khoản so với backend.
- Giao dịch có thể xuất hiện dạng `--100.000đ`.

**Đề xuất**

- Thực hiện `Plan/Plan_fix_order_detail.md` và dùng field backend authoritative cho `currentPayableAmount`, payment milestone và QR.
- Dùng trực tiếp `profile.profileCompletionLevel`; chỉ dùng checklist FE để giải thích bước còn thiếu, không tự tạo level.
- Tạo một helper duy nhất xác định chiều giao dịch và luôn format `Math.abs(amount)`.

#### P0.2. Lỗi API đang bị che thành empty state

**Bằng chứng**

- Dashboard chỉ phân biệt loading hoặc danh sách rỗng.
- Orders và Transactions không render `isError`; khi query lỗi sẽ hiển thị "Chưa có đơn/giao dịch".
- `transactions.tsx:214-215`, `account.tsx:87-88` nuốt lỗi refresh.
- `useCreateOrderMasterData` trả `isError`, nhưng `create-order.tsx` không dùng; người dùng có thể bị kẹt với select rỗng.
- HTTP timeout chung đang là 300 giây, khiến spinner có thể kéo dài quá lâu.

**Rủi ro**

- Người dùng hiểu nhầm mất dữ liệu hoặc tài khoản chưa có dữ liệu.
- Không có CTA thử lại rõ ràng.
- Form tạo đơn bị chặn mà không giải thích nguyên nhân.

**Đề xuất**

- Tạo `ErrorState` dùng chung với message thân thiện, nút "Thử lại" và tùy chọn giữ dữ liệu cache cũ.
- Mỗi screen phải phân biệt rõ: initial loading, refreshing, empty, error, stale/offline.
- Refresh thất bại phải báo toast hoặc inline banner, không im lặng.
- Giảm timeout mặc định cho API thông thường; chỉ dùng timeout dài cho upload/endpoints cần thiết.

#### P0.3. Form chưa bảo vệ tính toàn vẹn dữ liệu

**Bằng chứng**

- `react-hook-form` và `zod` đã cài nhưng chưa được sử dụng.
- `AppInput` hỗ trợ `error`, nhưng hiện không có screen nào truyền `error`.
- Profile/address có thể submit mà không có validation FE đầy đủ.
- Create order dùng `key={index}` cho product lines.
- Create order có hai nhánh submit gần như trùng nhau cho native và web.
- Người dùng có thể đóng modal, nhấn back hoặc đổi tab và mất form đang nhập mà không được cảnh báo.

**Rủi ro**

- Người dùng phải dò lỗi qua Alert/Toast, không biết field nào sai.
- Xóa một product line có thể làm React tái sử dụng nhầm state của dòng kế tiếp.
- Form tạo đơn dài dễ mất dữ liệu và gây tỷ lệ bỏ cuộc cao.

**Đề xuất**

- Chuẩn hóa form bằng React Hook Form + Zod và `FormField` dùng chung.
- Hiển thị lỗi inline, focus/scroll đến field lỗi đầu tiên.
- Mỗi product line phải có ID ổn định, không dùng index làm key.
- Hợp nhất submit native/web thành một pipeline validation + submit.
- Thêm autosave draft cục bộ cho create order và confirm trước khi bỏ form có thay đổi.

#### P0.4. Accessibility và tương phản màu chưa đạt yêu cầu

**Bằng chứng**

- Chỉ 6/39 `Pressable` có `accessibilityRole`; chỉ 4 có `accessibilityLabel`.
- `AppButton`, `SegmentedControl`, `SelectSheet`, `ModalShell` chưa cung cấp semantic mặc định.
- Nhiều nút/icon chỉ 32-40px; text cỡ 10-12px và uppercase xuất hiện dày đặc.
- Một số contrast ratio hiện tại:

| Cặp màu | Contrast |
|---|---:|
| `primary` trên trắng | 1.77:1 |
| `primaryDark` trên trắng | 2.11:1 |
| `textMuted` trên trắng | 2.56:1 |
| `warning` trên `warningLight` | 1.93:1 |
| `successText` trên `successLight` | 3.32:1 |

**Rủi ro**

- Người dùng thị lực yếu hoặc dùng screen reader khó thao tác.
- Không đạt WCAG AA cho text thông thường.
- Font scaling có thể làm vỡ layout vì fixed height và text quá nhỏ.

**Đề xuất**

- Base components phải tự gắn role, label, disabled/busy/selected/expanded state.
- Mọi touch target tối thiểu 44x44px; icon-only button bắt buộc có label.
- Điều chỉnh semantic text colors để đạt tối thiểu 4.5:1 cho body text.
- Trạng thái không được chỉ truyền đạt bằng màu; thêm icon/text rõ ràng.
- Test TalkBack, VoiceOver và font scale 100%, 150%, 200%.

### P1 - Nên xử lý ngay sau P0

#### P1.1. Theme và design system chưa nhất quán

**Bằng chứng**

- `app.json` đặt `userInterfaceStyle: automatic`, nhưng toàn app chỉ có light colors và status bar dark.
- Vừa dùng custom UI, React Native Paper theme, vừa còn `constants/Colors.ts` từ template.
- Nhiều màu hard-code ngoài token.

**Đề xuất**

- Với bản phát hành gần nhất: khóa app ở `userInterfaceStyle: light` để tránh dark mode bị vỡ.
- Sau đó mới triển khai dark theme đầy đủ nếu product yêu cầu.
- Gom toàn bộ semantic colors, typography, spacing, radius, elevation và interaction states vào một design system.
- Xóa token/template không còn dùng.

#### P1.2. Modal và auth flow dễ gây mất ngữ cảnh

**Bằng chứng**

- `ModalShell` và `SelectSheet` đều dùng native `Modal`, tạo nested modal khi select nằm trong form modal.
- Modal có thể đóng bằng backdrop/back trong khi đang nhập hoặc đang submit.
- Auth gom login/register/verify/forgot-password vào một file 904 dòng và nhiều modal liên tiếp.
- Google login bị disabled nhưng vẫn hiển thị như một action không có giải thích.
- TextInput auth chưa có `autoComplete`, `textContentType`, OTP autofill, next/submit keyboard flow hoặc resend countdown.

**Đề xuất**

- Dùng một sheet/dialog system duy nhất, hỗ trợ modal stacking, keyboard, safe area và accessibility focus.
- Chặn close khi đang submit; confirm nếu form dirty.
- Tách register, OTP và forgot-password thành route/flow rõ ràng.
- Ẩn Google login cho tới khi hoạt động, hoặc hiển thị badge "Sắp ra mắt" không tương tác.
- Bổ sung password visibility, autofill, OTP one-time-code và countdown resend.

#### P1.3. Mobile data flow đang dùng mạng và pin chưa tối ưu

**Bằng chứng**

- Orders khởi chạy query cho cả ba tab dù chỉ xem một tab.
- Pull-to-refresh Orders gọi đồng thời cả active/history/domestic.
- Domestic deliveries poll mỗi 30 giây không phụ thuộc tab đang active.
- `useCreateOrderMasterData` fetch `destinations`, nhưng create-order không sử dụng dữ liệu này.
- Lists đang copy query data sang local state và tự merge pagination.

**Đề xuất**

- Chỉ enable query của tab đang active; dừng polling khi screen/tab không focused.
- Refresh đúng dữ liệu đang xem.
- Chuyển pagination sang `useInfiniteQuery` để giảm state đồng bộ thủ công.
- Không fetch master data chưa dùng.
- Giữ cache cũ khi refetch và dùng stale indicator thay vì xóa list.

#### P1.4. Các UX chi tiết đang tạo tín hiệu sai hoặc thiếu hành động

**Bằng chứng**

- `StaffCard` luôn hiển thị chấm online dù không có dữ liệu presence và bỏ qua `avatarUrl`.
- Support modal chỉ hiển thị số điện thoại, không gọi/copy được.
- Các mã đơn, tracking code, bank account chưa có copy action nhất quán.
- Filter ngày dùng text input thay vì date picker; Orders và Transactions còn xử lý format khác nhau.
- "Sắp ra mắt" vẫn được render như card có thể chọn.

**Đề xuất**

- Chỉ hiển thị online badge khi có nguồn presence đáng tin cậy.
- Hiển thị avatar thật với fallback initials.
- Chuẩn hóa `CopyableValue`, call action và feedback sau thao tác.
- Dùng native date-range picker, validate `from <= to`.
- Card chưa hỗ trợ phải có trạng thái disabled/badge rõ ràng.

### P2 - Cải thiện khả năng bảo trì và chất lượng phát hành

#### P2.1. Screen quá lớn và logic bị trùng

**Bằng chứng**

- `account.tsx`: 1.164 dòng.
- `create-order.tsx`: 988 dòng.
- `login.tsx`: 904 dòng.
- Nhiều nơi lặp error extraction, modal actions, info rows, pagination merge và form state.
- Khoảng 40 chỗ dùng `any`/`as any`.

**Đề xuất**

- Chia screen thành feature components và hooks theo luồng nghiệp vụ.
- Tạo typed API error parser, reusable async action hook và shared list-state components.
- Thay `any` bằng DTO/runtime schema ở boundary API.
- Giữ route files mỏng: fetch/orchestrate/navigation; UI section nằm trong feature folders.

#### P2.2. Thiếu quality gates và test tự động

**Bằng chứng**

- Không có script `lint`, `format`, `test` hoặc E2E trong `package.json`.
- Không tìm thấy test/spec/Maestro/Detox config trong source.
- Expo Doctor còn hai nhóm lỗi.

**Đề xuất**

- Thêm ESLint + Prettier + CI chạy `check:encoding`, `tsc`, lint và tests.
- Unit test cho formatters, labels, transaction direction, payment derivation fallback và validators.
- Component test cho base UI/error/form states.
- Maestro E2E cho login, tạo đơn, xem đơn, thanh toán, filter giao dịch và account.
- Sửa icon extension và đồng bộ package patch versions bằng Expo tooling.

#### P2.3. Dọn template và thống nhất ngôn ngữ

**Bằng chứng**

- Còn `app/modal.tsx`, `app/(tabs)/two.tsx`, `components/EditScreenInfo.tsx` và các template components.
- `+not-found.tsx` dùng tiếng Anh và style khác app.
- `i18next`/`react-i18next` đã cài nhưng toàn bộ UI vẫn hard-code string.

**Đề xuất**

- Xóa route/component template không dùng để tránh deep link vào màn hình mẫu.
- Chuẩn hóa not-found/error screens theo brand và tiếng Việt.
- Cho bản MVP: thống nhất tiếng Việt; chỉ giữ/triển khai i18n khi có yêu cầu đa ngôn ngữ rõ ràng.

## 4. Kế hoạch triển khai đề xuất

### Phase 0 - Correctness và release blockers

1. Hoàn thiện order detail/payment theo `Plan_fix_order_detail.md`; backend là nguồn dữ liệu authoritative.
2. Sửa transaction direction/sign và sử dụng `profileCompletionLevel`.
3. Tạo shared `ErrorState`, retry action và xử lý lỗi rõ ràng trên mọi screen.
4. Xử lý master-data error của create order.
5. Sửa hai lỗi Expo Doctor.

**Kết quả mong đợi:** không hiển thị sai nghiệp vụ; người dùng luôn phân biệt được empty với error.

### Phase 1 - Accessibility và design foundation

1. Nâng cấp `AppButton`, `AppInput`, `SegmentedControl`, `SelectSheet`, `ModalShell`.
2. Sửa contrast tokens, minimum touch target và semantic status.
3. Khóa light mode cho release hiện tại.
4. Chuẩn hóa loading, empty, error, offline/stale và toast behavior.

**Kết quả mong đợi:** luồng chính dùng được với TalkBack/VoiceOver và font scale 200%.

### Phase 2 - Form và flow redesign

1. Dùng React Hook Form + Zod cho auth, account và create order.
2. Inline validation, focus field lỗi, keyboard/autofill/OTP UX.
3. Tách auth flow thành route riêng.
4. Stable IDs, autosave draft và discard confirmation cho create order.
5. Date-range picker và filter chips có thể xóa riêng.

**Kết quả mong đợi:** giảm lỗi submit, giảm mất dữ liệu và giảm số lần người dùng phải nhập lại.

### Phase 3 - Kiến trúc và performance

1. Tách các screen lớn thành feature components/hooks.
2. Dùng active-tab query + `useInfiniteQuery`; dừng polling nền không cần thiết.
3. Chuẩn hóa image component có cache/loading/error.
4. Loại bỏ fetch, dependency, route và component không dùng.
5. Chuẩn hóa typed API boundary và error parser.

**Kết quả mong đợi:** code dễ bảo trì, ít network thừa và trải nghiệm list mượt hơn.

### Phase 4 - Test và release hardening

1. Thêm lint/format/test scripts và CI gate.
2. Unit/component tests cho logic và base UI.
3. Maestro E2E cho sáu luồng critical.
4. QA matrix Android/iOS, màn hình nhỏ, font lớn, mạng chậm/offline.
5. Thêm crash reporting và analytics cho funnel quan trọng.

## 5. Acceptance criteria tổng

- Không screen nào hiển thị empty state khi request đang lỗi.
- Không số tiền/cấp độ/trạng thái nghiệp vụ quan trọng nào được FE tự suy diễn khi backend đã hoặc cần cung cấp field authoritative.
- Tất cả form có inline validation và không mất dữ liệu âm thầm.
- Tất cả interactive controls có role, label/state phù hợp và touch target tối thiểu 44x44px.
- Body text và semantic text đạt WCAG AA; trạng thái không phụ thuộc riêng vào màu.
- App dùng được ở font scale 200% mà không che CTA hoặc mất nội dung quan trọng.
- Query/polling chỉ chạy khi cần; refresh không tải dữ liệu của tab không liên quan.
- `tsc`, encoding, Expo Doctor, lint và test suite đều pass trong CI.
- Không còn Expo template route/component có thể truy cập trong production build.

## 6. Giả định và phối hợp

- Review dựa trên current working tree, bao gồm thay đổi chưa commit ở `account.tsx` và `orders/[id].tsx`; không đề xuất revert các thay đổi đó.
- `Plan_fix_order_detail.md` là nguồn kế hoạch chính cho redesign order detail/payment; tài liệu này chỉ bổ sung rủi ro và dependency toàn app.
- Bản phát hành gần nhất ưu tiên giao diện light-only; dark mode đầy đủ là một hạng mục riêng.
- MVP ưu tiên tiếng Việt; đa ngôn ngữ chỉ triển khai khi product xác nhận phạm vi.
