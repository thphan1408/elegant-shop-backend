# Lộ trình học lại

> Cập nhật: 2026-07-29

Đi theo thứ tự. Mỗi chặng khoảng 30–45 phút. Đừng nhảy cóc — chặng sau dựa vào chặng trước.

Cách dùng hiệu quả nhất: đọc phần **Đọc**, tự trả lời phần **Tự kiểm tra** *trước khi*
xem code lần hai. Trả lời không nổi thì mới quay lại đọc kỹ. Bí quá thì gõ
`/hieu-code <module>` để được giải thích kèm sơ đồ.

## Chặng 1 — Đường đi của một request

- **Đọc:** `src/main.ts` → `src/app.module.ts`
- **Hiểu:** một request vào `/api/...` đi qua helmet → `ValidationPipe` → guard toàn cục
  → controller → service → Prisma, rồi ra qua `TransformInterceptor`. Đây là bộ khung
  mà **mọi** module đều nằm trong đó.
- **Ôn:** middleware vs guard vs interceptor vs pipe — chúng khác nhau ở chỗ nào và
  chạy theo thứ tự nào
- **Tự kiểm tra:** trả lời được "vì sao gọi `GET /api/products` không cần token mà
  `GET /api/users` thì cần?" — nếu trả lời được là bạn đã nắm cơ chế `@Public()`

## Chặng 2 — Một module trọn vẹn, chọn cái nhỏ nhất

- **Đọc:** `src/faq/` — cả 4 phần: `faq.module.ts`, `faq.controller.ts`,
  `faq.service.ts`, `dto/`
- **Hiểu:** vì sao tách làm 4 loại file; DTO dùng để làm gì và ai kiểm tra nó;
  controller khác service ở chỗ nào
- **Ôn:** `dependency injection` (vì sao service được "tiêm" vào controller thay vì
  `new` ra), `class-validator` trên DTO
- **Tự kiểm tra:** tự vẽ lại sơ đồ 4 file của `faq` và mũi tên giữa chúng mà **không
  mở code**

## Chặng 3 — Xác thực

- **Đọc:** `src/auth/auth.service.ts` → `src/auth/strategies/jwt.strategy.ts` →
  `src/auth/guards/`
- **Hiểu:** đăng ký lưu **hash** chứ không lưu mật khẩu; token mang thông tin gì;
  `@Public()` vô hiệu hoá guard bằng cách nào
- **Ôn:** `ALGORITHMS.md` mục 4 (bcrypt) — vì sao cần salt, và vì sao "hàm băm chậm"
  lại là *ưu điểm* chứ không phải nhược điểm
- **Tự kiểm tra:** giải thích được vì sao **không thể** lấy lại mật khẩu gốc từ
  database, kể cả khi bạn là admin

## Chặng 4 — Dữ liệu và truy vấn

- **Đọc:** `prisma/schema.prisma` → `src/product/product.service.ts`
- **Hiểu:** quan hệ giữa 13 model; khác biệt `include` và `select`; đếm tổng và phân
  trang được làm song song thế nào
- **Ôn:** `ALGORITHMS.md` mục 1 (pagination), mục 5 (search), mục 12 (filtering)
- **Tự kiểm tra:** chỉ ra được chỗ nào trong `product.service.ts` có nguy cơ `N+1 query`,
  và vì sao `Promise.all` cho findMany + count lại nhanh hơn chạy lần lượt

## Chặng 5 — Giao dịch và tồn kho

- **Đọc:** `src/order/order.service.ts` → `src/cart/cart.service.ts`
- **Hiểu:** vì sao đặt hàng bắt buộc nằm trong `transaction`; trừ kho thế nào để hai
  người mua cùng lúc không bị âm kho; `guestId` phục vụ việc gì
- **Ôn:** `ALGORITHMS.md` mục 6 (transaction), mục 7 (atomic operations), mục 10
  (stock management)
- **Tự kiểm tra:** mô tả được chuyện gì xảy ra nếu hai người bấm mua sản phẩm cuối
  cùng **cùng một lúc**, và cơ chế nào ngăn cả hai cùng đặt thành công

## Chặng 6 — Nối sang frontend

- **Đọc:** `F:\elegant-shop\services\api.ts` → `F:\elegant-shop\services\cart.service.ts`
- **Hiểu:** frontend gọi backend ở đâu, token được gắn vào request thế nào, và vì sao
  `store/cart-store.ts` **không** chứa dữ liệu giỏ hàng
- **Ôn:** bảng đường nối trong `ARCHITECTURE.md` — học thuộc *hình dạng* của nó, không
  cần thuộc từng dòng
- **Tự kiểm tra:** liệt kê được những gì sẽ gãy nếu bạn đổi tên một field trong model
  `CartItem` — và vì sao **không** test nào bắt được lỗi đó

---

## Học xong rồi thì làm gì

Mở `ROADMAP.md`, chọn việc số 1, rồi gõ `/mentor-mode <tên việc>`.
Skill sẽ giảng, viết sẵn test đỏ, và để bạn tự viết code cho xanh.
