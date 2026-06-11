# Plan: Hien thi cham do cho don hang co payment chua thanh toan

## Summary

- Them dau cham mau do tren danh sach don hang trong screen `Don hang`.
- Cham do chi hien khi don co payment chua thanh toan hoac dang cho thanh toan.
- Ap dung cho ca tab `Dang xu ly` va tab `Lich su` vi hai tab dang dung hai card rieng.

## Implementation Changes

- Tao helper dung chung de xac dinh don can canh bao thanh toan, vi list hien chua co `paymentSessions`, `productPayment`, `shippingPayment`.
- V1 suy ra tu status hien co tren list:
  - Active order: dung `order.orderStatus`, fallback `trackingSummary.displayStatus` va `trackingSummary.orderMainStatus`.
  - History order: dung `order.status`.
  - Cac status can hien cham do: `CHO_THANH_TOAN`, `CHO_THANH_TOAN_DAU_GIA`, `CHUA_THANH_TOAN`, `WAITING_FOR_PAYMENT`, `PENDING`, `CHO_THANH_TOAN_SHIP`.
- Chuan hoa status hien thi ben ngoai screen `Don hang`:
  - Status badge tren card phai uu tien status cap order (`order.orderStatus` voi active order, `order.status` voi history order).
  - Khong dung status cua `order_link`/tracking link de hien thi status chinh cua card, vi link status co the lech voi trang thai thanh toan/tong the cua don.
  - Chi dung `trackingSummary.displayStatus` lam fallback neu API active order khong co `orderStatus`.
- Sua `src/components/dashboard/ActiveOrderCard.tsx`:
  - Tinh `hasUnpaidPayment` bang helper.
  - Hien mot cham do 8-10px mau `colors.error` canh gan `orderCode`.
  - Cap nhat status badge neu dang lay tu link status: status chinh phai la status cua order.
  - Them `accessibilityLabel` neu co cham do: `Don ... co thanh toan chua hoan tat`.
- Sua `src/components/orders/OrderListItem.tsx`:
  - Dung cung helper.
  - Hien cham do gan ma don trong header, khong lam doi layout status badge.
  - Giu status badge lay tu `order.status`.
- Khong doi API request, khong fetch them order detail cho tung item de tranh N+1 request.
- Neu backend sau nay tra field payment trong list, nang helper de uu tien field payment authoritative truoc status.

## UI Rules

- Cham do la indicator nho, khong thay the `StatusBadge`.
- Mau: `colors.error`.
- Kich thuoc: 8px hoac 10px, `borderRadius: full`.
- Vi tri:
  - Active card: nam cung hang voi `orderCode`, ngay sau ma don.
  - History card: nam cung hang voi `orderCode`, ngay sau ma don.
- Neu order code dai, text van `numberOfLines={1}` va cham do khong bi day mat khoi header.

## Test Plan

- Chay `npx tsc --noEmit`.
- Chay `npm run check:encoding`.
- QA thu cong:
  - Don co status `CHO_THANH_TOAN` hien cham do tren danh sach.
  - Don co status `CHO_THANH_TOAN_SHIP` hien cham do tren danh sach.
  - Don da thanh toan/hoan tat/huy khong hien cham do.
  - Tab `Dang xu ly` va `Lich su` deu hien dung.
  - Neu order co `orderStatus` khac status cua mot `order_link`, status badge ngoai danh sach hien theo `orderStatus`.
  - Bam vao card van di den man chi tiet don nhu hien tai.

## Assumptions

- Trong v1, "payment chua thanh toan" duoc suy ra tu status tren item list, vi API list hien khong tra day du payment session.
- Khong them request chi tiet don cho moi item tren list.
- Khong them text canh bao moi; chi them cham do do de lam noi bat.
