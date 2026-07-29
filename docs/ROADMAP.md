# Việc còn lại

> Cập nhật: 2026-07-29

Xếp theo thứ tự nên làm — việc trước mở đường cho việc sau. Mỗi mục ghi rõ chạm file
nào và nghiệm thu thế nào, để không phải nghĩ lại từ đầu.

Bắt tay vào việc nào thì gõ `/mentor-mode <tên việc>`.

---

## 1. Frontend: `order.service.ts` — LỖ HỔNG ĐANG MỞ

Backend đã mở `POST /api/orders/checkout` (`src/order/order.controller.ts:77`), cho
phép cả khách vãng lai đặt hàng. Nhưng frontend **chưa có service nào gọi tới**.
Thư mục `app/orders` đã tồn tại mà thiếu hẳn tầng service bên dưới.

Đây là việc nên làm đầu tiên: nhỏ, có mẫu sẵn để chép theo, và làm xong là thấy kết
quả ngay.

- **Chạm:** tạo `F:\elegant-shop\services\order.service.ts`
- **Mẫu tham chiếu:** `F:\elegant-shop\services\cart.service.ts` — cùng dạng, 6 hàm
  gọi axios, đọc là hiểu ngay
- **Ôn trước:** không cần gì mới, chỉ cần đối chiếu bảng đường nối trong `ARCHITECTURE.md`
- **Xong khi:** đặt được một đơn từ giao diện, rồi tra lại đơn đó qua
  `GET /api/orders/track/:orderNumber` và thấy đúng dữ liệu

## 2. Frontend: trang `/cart` và `/checkout`

`app/(shop)` hiện mới chỉ có `product/[id]`. Chưa có trang giỏ hàng lẫn trang thanh
toán — dù `services/cart.service.ts` đã đủ cả 6 hàm (`getCart`, `addCartItem`,
`updateCartItem`, `removeCartItem`, `clearCart`, `mergeCart`).

Nói cách khác: tầng gọi API đã xong, chỉ thiếu giao diện.

- **Chạm:** `F:\elegant-shop\app\(shop)\cart\page.tsx`,
  `F:\elegant-shop\app\(shop)\checkout\page.tsx`
- **Phụ thuộc:** cần việc số 1 xong trước (trang checkout phải gọi được `order.service.ts`)
- **Xong khi:** luồng thêm hàng → xem giỏ → đặt hàng chạy trọn vẹn trên giao diện,
  không cần mở Swagger

## 3. Backend: quên mật khẩu

Chưa có luồng khôi phục mật khẩu. `NotificationModule` đã sẵn sàng để gửi email nên
phần khó nhất đã có.

- **Chạm:** `src/auth/auth.service.ts`, `prisma/schema.prisma` (thêm bảng lưu token
  khôi phục), `test/unit/auth/auth.service.spec.ts`
- **Mẫu tham chiếu:** cách `register()` trong `auth.service.ts` hash mật khẩu — token
  khôi phục cũng phải hash trước khi lưu, cùng một lý do
- **Ôn trước:** `ALGORITHMS.md` mục 4 (bcrypt). Điểm mấu chốt: nếu lưu token dạng thô,
  ai đọc được database là chiếm được mọi tài khoản
- **Xong khi:** `npm run test:unit` xanh, có ca kiểm thử cho token **hết hạn** và token
  **dùng lại lần hai**

## 4. Kiểm thử checkout đầu-cuối

`test/e2e/cart.e2e-spec.ts` đang tồn tại trong thư mục làm việc nhưng chưa được commit.

- **Chạm:** `test/e2e/cart.e2e-spec.ts`, `test/e2e/order.e2e-spec.ts`
- **Xong khi:** `npm run test:e2e` xanh. Nhớ e2e chạy tuần tự (`--maxWorkers=1`, đã
  cấu hình sẵn) vì dùng chung database — chạy song song sẽ đỏ vì lý do không liên
  quan gì tới code

---

## Ghi chú

Bốn việc trên bám sát tình trạng code tại ngày cập nhật. Khi làm xong việc nào, sửa
luôn file này — tài liệu lỗi thời còn tệ hơn không có tài liệu.

Tài liệu cũ (`FEATURE_ROADMAP.md` với danh sách "Priority 1–5, Phase 1–8 tuần") đã
được thay thế: nó liệt kê tính năng chung chung không bám code thật, và vẫn ghi 7
module trong khi dự án đã có 9.
