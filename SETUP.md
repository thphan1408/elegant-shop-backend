# Dựng lại Elegant Shop từ con số 0

Tài liệu này đưa bạn từ **máy trắng** tới chỗ **đặt được một đơn hàng thật** trên máy local, gồm cả backend lẫn frontend. Đọc tuần tự từ trên xuống, không cần mở mã nguồn để đoán bất kỳ biến hay lệnh nào.

Nếu chỉ cần tra cứu API, xem [README.md](./README.md) và Swagger UI.

## Mục lục

- [0. Bức tranh tổng thể](#0-bức-tranh-tổng-thể)
- [1. Yêu cầu môi trường](#1-yêu-cầu-môi-trường)
- [2. Lấy mã nguồn](#2-lấy-mã-nguồn)
- [3. Backend: cài đặt và file .env](#3-backend-cài-đặt-và-file-env)
- [4. Database](#4-database)
- [5. Dữ liệu mẫu](#5-dữ-liệu-mẫu)
- [6. Chạy backend](#6-chạy-backend)
- [7. Chạy frontend](#7-chạy-frontend)
- [8. Hai đường nối frontend ↔ backend](#8-hai-đường-nối-frontend--backend)
- [9. Kiểm tra đầu-cuối](#9-kiểm-tra-đầu-cuối)
- [10. Sự cố thường gặp](#10-sự-cố-thường-gặp)
- [11. Lệnh hay dùng](#11-lệnh-hay-dùng)

---

## 0. Bức tranh tổng thể

Hệ thống gồm **hai dự án nằm ở hai thư mục riêng**, chạy song song trên hai cổng khác nhau:

| Dự án | Thư mục | Vai trò | Cổng |
|---|---|---|---|
| Backend | `elegant-shop-backend` | API, xác thực, database | 8080 |
| Frontend | `elegant-shop` | Giao diện người dùng | 3000 |

```
Trình duyệt
    │
    ▼
Next.js  (cổng 3000)  ── giao diện, không giữ dữ liệu
    │  gọi HTTP
    ▼
NestJS   (cổng 8080)  ── toàn bộ nghiệp vụ, xác thực, kiểm tra tồn kho
    │  Prisma
    ▼
PostgreSQL
```

Điểm cần nhớ ngay từ đầu: **frontend không nối trực tiếp tới database**. Mọi dữ liệu đều đi qua backend. Thấy `DATABASE_URL` xuất hiện trong cấu hình frontend là dấu hiệu cấu hình sai.

Thứ tự dựng bắt buộc là backend trước, frontend sau — vì frontend không có gì để hiển thị khi API chưa sống.

Ước lượng thời gian: khoảng 20 phút nếu máy đã có sẵn Node và PostgreSQL, khoảng một tiếng nếu phải cài từ đầu.

---

## 1. Yêu cầu môi trường

| Phần mềm | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | 22.x | Mốc đã chạy được: **22.17.1** |
| npm | 10.x | Mốc đã chạy được: **10.9.2** |
| PostgreSQL | 12 trở lên | Bản 14-16 đều ổn |

> **Node 18 là không đủ.** Tài liệu cũ của dự án ghi mốc Node >= 18, nhưng frontend đang dùng Next.js 16 và React 19 — chúng đòi Node mới hơn hẳn. Nếu đang ở Node 18, hãy nâng cấp trước khi làm tiếp, đừng cố chạy rồi loay hoay với lỗi khó hiểu.

Kiểm tra máy:

```bash
node -v      # mong đợi v22.x
npm -v       # mong đợi 10.x
psql --version
```

Nếu `psql` báo không tìm thấy lệnh, PostgreSQL chưa được cài hoặc chưa nằm trong `PATH`. Cài xong nhớ xác nhận service đang **chạy**, không chỉ là đã cài.

---

## 2. Lấy mã nguồn

Đặt hai repo cạnh nhau cho dễ nhìn:

```bash
git clone <url-backend> elegant-shop-backend
git clone <url-frontend> elegant-shop
```

Kết quả mong đợi:

```
F:\
├── elegant-shop-backend\    ← đang đọc tài liệu này
└── elegant-shop\
```

Đặt ở đâu cũng được, miễn nhớ đường dẫn — mục 7 sẽ cần tới thư mục frontend.

---

## 3. Backend: cài đặt và file `.env`

```bash
cd elegant-shop-backend
npm install
```

Tạo file cấu hình từ file mẫu:

```bash
cp .env.example .env              # Git Bash
Copy-Item .env.example .env       # PowerShell
```

**Mọi giải thích về từng biến nằm ngay trong [`.env.example`](./.env.example)** dưới dạng comment — biến nào bắt buộc, mặc định là gì, lấy giá trị ở đâu. Tài liệu này cố tình không chép lại thành bảng, vì hai bản danh sách kiểu gì cũng có ngày lệch nhau.

Ba thứ **bắt buộc phải sửa tay** sau khi chép:

1. **`DATABASE_URL`** — đổi user, mật khẩu, tên database cho khớp PostgreSQL trên máy bạn
2. **`JWT_SECRET`** — đổi thành một chuỗi ngẫu nhiên thật dài, đừng để nguyên giá trị mẫu
3. **`DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_PASSWORD`** — thiếu cả ba thì hệ thống không tạo tài khoản admin nào, và bạn sẽ không vào được các chức năng quản trị

Còn **Cloudinary và SMTP thì cứ để nguyên giá trị giả** trong file mẫu nếu chỉ muốn chạy thử. Tầng kiểm định bắt buộc phải có mặt các biến này, nhưng:

- Cloudinary chỉ phục vụ upload ảnh/file của FAQ. Để giá trị giả thì app vẫn khởi động, chỉ riêng tính năng upload là hỏng.
- Email chào mừng và email xác nhận đơn hàng đều gửi kiểu *fire-and-forget* — mã nguồn cố tình nuốt lỗi SMTP để không chặn luồng chính (`auth.service.ts:146`, `order.service.ts:574`). Nghĩa là **SMTP hỏng vẫn đăng ký và đặt hàng bình thường**, chỉ là không có email nào tới.

Muốn dùng thật thì lấy khoá Cloudinary tại <https://console.cloudinary.com>, còn với Gmail phải tạo **app password** riêng chứ không dùng mật khẩu tài khoản.

> Thiếu bất kỳ biến bắt buộc nào, app sẽ thoát ngay lúc khởi động kèm lỗi validation — không phải lỗi ngẫu nhiên, mà là tầng kiểm định Joi trong `src/configs/config.module.ts` cố tình chặn. Xem cách xử lý ở [mục 10](#10-sự-cố-thường-gặp).

---

## 4. Database

Tạo một database rỗng:

```bash
createdb elegant_shop
```

Hoặc trong `psql`:

```sql
CREATE DATABASE elegant_shop;
```

Tên database phải khớp phần cuối của `DATABASE_URL` trong `.env`.

Áp các migration có sẵn rồi sinh Prisma Client:

```bash
npm run prisma:deploy      # áp 4 migration trong prisma/migrations/
npm run prisma:generate    # sinh Prisma Client theo schema
```

> **Đừng dùng `npm run migrate:dev` ở bước này.** Script đó bị gắn cứng cờ `--name init` (`package.json:23`), nó dành cho lúc bạn *tạo migration mới* sau khi sửa `schema.prisma`, không phải lúc dựng database từ migration có sẵn.

Sau này mỗi lần sửa `prisma/schema.prisma`, nhớ chạy lại `npm run prisma:generate`, nếu không TypeScript sẽ báo lỗi kiểu ở những chỗ vốn đang đúng.

*Ghi chú trung thực: hai lệnh trong mục này được viết từ việc đọc `package.json` và thư mục `prisma/migrations/`, chưa chạy thử lại trên máy hiện tại vì phải giữ nguyên dữ liệu đang có.*

---

## 5. Dữ liệu mẫu

> ⚠️ **`npm run prisma:seed` xoá sạch mọi bảng trước khi seed** (`prisma/seed.ts:28-40`). Chỉ chạy trên database mới dựng, hoặc khi bạn chấp nhận mất toàn bộ dữ liệu đang có. Không có đường lùi.

```bash
npm run prisma:seed
```

Seed tạo: sản phẩm kèm biến thể, FAQ (loại chung và loại gắn với sản phẩm), người dùng khách hàng, và đánh giá. Cuối cùng nó ghi file `seed-credentials.json` ở thư mục gốc chứa danh sách tài khoản vừa tạo.

**Seed không tạo tài khoản admin.** Đây là chỗ rất dễ hiểu nhầm. Admin do ứng dụng tự tạo lúc khởi động, ở mục tiếp theo.

Tài khoản đăng nhập được sau khi làm xong mục 5 và 6:

| Nguồn | Tài khoản | Mật khẩu |
|---|---|---|
| Ứng dụng tạo lúc khởi động | theo `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_USERNAME` trong `.env` | theo `DEFAULT_ADMIN_PASSWORD`, in ra console lần đầu |
| `npm run prisma:seed` | danh sách trong `seed-credentials.json` | `Customer123` cho tất cả |

---

## 6. Chạy backend

```bash
npm run dev
```

Trong log sẽ thấy:

```
Prisma connected to DB with adapter
Server is running on port: 8080
Swagger docs available at: http://localhost:8080/api/docs
```

> ⚠️ **Đừng tin hai dòng đầu là bằng chứng database đã sống.** Adapter `pg` nối theo kiểu lười: `$connect()` trả về thành công ngay cả khi PostgreSQL đang tắt, và Nest vẫn khởi động, vẫn phục vụ cổng 8080. Swagger ở `/api/docs` cũng vẫn trả về 200 vì nó không đụng tới database. Điều này đã được kiểm chứng trực tiếp: tắt PostgreSQL rồi chạy `npm run dev`, cả ba dòng log trên vẫn hiện y nguyên.

**Cách kiểm tra thật sự** — gọi một endpoint có truy vấn database:

```bash
curl -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/products
```

- `200` → backend và database đều ổn
- `500` → app sống nhưng **không nối được database**. Xem lại `DATABASE_URL` và kiểm tra PostgreSQL có đang chạy không

Dấu hiệu database chết còn lộ ra ngay lúc khởi động, ở khối log này:

```
ERROR [InitService] Failed to initialize admin account: { code: 'ECONNREFUSED' }
```

Thấy `ECONNREFUSED` là PostgreSQL chưa chạy hoặc sai cổng.

> Một dòng gây hoang mang khác: `ERROR [MailerService] Transporter is ready`. Nội dung là *ready*, tức thành công, chỉ là bị ghi nhầm ở mức ERROR. Không phải lỗi, cứ bỏ qua.

**Lần khởi động đầu tiên** còn in thêm một khối thông tin tài khoản admin vừa được tạo:

```
═══════════════════════════════════════════════════════════
⚠️  DEFAULT ADMIN ACCOUNT CREATED
═══════════════════════════════════════════════════════════
Email: ...
Username: ...
Password: ...
```

Chép lại ngay — những lần khởi động sau, hệ thống thấy đã có admin nên chỉ ghi `Admin account already exists, skipping creation` chứ không in lại mật khẩu.

### Test token khi cần thử API nhanh

```
POST http://localhost:8080/api/auth/test-token
```

Vài điểm cần biết trước khi dùng:

- Token **chỉ được in ra console của server**, không nằm trong response — response chỉ trả về câu `Test token generated. Check console for token.`
- Endpoint này bị ẩn khỏi Swagger (`@ApiExcludeEndpoint`), nên gọi bằng curl hoặc Postman.
- Token có hạn 100 năm và **bỏ qua mọi kiểm tra phân quyền**, mạnh hơn cả tài khoản admin thật. Chỉ dùng khi phát triển, tuyệt đối không đưa lên môi trường thật.
- Nó cần sẵn một tài khoản admin trong database. Chưa khởi động app lần nào với `DEFAULT_ADMIN_*` thì lệnh này báo lỗi không tìm thấy admin.

Backend đã chạy được rồi. Sang frontend ở mục tiếp theo.

---

## 7. Chạy frontend

**Để backend chạy nguyên đó**, mở một cửa sổ terminal thứ hai:

```bash
cd elegant-shop
npm install
cp .env.example .env.local              # Git Bash
Copy-Item .env.example .env.local       # PowerShell
npm run dev
```

Mở <http://localhost:3000>.

Nếu backend chưa chạy, trang vẫn tải được nhưng danh sách sản phẩm trống trơn — giao diện không tự báo lỗi, nên đừng tưởng nhầm là seed hỏng. Kiểm tra <http://localhost:8080/api/docs> trước.

Với cấu hình mặc định, `.env.local` không cần sửa gì: `NEXT_PUBLIC_API_URL` đã trỏ sẵn tới `http://localhost:8080/api`.

---

## 8. Hai đường nối frontend ↔ backend

Dự án có **hai cơ chế cùng tồn tại**, biết rõ cái nào đang hoạt động sẽ đỡ mất thời gian khi gỡ lỗi:

| Đường | Cấu hình bằng | Đọc ở | Khi nào có tác dụng |
|---|---|---|---|
| axios `baseURL` | `NEXT_PUBLIC_API_URL` | `services/api.ts:12` | **Đường chính.** Mọi lệnh gọi API xuất phát từ trình duyệt |
| Next.js rewrites | `BACKEND_URL` | `next.config.ts:13` | Chỉ ở chế độ dev, và chỉ với đường dẫn bắt đầu bằng `/api` |

Trong luồng dựng lại chuẩn, bạn chỉ cần quan tâm **đường thứ nhất**. Cứ để `BACKEND_URL` trống.

Hai cái bẫy đã có người vấp:

**Bẫy 1 — sửa `NEXT_PUBLIC_API_URL` mà không khởi động lại.** Biến `NEXT_PUBLIC_*` được nhúng thẳng vào bundle lúc build, refresh trình duyệt không ăn thua. Phải tắt `npm run dev` rồi chạy lại.

**Bẫy 2 — đặt `BACKEND_URL` thiếu đuôi `/:path*`.** Giá trị này thay thế **trọn** destination của rewrite, mà mặc định trong mã là `http://localhost:8080/api/:path*`. Đặt thành `http://localhost:8080/api` là mất phần `:path*` và hỏng định tuyến. Nếu buộc phải đặt (ví dụ backend nằm ở máy khác), viết đầy đủ:

```env
BACKEND_URL=http://192.168.1.10:8080/api/:path*
```

---

## 9. Kiểm tra đầu-cuối

Sáu bước này chứng minh cả hệ thống thật sự thông suốt, không chỉ là "hai server đều lên".

| # | Việc làm | Dấu hiệu đạt |
|---|---|---|
| 1 | Mở <http://localhost:3000> | Thấy danh sách sản phẩm đã seed |
| 2 | **Chưa đăng nhập**, thêm một sản phẩm vào giỏ | Giỏ hiện số lượng 1 |
| 3 | Đăng ký một tài khoản mới | Đăng ký thành công, vào được trang chủ |
| 4 | Mở lại giỏ hàng | **Món thêm ở bước 2 vẫn còn** |
| 5 | Đặt hàng | Nhận được mã đơn dạng `ORD-YYYYMMDD-XXX` |
| 6 | Mở danh sách đơn hàng | Thấy đơn vừa đặt |

**Bước 4 là phép thử quan trọng nhất.** Nó chỉ đạt khi cả chuỗi này hoạt động đúng:

1. Frontend sinh và lưu `X-Guest-Id` (`lib/guest-id.ts`), gắn vào mọi request
2. Frontend gọi đúng base URL của backend
3. Backend nhận ra danh tính khách, tạo giỏ gắn với `guestId`
4. Lúc đăng ký, backend chạy `AuthService.mergeGuestCartAfterAuth` → `CartService.mergeGuestCart`, gộp giỏ khách vào tài khoản mới

Đây cũng là chỗ duy nhất mà cấu hình nối hai dự án sai sẽ lộ ra: các bước còn lại vẫn trông bình thường, riêng bước 4 giỏ hàng trống.

Bước 5 chạy được kể cả khi SMTP là giá trị giả — email xác nhận đơn gửi kiểu fire-and-forget nên lỗi gửi mail không làm hỏng đơn.

---

## 10. Sự cố thường gặp

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| App thoát ngay lúc khởi động, log báo lỗi validation config | Thiếu biến bắt buộc. Hay gặp nhất là nhóm `MAIL_*` — tài liệu cũ của dự án từng bỏ sót nhóm này | Đối chiếu `.env` với [`.env.example`](./.env.example), điền đủ, kể cả bằng giá trị giả |
| Lệnh Prisma báo `P1001: Can't reach database server` | PostgreSQL chưa chạy, hoặc `DATABASE_URL` sai | Kiểm tra service PostgreSQL đang chạy; thử kết nối bằng `psql` với đúng thông tin trong `DATABASE_URL` |
| App khởi động **bình thường** nhưng mọi API trả 500, log có `ECONNREFUSED` kèm `Failed to initialize admin account` | Cũng là database chết — nhưng lúc chạy app thì triệu chứng khác hẳn lệnh Prisma CLI, vì adapter nối lười nên app không chết theo | `curl http://localhost:8080/api/products` để xác nhận (500 = hỏng), rồi bật PostgreSQL và khởi động lại |
| `EADDRINUSE: address already in use :::8080` | Một tiến trình backend cũ chưa tắt hẳn | Tắt tiến trình đó, hoặc đổi `PORT` trong `.env` |
| Trang chủ trống, DevTools báo lỗi mạng | Backend chưa chạy, hoặc `NEXT_PUBLIC_API_URL` sai | Mở <http://localhost:8080/api/docs> để xác nhận backend sống; sửa `.env.local` rồi **khởi động lại** `npm run dev` |
| TypeScript báo lỗi kiểu của Prisma ở chỗ vốn đang đúng | Sửa `schema.prisma` xong chưa sinh lại client | `npm run prisma:generate` |
| Bước 4 của mục 9 thất bại — giỏ hàng mất món sau khi đăng ký | Frontend không gửi được `X-Guest-Id`, hoặc gọi sai base URL | Mở tab Network, kiểm tra request `POST /api/cart/items` có header `X-Guest-Id` không |
| Giỏ hàng khách hỏng khi mở bằng địa chỉ IP trong mạng LAN | `lib/guest-id.ts` dùng `crypto.randomUUID()`, hàm này chỉ tồn tại trong secure context — tức `localhost` hoặc HTTPS, không có ở `http://192.168.x.x` | Dùng `localhost` để thử, hoặc dựng HTTPS nếu bắt buộc phải test từ thiết bị khác |
| Dữ liệu dev bỗng trống trơn | Đã lỡ chạy `npm test` hoặc `npm run test:e2e` | Chạy lại `npm run prisma:seed`; xem cảnh báo ở mục 11 |

---

## 11. Lệnh hay dùng

> ⚠️ **`npm test` chạy cả e2e, và phần lớn spec trong `test/e2e/` gọi `deleteMany({})` trên toàn bảng.** Chạy nhầm là mất sạch dữ liệu dev. Muốn kiểm tra nhanh thì dùng `npm run test:unit`.
>
> Ngoại lệ đáng học theo: `test/e2e/cart.e2e-spec.ts` tự tạo dữ liệu riêng theo tiền tố `e2e-cart` và chỉ dọn đúng phần của mình. Viết e2e mới nên theo khuôn này.

### Backend (`elegant-shop-backend`)

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy chế độ phát triển, tự khởi động lại khi sửa mã |
| `npm run build` | Biên dịch ra thư mục `dist/` |
| `npm run test:unit` | **An toàn** — chỉ chạy unit test, không đụng database |
| `npm test` | ⚠️ Chạy cả e2e, **xoá dữ liệu** |
| `npm run test:e2e` | ⚠️ Chỉ e2e, **xoá dữ liệu** |
| `npm run lint` | ESLint kèm tự sửa |
| `npm run prisma:generate` | Sinh lại Prisma Client sau khi sửa schema |
| `npm run prisma:deploy` | Áp các migration có sẵn |
| `npm run prisma:seed` | ⚠️ **Xoá sạch rồi nạp lại** dữ liệu mẫu |

### Frontend (`elegant-shop`)

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy chế độ phát triển ở cổng 3000 |
| `npm run build` | Build bản production |
| `npm run start` | Chạy bản đã build |
| `npm run lint` | ESLint |

### Địa chỉ hay dùng

| Địa chỉ | Nội dung |
|---|---|
| <http://localhost:3000> | Giao diện người dùng |
| <http://localhost:8080/api> | Gốc của API |
| <http://localhost:8080/api/docs> | Swagger UI |
