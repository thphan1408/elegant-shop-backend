# elegant-shop-backend

Backend e-commerce: NestJS 11 · Prisma · PostgreSQL.
Cổng **8080**, prefix `/api`, Swagger `/api/docs`.

## Repo anh em

Frontend Next.js tại `F:\elegant-shop` (`github.com/thphan1408/elegant-shop`), gọi API
qua `NEXT_PUBLIC_API_URL`, mặc định `http://localhost:8080/api` (`services/api.ts:12`).

Bảng ánh xạ service ↔ route nằm ở `docs/ARCHITECTURE.md`.
**Sửa DTO ở đây thì frontend gãy im lặng — không test nào bắt được.** Mỗi lần đổi DTO,
mở bảng đó ra đối chiếu.

## Bẫy

- `JwtAuthGuard` là `APP_GUARD` **toàn cục** (`src/app.module.ts`) ⇒ mọi route đòi token,
  muốn mở công khai phải gắn `@Public()`. Quên là dính 401 khắp nơi.
- `ThrottlerGuard` cũng toàn cục: 100 request / 60 giây ⇒ chạy test nhanh quá sẽ dính 429.
- E2E phải chạy tuần tự (`--maxWorkers=1`, đã cấu hình trong script) vì dùng chung database.
- Windows: dòng kết thúc CRLF, prettier đã được chỉnh để chấp nhận.

## Quy ước một module

`src/<tên>/` gồm `<tên>.module.ts` · `<tên>.controller.ts` · `<tên>.service.ts` · `dto/`.

Controller chỉ nhận và trả, **logic nằm ở service**, truy vấn qua `PrismaService`.
Test đặt ở `test/unit/<tên>/` và `test/e2e/<tên>.e2e-spec.ts`.
Module nhỏ và gọn nhất để tham khảo khi cần mẫu: `src/faq/`.

## Lệnh

| Việc | Lệnh |
|---|---|
| Chạy dev | `npm run dev` |
| Test unit | `npm run test:unit` |
| Test e2e | `npm run test:e2e` |
| Sinh Prisma client | `npm run prisma:generate` |
| Tạo migration | `npm run migrate:dev` |

## Tài liệu

Đọc `docs/START-HERE.md` **trước tiên**. Sau đó tuỳ nhu cầu:
`ARCHITECTURE.md` (bản đồ hệ thống) · `LEARNING-PATH.md` (lộ trình học lại 6 chặng) ·
`ROADMAP.md` (việc còn lại) · `ALGORITHMS.md` (12 thuật toán kèm độ phức tạp).

## Cách làm việc với chủ dự án

Chủ dự án quay lại sau kỳ nghỉ dài và đang **học lại**, không phải đang cần code chạy nhanh.

Mặc định dùng skill `mentor-mode`: phân tích, chỉ pattern tham chiếu, viết test đỏ,
rồi **để chủ dự án tự viết implementation**. Đừng viết hộ trừ khi được yêu cầu rõ.

Giải thích bằng **tiếng Việt**, giữ nguyên thuật ngữ tiếng Anh (`dependency injection`,
`transaction`, `guard`, `race condition`) — tài liệu ngoài đời đều tiếng Anh.
