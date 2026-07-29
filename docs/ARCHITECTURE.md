# Kiến trúc hệ thống

> Cập nhật: 2026-07-29

## ⚠️ Bẫy phải nhớ trước tiên

`JwtAuthGuard` được đăng ký làm `APP_GUARD` **toàn cục** trong `src/app.module.ts`.

⇒ **Mọi route mặc định đòi token.** Muốn mở công khai phải gắn `@Public()`.
Triệu chứng khi quên: gọi API nào cũng `401` dù code trông hoàn toàn đúng.

`ThrottlerGuard` cũng toàn cục: **100 request / 60 giây**.
Triệu chứng khi quên: `429` khi chạy test hàng loạt hoặc bấm nhanh trên giao diện.

Hai guard này khai báo cạnh nhau ở cuối `src/app.module.ts`. Khi thấy lỗi 401/429
khó hiểu, mở file đó ra trước.

## Đường đi của một request

```
HTTP  →  helmet  →  ValidationPipe (whitelist + transform)
      →  JwtAuthGuard (bỏ qua nếu có @Public)
      →  ThrottlerGuard
      →  *.controller.ts   (chỉ nhận và trả, không chứa logic)
      →  *.service.ts      (toàn bộ logic ở đây)
      →  PrismaService     (truy vấn DB)
      →  TransformInterceptor  (bọc response về dạng thống nhất)
      →  HttpExceptionFilter   (bắt lỗi, chuẩn hoá thông báo)
```

Cấu hình bootstrap nằm ở `src/main.ts`, lắp ráp module ở `src/app.module.ts`.

## 9 module backend

Mọi route đều có tiền tố `/api`.

| Module | Prefix | Route công khai (`@Public()`) |
|---|---|---|
| `auth` | `/api/auth` | `register`, `login`, `refresh`, `test-token` |
| `cart` | `/api/cart` | tất cả, **trừ** `POST /merge` |
| `order` | `/api/orders` | `POST /`, `POST /checkout`, `GET /track/:orderNumber` |
| `product` | `/api/products` | `GET /`, `GET /:id` |
| `review` | `/api/reviews` | `GET /`, `GET /:id`, `GET /:id/reactions`, `GET /:id/replies`, `GET /users/:userId/count` |
| `faq` | `/api/faqs` | `GET /`, `GET /:id`, `GET /products/:productId` |
| `user` | `/api/users` | không có — bảo vệ bằng `@Roles(ADMIN, MODERATOR)` |
| `notification` | `/api/notifications` | không có |
| `cloudinary` | (dùng nội bộ, gọi qua `faq`) | — |

Ba module hạ tầng không lộ route: `common` (filter, interceptor, init),
`configs` (env, logger Winston), `prisma` (kết nối DB).

Chú ý `order`: `POST /` và `POST /checkout` đều `@Public()` — **cố ý**, để khách
vãng lai đặt hàng không cần đăng ký. `GET /track/:orderNumber` công khai để tra cứu
đơn bằng mã.

## Đường nối frontend ↔ backend

Đây là vùng dễ vỡ nhất của hệ thống. Mỗi file `services/*.service.ts` bên frontend
ứng với một nhóm route backend:

| Frontend `F:\elegant-shop\services\` | Backend |
|---|---|
| `auth.service.ts` | `/api/auth` |
| `cart.service.ts` | `/api/cart` |
| `product.service.ts` | `/api/products` |
| `review.service.ts` | `/api/reviews` |
| `faq.service.ts` | `/api/faqs` |
| **(chưa có)** | `/api/orders` ← **lỗ hổng đang mở** |
| **(chưa có)** | `/api/notifications` |

Cấu hình gọi API: `services/api.ts:12` —
`baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"`.

> **Cảnh báo:** sửa một DTO bên backend thì service bên frontend gãy **im lặng**.
> Không unit test nào bắt được, e2e cũng không — vì hai repo test độc lập.
> Mỗi lần đổi DTO, mở bảng trên và tự đối chiếu file tương ứng.

Bên frontend, `store/` (Zustand) hiện **chỉ giữ state giao diện** — `cart-store.ts`
chỉ quản lý đóng/mở giỏ hàng. Dữ liệu giỏ hàng thật nằm ở server, lấy qua
`cart.service.ts`. Đừng nhầm hai thứ này.

## Dữ liệu

13 model trong `prisma/schema.prisma`:

| Nhóm | Model |
|---|---|
| Sản phẩm | `Product`, `ProductVariant` |
| Người dùng | `User` |
| Đơn hàng | `Order`, `OrderItem` |
| Giỏ hàng | `Cart`, `CartItem` |
| Đánh giá | `Review`, `ReviewReaction`, `ReviewReply` |
| Khác | `FAQ`, `EmailTemplate`, `EmailLog` |

Enum: `ProductStatus`, `ReactionType`, `FAQCategory`, `UserRole`, `OrderStatus`,
`PaymentMethod`, `EmailStatus`.

Quan hệ đáng nhớ: `Cart` gắn với `User` **hoặc** một `guestId` (khách vãng lai) —
đó là lý do tồn tại `POST /api/cart/merge`: khi khách đăng nhập, giỏ hàng vãng lai
được gộp vào giỏ của tài khoản.

## Kiểm thử

| Loại | Vị trí | Lệnh |
|---|---|---|
| Unit | `test/unit/<module>/` | `npm run test:unit` |
| E2E | `test/e2e/<module>.e2e-spec.ts` | `npm run test:e2e` |
| Bảo mật | `test/security/security-attack.test.ts` | nằm trong `npm test` |

E2E **phải chạy tuần tự** (`--maxWorkers=1`, đã cấu hình sẵn trong script) vì chúng
dùng chung một database.
