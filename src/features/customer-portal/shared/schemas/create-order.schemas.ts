import { z } from 'zod';

import { parseNumberInput } from '@/src/shared/lib/utils';

export type OrderTypeId = 'MUA_HO' | 'KY_GUI';

// Giá trị line giữ dạng string (input controlled), parse số khi build payload.
const productLineSchema = z.object({
  productName: z.string(),
  productLink: z.string(),
  website: z.string(),
  productTypeId: z.string(),
  quantity: z.string(),
  priceWeb: z.string(),
  shipmentCode: z.string(),
  note: z.string(),
  imageUri: z.string().optional(),
  imageId: z.string().optional(),
});

export type ProductLineForm = z.infer<typeof productLineSchema>;

// Validate line phụ thuộc loại đơn (MUA_HO cần link/website/giá web; KY_GUI thì không)
// nên dùng superRefine với orderType nằm trong form values — lỗi gắn đúng path lines.{i}.{field}.
export const createOrderSchema = z
  .object({
    orderType: z.enum(['MUA_HO', 'KY_GUI']),
    addressId: z.string().min(1, 'Vui lòng chọn địa chỉ nhận hàng'),
    routeId: z.string().min(1, 'Vui lòng chọn tuyến vận chuyển'),
    serviceType: z.string().min(1, 'Vui lòng chọn loại dịch vụ'),
    exchangeRate: z.string().refine((value) => parseNumberInput(value) > 0, 'Tỷ giá không hợp lệ'),
    priceShip: z
      .string()
      .refine((value) => value.trim() !== '' && parseNumberInput(value) >= 0, 'Cước vận chuyển không hợp lệ'),
    checkRequired: z.boolean(),
    lines: z.array(productLineSchema).min(1, 'Cần ít nhất 1 sản phẩm'),
  })
  .superRefine((data, ctx) => {
    data.lines.forEach((line, index) => {
      const issue = (field: keyof ProductLineForm, message: string) => {
        ctx.addIssue({ code: 'custom', path: ['lines', index, field], message });
      };
      if (!line.productName.trim()) issue('productName', 'Vui lòng nhập tên sản phẩm');
      if (!line.productTypeId) issue('productTypeId', 'Vui lòng chọn loại sản phẩm');
      if (parseNumberInput(line.quantity) <= 0) issue('quantity', 'Số lượng không hợp lệ');
      if (data.orderType === 'MUA_HO') {
        if (!line.productLink.trim()) issue('productLink', 'Vui lòng nhập link sản phẩm');
        if (!line.website.trim()) issue('website', 'Vui lòng nhập website');
        if (parseNumberInput(line.priceWeb) < 0) issue('priceWeb', 'Giá web không hợp lệ');
      } else if (data.orderType === 'KY_GUI') {
        if (!line.shipmentCode.trim()) issue('shipmentCode', 'Vui lòng nhập mã vận đơn');
      }
    });
  });

export type CreateOrderForm = z.infer<typeof createOrderSchema>;

export const emptyProductLine = (): ProductLineForm => ({
  productName: '',
  productLink: '',
  website: '',
  productTypeId: '',
  quantity: '1',
  priceWeb: '',
  shipmentCode: '',
  note: '',
});

export const blankOrderValues = (orderType: OrderTypeId): CreateOrderForm => ({
  orderType,
  addressId: '',
  routeId: '',
  serviceType: 'CLEAN',
  exchangeRate: '',
  priceShip: '',
  checkRequired: false,
  lines: [emptyProductLine()],
});
