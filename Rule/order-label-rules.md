# Order Label Rules

## Timeline action labels

- Order journey actions must be rendered with `orderLogActionLabel` from `src/shared/lib/labels.ts`.
- Do not render raw backend action strings directly in the UI.
- New backend action values should be normalized with `normalizeLabelKey` and mapped to Vietnamese labels with accents.

Current required mappings:

| Backend value examples | UI label |
| --- | --- |
| `Tao Thanh Toan Hang`, `TAO_THANH_TOAN_HANG`, `TAO_THANH_TOAN_DON_HANG`, `CREATE_ORDER_PAYMENT` | `Tạo thanh toán đơn hàng` |
| `Duyet Don Customer`, `DUYET_DON_CUSTOMER` | `Duyệt đơn khách hàng` |
| `Xac Nhan Don`, `XAC_NHAN_DON` | `Xác nhận đơn` |

## Payment QR card

- Payment QR cards in `app/orders/[id].tsx` must not show `session.amount`.
- Keep the QR title localized through `transactionPurposeLabel`.
