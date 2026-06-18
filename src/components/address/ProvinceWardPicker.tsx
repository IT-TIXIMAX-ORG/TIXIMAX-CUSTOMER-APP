// Picker liên cấp Tỉnh/Thành → Phường/Xã theo đơn vị hành chính mới (sau sáp nhập 2025).
// Lưu/đọc theo TÊN (FullName) để tương thích API địa chỉ hiện tại (province/ward là chuỗi).
// Dữ liệu: src/shared/data/vn-administrative-units.json (34 tỉnh, 3321 xã/phường).

import { useMemo } from 'react';

import { SearchableSelectSheet, type SearchableOption } from '@/src/components/ui/SearchableSelectSheet';
import vnUnits from '@/src/shared/data/vn-administrative-units.json';

interface Ward {
  Code: string;
  FullName: string;
  ProvinceCode: string;
}

interface Province {
  Code: string;
  FullName: string;
  Wards: Ward[];
}

const PROVINCES = vnUnits as Province[];

const PROVINCE_OPTIONS: SearchableOption[] = PROVINCES.map((province) => ({
  label: province.FullName,
  value: province.FullName,
}));

interface ProvinceWardPickerProps {
  /** Tên tỉnh/thành đang chọn (FullName). */
  provinceName: string;
  /** Tên phường/xã đang chọn (FullName). */
  wardName: string;
  onChangeProvince: (provinceName: string) => void;
  onChangeWard: (wardName: string) => void;
}

export function ProvinceWardPicker({
  provinceName,
  wardName,
  onChangeProvince,
  onChangeWard,
}: ProvinceWardPickerProps) {
  const wardOptions = useMemo<SearchableOption[]>(() => {
    const province = PROVINCES.find((item) => item.FullName === provinceName);
    if (!province) return [];
    return province.Wards.map((ward) => ({ label: ward.FullName, value: ward.FullName }));
  }, [provinceName]);

  return (
    <>
      <SearchableSelectSheet
        label="Tỉnh/Thành phố"
        value={provinceName}
        placeholder="Chọn tỉnh/thành phố"
        searchPlaceholder="Tìm tỉnh/thành phố..."
        options={PROVINCE_OPTIONS}
        onChange={onChangeProvince}
      />
      <SearchableSelectSheet
        label="Phường/Xã"
        value={wardName}
        placeholder="Chọn phường/xã"
        searchPlaceholder="Tìm phường/xã..."
        options={wardOptions}
        onChange={onChangeWard}
        disabled={!provinceName}
        disabledHint="Chọn tỉnh/thành phố trước"
        emptyText="Không tìm thấy phường/xã"
      />
    </>
  );
}
