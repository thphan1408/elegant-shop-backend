# Bắt đầu từ đây

> Cập nhật: 2026-07-29 · Đọc file này trước, mất 5 phút.
> Nếu bạn vừa quay lại sau một thời gian dài không đụng code — đây đúng là chỗ cần mở.

## 1. Dự án này là gì

Backend e-commerce (NestJS + Prisma + PostgreSQL) phục vụ một storefront Next.js.
**Hai repo, một sản phẩm** — đừng quên nửa còn lại:

| Repo | Vai trò | Địa chỉ |
|---|---|---|
| `F:\elegant-shop-backend` | API · cổng **8080** · prefix `/api` | `github.com/thphan1408/elegant-shop-backend` |
| `F:\elegant-shop` | Giao diện Next.js · cổng **3000** | `github.com/thphan1408/elegant-shop` |

Frontend gọi backend qua `NEXT_PUBLIC_API_URL`, mặc định `http://localhost:8080/api`.
**Backend phải chạy trước**, không thì mọi thứ bên giao diện đều hỏng.

## 2. Chạy được trong 3 lệnh

| Việc | Lệnh |
|---|---|
| Sinh Prisma client (làm trước tiên) | `npm run prisma:generate` |
| Chạy backend | `npm run dev` → http://localhost:8080/api/docs |
| Chạy frontend | `cd F:\elegant-shop && npm run dev` → http://localhost:3000 |

Mở `/api/docs` là thấy toàn bộ API kèm chỗ bấm thử — nhanh hơn đọc code.

## 3. Đang ở đâu

**Backend — 9 module đã chạy:**
`auth` · `cart` · `order` · `product` · `review` · `faq` · `notification` · `user` · `cloudinary`

**Frontend đã có:** đăng nhập/đăng ký, danh sách + chi tiết sản phẩm, đánh giá,
gọi API giỏ hàng, profile, orders, shipping.

**Đang thiếu, và đây là chỗ đáng làm tiếp:** frontend chưa có trang `/cart` lẫn
`/checkout`, và chưa có `services/order.service.ts` — dù backend đã mở sẵn
`POST /api/orders/checkout`. Tức là backend đợi sẵn, giao diện chưa gọi tới.

## 4. Việc tiếp theo

Xem `ROADMAP.md`. Việc đầu bảng: **`services/order.service.ts` bên frontend** — nhỏ,
làm xong thấy kết quả ngay, và mở đường cho trang `/checkout`.

## 5. Quên hết rồi thì đi đường nào

| Muốn gì | Đọc / gõ |
|---|---|
| Hiểu tổng thể hệ thống | `ARCHITECTURE.md` |
| Học lại có lộ trình, từng chặng | `LEARNING-PATH.md` |
| Ôn thuật toán (12 mục, kèm độ phức tạp) | `ALGORITHMS.md` |
| Hiểu một module cụ thể | gõ `/hieu-code <tên module>` |
| Bắt tay làm một task | gõ `/mentor-mode <tên task>` |

Hai lệnh cuối là skill riêng của dự án này. `/hieu-code` giải thích và vẽ luồng
xuyên cả hai repo. `/mentor-mode` sẽ giảng, viết sẵn test đỏ, rồi **để bạn tự viết
code cho xanh** — cố ý như vậy, vì đọc code người khác viết thì quên nhanh hơn nhiều.
