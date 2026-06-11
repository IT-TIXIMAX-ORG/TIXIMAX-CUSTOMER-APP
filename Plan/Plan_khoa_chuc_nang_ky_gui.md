# Plan: Tam khoa chuc nang Ky gui tren man Tao don

## Summary

- Giu the `Ky gui` hien thi trong man `Tao don`.
- Khi nguoi dung bam `Ky gui`, khong mo form tao don ky gui nua.
- Hien popup native voi noi dung: `Chuc nang se som ra mat`.

## Implementation Changes

- File can sua: `app/(tabs)/create-order.tsx`.
- Giu nguyen item `KY_GUI` trong `orderTypes` de UI van co lua chon Ky gui.
- Cap nhat `handleSelectType`:
  - Neu `type.id === 'KY_GUI'`, goi `Alert.alert('Thong bao', 'Chuc nang se som ra mat')`.
  - `return` ngay sau popup de khong goi `resetForm()` va khong `setSelectedType('KY_GUI')`.
  - Neu la `MUA_HO`, giu nguyen flow hien tai.
- Khong xoa code ky gui hien co de sau nay co the bat lai nhanh bang cach bo guard trong `handleSelectType`.
- Them comment ngan ngay tren guard de giai thich day la khoa tam thoi.

## Test Plan

- Chay `npx tsc --noEmit`.
- Chay `npm run check:encoding`.
- QA thu cong:
  - Vao tab `Tao don`.
  - Bam `Mua ho` van mo form tao don nhu hien tai.
  - Quay lai, bam `Ky gui` thay popup `Thong bao / Chuc nang se som ra mat`.
  - Sau khi dong popup, man van o danh sach chon loai don, khong hien form ky gui.
  - Khong co API master data/create-order nao bi goi chi vi bam `Ky gui`.

## Assumptions

- Popup duoc hieu la popup native `Alert.alert`, vi file nay da import va dung `Alert`.
- Khong doi text mo ta/icon cua the `Ky gui`.
- Khong xoa logic tao don ky gui, chi tam chan duong vao UI.
