# Order Label Rules

## General rules

- Statuses must be rendered with `statusLabel` from `src/shared/lib/labels.ts`.
- Order journey actions must be rendered with `orderLogActionLabel` from `src/shared/lib/labels.ts`.
- Do not render raw backend status or action strings directly in the UI.
- New backend values must be normalized with `normalizeLabelKey` and mapped to Vietnamese labels with accents.
- Unknown values fall back to `humanizeEnum`. Missing journey actions fall back to `Cập nhật đơn hàng`.

## Status labels

| Normalized backend values | UI label |
| --- | --- |
| `CHO_XAC_NHAN` | `Chờ xác nhận` |
| `DA_XAC_NHAN` | `Đã xác nhận` |
| `CHO_THANH_TOAN`, `CHO_THANH_TOAN_DAU_GIA`, `CHUA_THANH_TOAN`, `WAITING_FOR_PAYMENT`, `PENDING` | `Chờ thanh toán` |
| `CHO_MUA` | `Chờ mua` |
| `DA_MUA` | `Đã mua` |
| `DA_MUA_HANG` | `Đã mua hàng` |
| `DA_DONG_GOI` | `Đã đóng gói` |
| `DANG_XU_LY` | `Đang xử lý` |
| `CHO_NHAP_KHO_NN`, `CHO_NHAP_KHO_NUOC_NGOAI` | `Chờ nhập kho nước ngoài` |
| `DA_NHAP_KHO_NN`, `DA_NHAP_KHO_NUOC_NGOAI` | `Đã nhập kho nước ngoài` |
| `DANG_CHUYEN_VN` | `Đang chuyển về Việt Nam` |
| `CHO_NHAP_KHO_VN`, `CHO_NHAP_KHO_VIET_NAM` | `Chờ nhập kho Việt Nam` |
| `DA_NHAP_KHO_VN`, `DA_NHAP_KHO_VIET_NAM` | `Đã nhập kho Việt Nam` |
| `CHO_THANH_TOAN_SHIP` | `Chờ thanh toán vận chuyển` |
| `CHO_GIAO` | `Chờ giao` |
| `DANG_GIAO` | `Đang giao` |
| `DA_GIAO`, `COMPLETED` | `Đã giao` |
| `DA_THANH_TOAN`, `SUCCESS` | `Thành công` |
| `FAILED` | `Thất bại` |
| `CANCELLED`, `DA_HUY` | `Đã hủy` |

## Status badge tones

| Tone | Normalized backend values |
| --- | --- |
| Warning | `CHO_THANH_TOAN`, `CHO_THANH_TOAN_DAU_GIA`, `CHO_THANH_TOAN_SHIP`, `CHUA_THANH_TOAN`, `WAITING_FOR_PAYMENT`, `PENDING` |
| Info | `DA_XAC_NHAN`, `CHO_MUA`, `DA_MUA`, `DANG_XU_LY`, `CHO_NHAP_KHO_NN`, `DA_NHAP_KHO_NN`, `DANG_CHUYEN_VN`, `CHO_NHAP_KHO_VN`, `DA_NHAP_KHO_VN`, `CHO_GIAO`, `DANG_GIAO` |
| Success | `DA_GIAO`, `COMPLETED`, `DA_THANH_TOAN`, `SUCCESS` |
| Error | `CANCELLED`, `DA_HUY`, `YEU_CAU_HUY`, `FAILED` |
| Neutral | Any status not listed above |

## Timeline action labels

| Normalized backend values | UI label |
| --- | --- |
| `TAO_DON`, `TAO_DON_HANG` | `Tạo đơn hàng` |
| `TAO_THANH_TOAN_HANG`, `TAO_THANH_TOAN_DON_HANG`, `CREATE_ORDER_PAYMENT` | `Tạo thanh toán đơn hàng` |
| `TAO_THANH_TOAN_SHIP`, `CREATE_SHIPPING_PAYMENT` | `Tạo thanh toán vận chuyển` |
| `CAP_NHAT_DON`, `CAP_NHAT_DON_HANG` | `Cập nhật đơn hàng` |
| `DUYET_DON` | `Duyệt đơn` |
| `DUYET_DON_CUSTOMER` | `Duyệt đơn khách hàng` |
| `XAC_NHAN_DON` | `Xác nhận đơn` |
| `HUY_DON` | `Hủy đơn` |
| `YEU_CAU_HUY` | `Yêu cầu hủy` |

## Payment QR card

- Payment QR cards in `app/orders/[id].tsx` must not show `session.amount`.
- Keep the QR title localized through `transactionPurposeLabel`.
