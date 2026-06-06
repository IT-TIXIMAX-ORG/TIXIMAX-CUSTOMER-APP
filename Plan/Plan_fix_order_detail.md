KẾ HOẠCH THỰC THI UI/UX & KỸ THUẬT: TIXIMAX APP

Tính năng: Tái thiết kế màn hình Chi tiết đơn hàng & Thanh toán
Trạng thái: Sẵn sàng triển khai (Ready for Dev)

PHẦN 1: TÓM TẮT ĐỊNH HƯỚNG UX (THE "WHY")

Dựa trên phân tích các điểm nghẽn hiện tại, giao diện mới cần đạt 3 mục tiêu cốt lõi:

Hero Card: Hiển thị chính xác "Số tiền cần trả ngay lúc này" thay vì Tổng giá trị đơn hàng.

Contextual QR: Mã QR thanh toán tự động thay đổi theo đợt (Tiền hàng / Phí ship). Thu gọn các đợt đã thanh toán.

Compact Layout: Tối ưu không gian hiển thị ảnh sản phẩm (thumbnail) và hành trình đơn hàng (chỉ hiện 2 bước gần nhất).

PHẦN 2: CHI TIẾT LOGIC THỰC THI (THE "HOW")

2.1. Rule tính "Số tiền cần trả ngay" & Edge Cases

Hệ thống không lấy tổng tiền (total_amount), mà tính toán dựa trên trạng thái thanh toán hiện tại của đơn hàng.

Logic cơ bản (Pseudo-code):

let current_payable_amount = 0;

if (order.status === 'WAITING_GOODS_PAYMENT') {
    current_payable_amount = order.goods_amount - order.goods_paid_amount;
} else if (order.status === 'WAITING_SHIPPING_PAYMENT') {
    current_payable_amount = order.shipping_amount - order.shipping_paid_amount;
}


Bảng xử lý Edge Cases (Trường hợp ngoại lệ):

Tình huống (Edge Case)

Logic xử lý / Hiển thị UI

Thanh toán một phần (Partial) 



VD: Khách trả trước 1tr/1tr6

Hiển thị: "Cần thanh toán thêm: 600.000đ". QR code sinh ra đúng mức 600.000đ.

Phát sinh phụ phí sau khi đã thanh toán

Bật badge trạng thái "PHÁT SINH PHỤ PHÍ". Số tiền hero = Số tiền phụ phí. Nguồn thanh toán gán vào đợt mới.

Đơn hàng bị Hủy / Đã hoàn thành

Ẩn hoàn toàn Hero Card chứa số tiền và block mã QR. Đẩy block Hành trình đơn hàng lên thay thế.

Số tiền cần thanh toán = 0đ 



(Dùng mã freeship/voucher 100%)

Đổi trạng thái trực tiếp sang "CHỜ XỬ LÝ" / "ĐÃ XÁC NHẬN". Ẩn block QR thanh toán.

2.2. Chốt nguồn QR Code & Chiến lược Fallback

Mã QR không được dùng ảnh tĩnh (static) mà phải linh hoạt theo current_payable_amount.

Nguồn cấp (Primary): Gọi qua API của đối tác (VD: VietQR) hoặc Backend nội bộ trả về Data URL dạng base64/link ảnh.

Payload gửi đi: Bank_ID, Account_No, Amount (current_payable_amount), Description (Mã thanh toán của đợt đó, ví dụ: UGDB6039A37).

Chiến lược Fallback (Khi API lỗi, timeout hoặc trả về null):

KHÔNG hiển thị ô trống hoặc icon lỗi làm khách hoang mang.

UI Fallback: Ẩn khung chứa mã QR. Hiển thị thông tin chuyển khoản dạng Text List rõ ràng:

Tên ngân hàng & Chi nhánh.

Chủ tài khoản.

Số tài khoản (Kèm nút Copy).

Nội dung chuyển khoản (Kèm nút Copy).

Số tiền (Kèm nút Copy).

2.3. Logic hiển thị số bước hành trình động (Dynamic Steps)

Để tránh "Vertical Space Bloat" (chiếm quá nhiều diện tích dọc), timeline sẽ được render động.

Dữ liệu đầu vào: Mảng tracking_history (chiều dài N).

Logic hiển thị mặc định:

Nếu N <= 2: Render toàn bộ mảng. Ẩn nút "Xem toàn bộ".

Nếu N > 2: Chỉ render tracking_history[0] (mới nhất) và tracking_history[1] (kế tiếp).

Nút Action: Hiển thị nút "Xem Toàn Bộ Hành Trình (N bước)". Khi user tap vào:

Hành động mở rộng (Expand inline) dạng accordion ngay tại màn hình đó (ưu tiên).

Hoặc mở một Bottom Sheet hiển thị danh sách dạng scroll.

PHẦN 3: PHẠM VI CÔNG VIỆC & TIÊU CHÍ NGHIỆM THU (SCOPE & AC)

3.1. Scope File & Component (Dự kiến)

Frontend (Mobile App - React Native / Flutter):

OrderDetailScreen: Màn hình chính, chịu trách nhiệm fetch data và quản lý state.

HeroPaymentCard (New): Component hiển thị số tiền lớn & milestone đợt 1/đợt 2.

DynamicQRBlock (New): Component xử lý logic quét/hiển thị QR và Fallback UI.

CompactProductItem (Update): Sửa UI ảnh to thành thumbnail.

CollapsibleTimeline (Update): Component xử lý mảng tracking_history.

Backend (API):

Update Endpoint GET /v1/orders/{id}: Bổ sung field current_payable_amount, phân rã mảng payment_installments (đợt 1, đợt 2) thay vì gộp chung.

3.2. Tiêu chí nghiệm thu (Acceptance Criteria - DoD)

✅ Chức năng (Functional):

Số tiền hiển thị ở "Hero Card" phải khớp 100% với số tiền của đợt thanh toán hiện tại đang PENDING.

Mã QR khi dùng ứng dụng ngân hàng quét phải tự động điền đúng: (a) Số tiền hiện tại, (b) Nội dung chuyển khoản chứa mã giao dịch của đợt đó.

Khi ngắt mạng (Offline) hoặc Backend trả QR null, giao diện phải lập tức chuyển sang chế độ Fallback hiển thị text chuyển khoản mà không sập app.

Bấm "Sao chép CK" phải lưu đúng format nội dung vào clipboard và hiển thị Toast "Đã sao chép".

✅ Giao diện (UI/UX):

Giao diện đáp ứng đúng pixel-perfect so với bản thiết kế đề xuất (về màu sắc cảnh báo: Đỏ - Chờ thanh toán, Cam - Chờ duyệt, Xanh - Hoàn thành).

Không xảy ra giật/lag (layout shift) khi khung QR Code tải ảnh xong. Cần có placeholder skeleton trong lúc chờ load QR.

Trạng thái cũ (đã thanh toán) mặc định phải ở dạng thu gọn (collapsed), chỉ chiếm tối đa 40px chiều cao.