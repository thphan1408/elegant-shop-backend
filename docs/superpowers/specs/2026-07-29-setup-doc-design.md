# Thiết kế: Tài liệu dựng lại dự án từ đầu (SETUP.md)

- **Ngày:** 2026-07-29
- **Trạng thái:** Đã duyệt thiết kế, chờ lập kế hoạch triển khai
- **Phạm vi:** `F:\elegant-shop-backend` (NestJS) và `F:\elegant-shop` (Next.js)

## 1. Vấn đề

Hai dự án đều đã chạy được, nhưng tài liệu hướng dẫn dựng lại thì không dùng lại được. Sáu điểm hỏng đã kiểm chứng trực tiếp từ mã nguồn:

| # | Phát hiện | Nguồn kiểm chứng | Hậu quả |
|---|---|---|---|
| 1 | Backend không có `.env.example`; `.env` bị `.gitignore` | `.gitignore:39`, `git ls-files` | Người clone về không biết cần biến nào |
| 2 | Mục "Bước 3" của README thiếu toàn bộ nhóm `MAIL_*`, trong khi Joi đánh dấu `required` | `README.md:195-218` vs `src/configs/config.module.ts:22-26` | Làm đúng README thì app **không khởi động được** |
| 3 | `.env.example` của frontend thừa `DATABASE_URL` và `JWT_SECRET` | `F:\elegant-shop\.env.example` | Hiểu nhầm frontend nối thẳng database; thực tế chỉ cần `NEXT_PUBLIC_API_URL` |
| 4 | README ghi Node ≥ 18 | `README.md:174` | Next 16 + React 19 không chạy trên Node 18; máy hiện tại dùng Node 22.17.1 |
| 5 | `prisma/seed.ts` xoá sạch mọi bảng trước khi seed | `prisma/seed.ts:28-40` | Tài liệu không thể viết "cứ chạy seed" mà không cảnh báo |
| 6 | Frontend nối backend bằng hai đường song song | `services/api.ts:12` và `next.config.ts:4-16` | Cấu hình nhầm đường thì gọi API hỏng mà không rõ lý do |

Ngoài ra, `.env` hiện tại chứa hai key rác: `BCRYPT_SALT` (không xuất hiện ở bất kỳ đâu trong `src/`, số vòng băm được hardcode `10` trong `auth.service.ts` và `init.service.ts`) và `JWT_EXPIRES` (sai tên; Joi chờ `JWT_EXPIRES_IN`, nên giá trị này bị bỏ qua và hệ thống lặng lẽ dùng mặc định `1d`).

## 2. Mục tiêu

Một người — kể cả chính tác giả sau nhiều tháng không đụng tới — đi từ **máy trắng** đến **đặt được một đơn hàng thật** trên máy local, chỉ bằng cách đọc một file duy nhất theo thứ tự từ trên xuống.

Tiêu chí thành công: làm theo `SETUP.md` không cần mở mã nguồn để đoán bất kỳ biến môi trường hay lệnh nào.

## 3. Ngoài phạm vi

Docker, deploy production, CI, script tự động hoá (`npm run setup`), viết lại mã nguồn, tài liệu API (README đã lo phần này).

## 4. Sản phẩm giao

| File | Hành động | Lý do |
|---|---|---|
| `elegant-shop-backend\SETUP.md` | Tạo mới | Nguồn sự thật duy nhất cho việc dựng lại dự án |
| `elegant-shop-backend\.env.example` | Tạo mới | Danh sách biến sống cạnh mã nguồn, không lệch được như markdown |
| `elegant-shop\.env.example` | Sửa | Bỏ `DATABASE_URL`, `JWT_SECRET`; giữ đúng biến frontend thật sự dùng |
| `elegant-shop-backend\README.md` | Sửa | Cắt mục "📦 Cài đặt" (dòng 170-259), thay bằng một dòng trỏ sang `SETUP.md` |

Hai file `.env.example` và `SETUP.md` phải liệt kê **cùng một tập biến**; đây là ràng buộc cần kiểm tra lại trước khi giao.

## 5. Bố cục SETUP.md

Tài liệu viết bằng tiếng Việt, một luồng tuyến tính, mỗi mục là một bước làm được ngay.

| Mục | Nội dung |
|---|---|
| 0 | **Bức tranh tổng thể** — hai repo, ai gọi ai, cổng 8080 (backend) và 3000 (frontend), sơ đồ nhỏ |
| 1 | **Yêu cầu môi trường** — Node 22.x, npm 10.x, PostgreSQL; ghi rõ đây là mốc đã chạy được trên máy hiện tại |
| 2 | **Lấy mã nguồn** — hai repo và vị trí thư mục |
| 3 | **Backend: cài đặt và `.env`** — `cp .env.example .env`, chỉ rõ nhóm nào bắt buộc sửa tay; giải thích từng biến nằm trong comment của `.env.example` chứ **không** chép lại thành bảng ở đây (tránh hai bản dễ lệch nhau) |
| 4 | **Database** — tạo database, `npm run prisma:deploy`, `npm run prisma:generate` |
| 5 | **Dữ liệu mẫu** — `npm run prisma:seed` kèm cảnh báo xoá sạch, bảng tài khoản đăng nhập được sau khi seed |
| 6 | **Chạy backend** — `npm run dev`, kiểm tra `http://localhost:8080/api/docs`, cách lấy test token |
| 7 | **Frontend** — cài đặt, `.env.local`, `npm run dev` |
| 8 | **Hai đường frontend ↔ backend** — `NEXT_PUBLIC_API_URL` so với rewrites `/api/*`; dùng đường nào và khi nào cần `BACKEND_URL` |
| 9 | **Kiểm tra đầu-cuối** — smoke test ở §8 của thiết kế này |
| 10 | **Sự cố thường gặp** — bảng lỗi → nguyên nhân → cách sửa |
| 11 | **Lệnh hay dùng** — bảng gọn cho cả hai dự án |

## 6. Bảng biến môi trường backend

Nguồn sự thật là schema Joi trong `src/configs/config.module.ts`. Cột "Bắt buộc" nghĩa là thiếu thì ứng dụng từ chối khởi động.

| Biến | Bắt buộc | Mặc định | Dùng để làm gì |
|---|---|---|---|
| `DATABASE_URL` | Có | – | Chuỗi kết nối Postgres. `PrismaService` đọc thẳng trong constructor và throw nếu thiếu |
| `JWT_SECRET` | Có | – | Ký access token; `JwtStrategy` cũng đọc biến này |
| `JWT_EXPIRES_IN` | Không | `1d` | Hạn access token |
| `JWT_REFRESH_SECRET` | Không | Dùng lại `JWT_SECRET` | Ký refresh token |
| `JWT_REFRESH_EXPIRES_IN` | Không | `7d` | Hạn refresh token |
| `CLOUDINARY_CLOUD_NAME` | Có | – | Upload ảnh và file đính kèm của FAQ |
| `CLOUDINARY_API_KEY` | Có | – | |
| `CLOUDINARY_API_SECRET` | Có | – | |
| `MAIL_HOST` | Có | – | SMTP gửi email chào mừng và xác nhận đơn hàng |
| `MAIL_PORT` | Không | `587` | |
| `MAIL_USER` | Có | – | |
| `MAIL_PASSWORD` | Có | – | Với Gmail phải là app password, không phải mật khẩu tài khoản |
| `MAIL_FROM` | Có | – | Phải là email hợp lệ, Joi kiểm định dạng |
| `MAIL_SECURE` | Không | `false` | |
| `MAIL_IGNORE_TLS` | Không | `false` | |
| `NODE_ENV` | Không | `development` | Chỉ nhận `development`, `production`, `test` |
| `PORT` | Không | `8080` | |
| `DEFAULT_ADMIN_EMAIL` | Không | – | `InitService` tạo tài khoản admin lúc khởi động; thiếu thì bỏ qua và ghi log cảnh báo |
| `DEFAULT_ADMIN_USERNAME` | Không | – | |
| `DEFAULT_ADMIN_PASSWORD` | Không | – | In ra console lần đầu khởi động |

Joi đặt `allowUnknown: true`, nên nhóm `DEFAULT_ADMIN_*` lọt qua tầng kiểm định mà vẫn dùng được. `.env.example` mới **không** chứa `BCRYPT_SALT` và `JWT_EXPIRES`.

Biến của frontend chỉ có một: `NEXT_PUBLIC_API_URL` (mặc định trong mã là `http://localhost:8080/api`). `BACKEND_URL` là tuỳ chọn, chỉ tác động tới rewrites ở chế độ dev.

Về lệnh migrate: tài liệu dùng `npm run prisma:deploy` để áp các migration đã có sẵn trong `prisma/migrations/`, vì đó đúng là việc cần làm khi dựng database mới. Không dùng `npm run migrate:dev` ở bước này — script đó bị gắn cứng `--name init` (`package.json:23`), chỉ hợp khi tạo migration mới sau này.

## 7. Tài khoản đăng nhập sau khi seed

| Nguồn | Tài khoản | Mật khẩu |
|---|---|---|
| `InitService` lúc khởi động | Theo `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_USERNAME` | Theo `DEFAULT_ADMIN_PASSWORD`, in ra console |
| `prisma/seed.ts` | Danh sách khách hàng ghi trong `seed-credentials.json` | `Customer123` |

Seed **không** tạo admin — admin do `InitService` tạo khi ứng dụng khởi động. Tài liệu phải nói rõ điều này, vì đây là chỗ dễ tưởng nhầm rằng seed lo hết.

## 8. Smoke test đầu-cuối

Sáu bước, chạy trên trình duyệt sau khi cả hai dự án đã lên:

1. Mở `http://localhost:3000`, thấy danh sách sản phẩm đã seed
2. **Chưa đăng nhập**, thêm một sản phẩm vào giỏ
3. Đăng ký tài khoản mới
4. Kiểm tra giỏ hàng: món vừa thêm lúc chưa đăng nhập vẫn còn
5. Đặt hàng
6. Xem lại đơn vừa đặt trong danh sách đơn hàng

Bước 4 là phép thử quan trọng nhất. Nó chỉ đạt khi frontend gửi đúng header `X-Guest-Id` (`lib/guest-id.ts`), gọi đúng base URL, và backend chạy được `AuthService.mergeGuestCartAfterAuth` → `CartService.mergeGuestCart`. Sai bất kỳ mắt xích nào ở phần cấu hình nối hai dự án thì bước này hỏng, trong khi các bước khác vẫn có vẻ bình thường.

## 9. Bảng sự cố thường gặp

Tối thiểu phải bao gồm:

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| Lỗi validation config lúc khởi động | Thiếu biến bắt buộc, hay gặp nhất là nhóm `MAIL_*` | Đối chiếu `.env` với `.env.example` |
| Prisma `P1001` | Postgres chưa chạy hoặc `DATABASE_URL` sai | Kiểm tra service Postgres và chuỗi kết nối |
| `EADDRINUSE` cổng 8080 | Tiến trình cũ còn sống | Tắt tiến trình hoặc đổi `PORT` |
| Frontend gọi API lỗi mạng | `NEXT_PUBLIC_API_URL` sai, hoặc backend chưa chạy | Kiểm tra `.env.local`, đổi biến rồi khởi động lại `next dev` |
| Kiểu dữ liệu Prisma báo lỗi sau khi sửa schema | Chưa sinh lại client | `npm run prisma:generate` |
| Dữ liệu dev bỗng trống trơn | Đã chạy `npm test` hoặc `npm run test:e2e` | Xem cảnh báo ở mục 11 |

Mục 11 phải cảnh báo rõ: `npm test` chạy **cả** e2e, mà phần lớn spec trong `test/e2e/` gọi `deleteMany({})` trên toàn bảng. Muốn test nhanh thì dùng `npm run test:unit`.

## 10. Nguyên tắc viết

Chỉ ghi những gì kiểm chứng được từ mã nguồn hoặc từ lệnh đã chạy thật. Phần không tự kiểm chứng được trên máy này — gửi email SMTP thật, upload Cloudinary thật — phải ghi rõ là **chưa kiểm chứng** thay vì khẳng định chắc chắn.

## 11. Kế hoạch kiểm chứng

Được phép chạy: `npx prisma generate`, `npm run build`, `npm run test:unit`, khởi động backend và frontend rồi tắt.

Không được chạy: `npm run prisma:seed`, `prisma migrate reset`, `npm run test:e2e`, `npm test`. Tất cả đều xoá dữ liệu trong database dev hiện tại.

Hệ quả: các bước seed và migrate trong tài liệu được viết từ việc đọc mã nguồn, không phải từ lần chạy thật, và sẽ được ghi chú đúng như vậy.

## 12. Tiêu chí hoàn thành

1. Bốn file ở mục 4 đã được tạo hoặc sửa xong
2. Tập biến trong `SETUP.md`, `.env.example` của backend, và schema Joi khớp nhau
3. README không còn hướng dẫn cài đặt trùng lặp và mâu thuẫn
4. Các lệnh kiểm chứng ở mục 11 đã chạy và pass
5. Mọi khẳng định chưa kiểm chứng được đều đã ghi chú rõ
