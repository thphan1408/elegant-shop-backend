# Kế hoạch triển khai: Hệ thống học lại & phát triển Elegant Shop

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng bộ tài liệu + skill để chủ dự án tự định hướng được "bắt đầu từ đâu, học lại từ đâu" sau kỳ nghỉ dài, và sống sót tới lần comeback 2027.

**Architecture:** Ba tầng. `CLAUDE.md` tự nạp mỗi phiên (bản đồ + quy ước). Hai skill gọi khi cần: `hieu-code` (đọc-hiểu, lần xuyên hai repo) và `mentor-mode` (làm task, dạy chứ không code hộ). Bộ `docs/` bốn file thay cho 16 file cũ trùng lặp và lỗi thời. Backend là bản gốc, frontend là bản sao.

**Tech Stack:** NestJS 11 · Prisma · PostgreSQL · Jest · Next.js (App Router) · Zustand · axios

## Global Constraints

- Ngôn ngữ tài liệu và skill: **tiếng Việt**, giữ nguyên thuật ngữ tiếng Anh (`dependency injection`, `transaction`, `guard`) — không dịch
- Backend chạy cổng **8080**, global prefix **`/api`**, Swagger tại **`/api/docs`**
- Frontend gọi API qua `process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"` (`services/api.ts:12`)
- Mọi đường dẫn file trong tài liệu phải là đường dẫn **có thật**, kiểm chứng được
- Không sửa file trong `src/` — kế hoạch này chỉ tạo tài liệu và skill
- Spec gốc: `docs/superpowers/specs/2026-07-29-mentor-comeback-system-design.md`
- Sao lưu tài liệu cũ: ref `refs/backup/docs-2026-07-29` ở **cả hai** repo

## File Structure

| File | Trách nhiệm |
|---|---|
| `.gitignore` (sửa) | Bỏ `/docs`, thay bằng `/docs/scratch/` |
| `docs/START-HERE.md` | Cửa vào duy nhất. 5 phút nắm được dự án ở đâu, làm gì tiếp |
| `docs/ARCHITECTURE.md` | Bản đồ 9 module backend + đường nối sang frontend |
| `docs/LEARNING-PATH.md` | Lộ trình học lại có thứ tự, neo vào file thật |
| `docs/ROADMAP.md` | Việc còn lại, xếp theo thứ tự làm được ngay |
| `docs/ALGORITHMS.md` | Khôi phục nguyên văn 585 dòng từ backup |
| `CLAUDE.md` | Bản đồ + quy ước, tự nạp mỗi phiên |
| `.claude/skills/mentor-mode/SKILL.md` | Quy trình 5 bước dạy-rồi-bàn-giao |
| `.claude/skills/hieu-code/SKILL.md` | Quy trình 4 phần đọc-hiểu xuyên repo |

---

### Task 1: Mở khoá `docs/` và khôi phục ALGORITHMS.md

**Files:**
- Modify: `.gitignore:58-60`
- Create: `docs/ALGORITHMS.md` (khôi phục từ backup)

**Interfaces:**
- Produces: thư mục `docs/` được git theo dõi; `docs/ALGORITHMS.md` làm đích cho mọi link "ôn thuật toán" ở các task sau

- [ ] **Step 1: Xác nhận `/docs` đang bị ignore**

```bash
git check-ignore -v docs/ALGORITHMS.md
```

Expected: in ra `.gitignore:60:/docs` (nếu Task này chưa chạy)

- [ ] **Step 2: Sửa `.gitignore`**

Thay dòng `/docs` bằng:

```gitignore
# docs/ ĐƯỢC commit — tài liệu phải sống sót khi clone lại máy khác.
# Chỉ loại trừ output tạm của phiên làm việc:
/docs/scratch/
```

Lưu ý: `/coverage` đã có ở dòng 19, **không** thêm lại.

- [ ] **Step 3: Khôi phục ALGORITHMS.md nguyên văn từ backup**

```bash
git show refs/backup/docs-2026-07-29:docs/ALGORITHMS.md > docs/ALGORITHMS.md
wc -l docs/ALGORITHMS.md
```

Expected: `585 docs/ALGORITHMS.md`

- [ ] **Step 4: Xác nhận git đã theo dõi được**

```bash
git check-ignore -v docs/ALGORITHMS.md || echo "OK - khong con bi ignore"
git status --porcelain docs/
```

Expected: in ra `OK - khong con bi ignore`, và `docs/ALGORITHMS.md` xuất hiện là `??`

- [ ] **Step 5: Commit**

```bash
git add .gitignore docs/ALGORITHMS.md
git commit -m "docs: dua docs/ vao git va khoi phuc ALGORITHMS.md"
```

---

### Task 2: `docs/START-HERE.md` — cửa vào duy nhất

**Files:**
- Create: `docs/START-HERE.md`

**Interfaces:**
- Consumes: `docs/ALGORITHMS.md` (Task 1)
- Produces: file mà `CLAUDE.md` (Task 6) và `README.md` sẽ trỏ tới đầu tiên

- [ ] **Step 1: Viết `docs/START-HERE.md`**

Phải chứa đúng năm phần, theo thứ tự:

```markdown
# Bắt đầu từ đây

> Cập nhật: 2026-07-29 · Đọc file này trước, mất 5 phút.

## 1. Dự án này là gì
Backend e-commerce (NestJS + Prisma + PostgreSQL) phục vụ storefront Next.js.
Hai repo, một sản phẩm:
- `F:\elegant-shop-backend` — API, cổng 8080, prefix `/api`
- `F:\elegant-shop` — giao diện Next.js, gọi `http://localhost:8080/api`

## 2. Chạy được trong 3 lệnh
| Việc | Lệnh |
|---|---|
| Sinh Prisma client | `npm run prisma:generate` |
| Chạy backend | `npm run dev` → http://localhost:8080/api/docs |
| Chạy frontend | `cd F:\elegant-shop && npm run dev` → http://localhost:3000 |

## 3. Đang ở đâu
9 module backend đã chạy: auth · cart · order · product · review · faq ·
notification · user · cloudinary.
Frontend đã có: đăng nhập/đăng ký, danh sách + chi tiết sản phẩm, đánh giá,
giỏ hàng (gọi API), profile, orders.

## 4. Việc tiếp theo
Xem `ROADMAP.md`. Việc đầu bảng: trang `/cart` và `/checkout` bên frontend.

## 5. Quên hết rồi thì đi đường nào
| Muốn gì | Đọc / gõ |
|---|---|
| Hiểu tổng thể hệ thống | `ARCHITECTURE.md` |
| Học lại có lộ trình | `LEARNING-PATH.md` |
| Ôn thuật toán | `ALGORITHMS.md` |
| Hiểu một module cụ thể | gõ `/hieu-code <tên module>` |
| Bắt tay làm một task | gõ `/mentor-mode <tên task>` |
```

- [ ] **Step 2: Kiểm chứng mọi lệnh trong bảng đều có thật**

```bash
node -e "const s=require('./package.json').scripts; ['dev','prisma:generate'].forEach(k=>{if(!s[k])throw new Error('THIEU script: '+k); console.log('OK',k,'=',s[k])})"
grep -n '"dev"' /f/elegant-shop/package.json
```

Expected: in `OK dev = nest start --watch`, `OK prisma:generate = npx prisma generate`, và dòng `"dev": "next dev"` của frontend

- [ ] **Step 3: Kiểm chứng có đủ 5 phần**

```bash
grep -c "^## " docs/START-HERE.md
```

Expected: `5`

- [ ] **Step 4: Commit**

```bash
git add docs/START-HERE.md
git commit -m "docs: them START-HERE.md lam cua vao duy nhat"
```

---

### Task 3: `docs/ARCHITECTURE.md` — bản đồ hệ thống

**Files:**
- Create: `docs/ARCHITECTURE.md`

**Interfaces:**
- Produces: bảng route và bảng seam mà skill `hieu-code` (Task 8) trỏ tới

- [ ] **Step 1: Viết `docs/ARCHITECTURE.md`**

Bốn phần bắt buộc, dùng đúng số liệu đã kiểm chứng dưới đây:

**Phần "Bẫy phải nhớ trước tiên"** — đặt ngay đầu file:

```markdown
## ⚠️ Bẫy phải nhớ trước tiên

`JwtAuthGuard` được đăng ký làm `APP_GUARD` toàn cục trong `src/app.module.ts`.
⇒ **Mọi route mặc định đòi token.** Muốn mở công khai phải gắn `@Public()`.
Triệu chứng khi quên: gọi API nào cũng 401 dù code trông đúng.

`ThrottlerGuard` cũng toàn cục: 100 request / 60 giây.
Triệu chứng khi quên: 429 khi chạy test hoặc bấm nhanh.
```

**Phần "9 module backend"** — bảng module → route gốc → route công khai:

| Module | Prefix | Route `@Public()` |
|---|---|---|
| auth | `/api/auth` | `register`, `login`, `refresh`, `test-token` |
| cart | `/api/cart` | tất cả trừ `POST /merge` |
| order | `/api/orders` | `POST /`, `POST /checkout`, `GET /track/:orderNumber` |
| product | `/api/products` | `GET /`, `GET /:id` |
| review | `/api/reviews` | `GET /`, `GET /:id`, `GET /:id/reactions`, `GET /:id/replies`, `GET /users/:userId/count` |
| faq | `/api/faqs` | `GET /`, `GET /:id`, `GET /products/:productId` |
| user | `/api/users` | không có — `@Roles(ADMIN/MODERATOR)` |
| notification | `/api/notifications` | không có |
| cloudinary | (dùng nội bộ qua faq) | — |

**Phần "Đường nối frontend ↔ backend"** — bảng ánh xạ:

| Frontend | Backend |
|---|---|
| `services/auth.service.ts` | `/api/auth` |
| `services/cart.service.ts` | `/api/cart` |
| `services/product.service.ts` | `/api/products` |
| `services/review.service.ts` | `/api/reviews` |
| `services/faq.service.ts` | `/api/faqs` |
| **(chưa có)** | `/api/orders` ← **lỗ hổng đang mở** |
| **(chưa có)** | `/api/notifications` |

Kèm câu cảnh báo: sửa DTO bên backend thì service bên frontend gãy **im lặng** —
không có test nào bắt được, phải tự đối chiếu bảng này.

**Phần "Dữ liệu"** — liệt kê 13 model Prisma: `Product`, `ProductVariant`, `User`,
`Order`, `OrderItem`, `Cart`, `CartItem`, `Review`, `ReviewReaction`, `ReviewReply`,
`FAQ`, `EmailTemplate`, `EmailLog`.

- [ ] **Step 2: Kiểm chứng bảng route khớp code thật**

```bash
grep -c "@Public()" src/cart/cart.controller.ts
grep -n "@Controller(" src/*/[a-z]*.controller.ts
```

Expected: cart có `5` chỗ `@Public()`; 8 controller có prefix đúng như bảng

- [ ] **Step 3: Kiểm chứng danh sách model Prisma**

```bash
grep -c "^model " prisma/schema.prisma
```

Expected: `13`

- [ ] **Step 4: Commit**

```bash
git add docs/ARCHITECTURE.md
git commit -m "docs: them ARCHITECTURE.md voi ban do module va seam FE-BE"
```

---

### Task 4: `docs/LEARNING-PATH.md` — lộ trình học lại

**Files:**
- Create: `docs/LEARNING-PATH.md`

**Interfaces:**
- Consumes: `docs/ALGORITHMS.md` (Task 1), `docs/ARCHITECTURE.md` (Task 3)

- [ ] **Step 1: Viết `docs/LEARNING-PATH.md`**

Sáu chặng, **theo thứ tự**, mỗi chặng đúng bốn cột: *đọc file nào · hiểu điều gì ·
ôn khái niệm nào · tự kiểm tra thế nào*. Không chặng nào được thiếu cột "tự kiểm tra".

```markdown
# Lộ trình học lại

Đi theo thứ tự. Mỗi chặng ~30–45 phút. Đừng nhảy cóc — chặng sau dựa vào chặng trước.

## Chặng 1 — Đường đi của một request
- **Đọc:** `src/main.ts` → `src/app.module.ts`
- **Hiểu:** request vào `/api/...` đi qua helmet → ValidationPipe → guard toàn cục
  → controller → service → Prisma, rồi ra qua `TransformInterceptor`
- **Ôn:** middleware vs guard vs interceptor vs pipe (thứ tự chạy)
- **Tự kiểm tra:** trả lời được "vì sao gọi `GET /api/products` không cần token
  mà `GET /api/users` thì cần?"

## Chặng 2 — Một module trọn vẹn, chọn cái nhỏ nhất
- **Đọc:** `src/faq/` (module · controller · service · dto)
- **Hiểu:** vì sao tách 4 loại file; DTO dùng để làm gì
- **Ôn:** dependency injection, DTO + class-validator
- **Tự kiểm tra:** tự vẽ lại sơ đồ 4 file của `faq` mà không mở code

## Chặng 3 — Xác thực
- **Đọc:** `src/auth/auth.service.ts` → `strategies/jwt.strategy.ts` → `guards/`
- **Hiểu:** đăng ký lưu hash chứ không lưu mật khẩu; token mang gì; `@Public()` hoạt động ra sao
- **Ôn:** `ALGORITHMS.md` mục 4 (bcrypt) — vì sao dùng salt, vì sao chậm là tốt
- **Tự kiểm tra:** giải thích được vì sao không thể lấy lại mật khẩu gốc từ DB

## Chặng 4 — Dữ liệu và truy vấn
- **Đọc:** `prisma/schema.prisma` → `src/product/product.service.ts`
- **Hiểu:** quan hệ giữa 13 model; `include` vs `select`; đếm và phân trang
- **Ôn:** `ALGORITHMS.md` mục 1 (pagination), mục 5 (search), mục 12 (filtering)
- **Tự kiểm tra:** chỉ ra chỗ nào trong `product.service.ts` có nguy cơ N+1 query

## Chặng 5 — Giao dịch và tồn kho
- **Đọc:** `src/order/order.service.ts` → `src/cart/cart.service.ts`
- **Hiểu:** vì sao đặt hàng phải nằm trong transaction; trừ kho thế nào cho an toàn
- **Ôn:** `ALGORITHMS.md` mục 6 (transaction), mục 7 (atomic), mục 10 (stock)
- **Tự kiểm tra:** mô tả điều gì xảy ra nếu hai người mua sản phẩm cuối cùng cùng lúc

## Chặng 6 — Nối sang frontend
- **Đọc:** `F:\elegant-shop\services\api.ts` → `services\cart.service.ts`
- **Hiểu:** frontend gọi backend ở đâu, token gắn vào request thế nào
- **Ôn:** bảng seam trong `ARCHITECTURE.md`
- **Tự kiểm tra:** liệt kê được những gì sẽ gãy nếu đổi tên một field trong `CartItem`
```

- [ ] **Step 2: Kiểm chứng mọi file được nhắc đều tồn tại**

```bash
for f in src/main.ts src/app.module.ts src/faq src/auth/auth.service.ts \
  src/auth/strategies/jwt.strategy.ts prisma/schema.prisma \
  src/product/product.service.ts src/order/order.service.ts src/cart/cart.service.ts; do
  test -e "$f" && echo "OK $f" || echo "THIEU $f"
done
test -e /f/elegant-shop/services/api.ts && echo "OK FE api.ts" || echo "THIEU FE api.ts"
```

Expected: toàn bộ in `OK`, không dòng nào `THIEU`

- [ ] **Step 3: Kiểm chứng đủ 6 chặng và không chặng nào thiếu "Tự kiểm tra"**

```bash
test "$(grep -c '^## Chặng ' docs/LEARNING-PATH.md)" = "6" && echo "OK 6 chang"
test "$(grep -c '\*\*Tự kiểm tra:\*\*' docs/LEARNING-PATH.md)" = "6" && echo "OK 6 muc tu kiem tra"
```

Expected: in cả `OK 6 chang` và `OK 6 muc tu kiem tra`

- [ ] **Step 4: Commit**

```bash
git add docs/LEARNING-PATH.md
git commit -m "docs: them LEARNING-PATH.md lo trinh hoc lai 6 chang"
```

---

### Task 5: `docs/ROADMAP.md` — việc còn lại

**Files:**
- Create: `docs/ROADMAP.md`

- [ ] **Step 1: Viết `docs/ROADMAP.md`**

Thay `FEATURE_ROADMAP.md` cũ (danh sách ước mơ chung chung). Chỉ liệt kê việc
**bám thực tế code hiện tại**, mỗi việc ghi rõ *chạm file nào* và *xong thì kiểm thế nào*.

```markdown
# Việc còn lại

Xếp theo thứ tự nên làm. Mỗi mục ghi rõ chạm đâu và nghiệm thu thế nào.

## 1. Frontend: `order.service.ts` — LỖ HỔNG ĐANG MỞ
Backend đã mở `POST /api/orders/checkout` (cho phép cả khách vãng lai) nhưng
frontend chưa có service gọi tới. `app/orders` đang tồn tại mà không có tầng service.
- **Chạm:** tạo `F:\elegant-shop\services\order.service.ts`; mẫu tham chiếu: `services/cart.service.ts`
- **Xong khi:** đặt được một đơn từ giao diện và thấy đơn đó qua `GET /api/orders/track/:orderNumber`

## 2. Frontend: trang `/cart` và `/checkout`
`app/(shop)` mới chỉ có `product/[id]`. Chưa có trang giỏ hàng lẫn thanh toán,
dù `services/cart.service.ts` đã đủ 6 hàm.
- **Chạm:** `app/(shop)/cart/page.tsx`, `app/(shop)/checkout/page.tsx`
- **Xong khi:** thêm hàng → xem giỏ → đặt hàng chạy trọn vẹn trên giao diện

## 3. Backend: quên mật khẩu
Chưa có luồng khôi phục mật khẩu. `NotificationModule` đã sẵn sàng để gửi mail.
- **Chạm:** `src/auth/auth.service.ts`, `prisma/schema.prisma` (thêm bảng lưu token)
- **Ôn trước:** `ALGORITHMS.md` mục 4 (bcrypt) — token phải hash trước khi lưu
- **Xong khi:** `npm run test:unit` xanh với ca kiểm thử token hết hạn

## 4. Kiểm thử checkout đầu-cuối
`test/e2e/cart.e2e-spec.ts` đang có nhưng chưa commit.
- **Chạm:** `test/e2e/cart.e2e-spec.ts`, `test/e2e/order.e2e-spec.ts`
- **Xong khi:** `npm run test:e2e` xanh (nhớ `--maxWorkers=1`, đã cấu hình sẵn)
```

- [ ] **Step 2: Kiểm chứng các khẳng định về lỗ hổng là đúng**

```bash
test ! -e /f/elegant-shop/services/order.service.ts && echo "OK: dung la thieu order.service.ts"
test ! -e "/f/elegant-shop/app/(shop)/cart" && echo "OK: dung la thieu trang /cart"
grep -n "@Post('checkout')" src/order/order.controller.ts
grep -rn "forgotPassword" src/auth/ || echo "OK: dung la chua co forgot-password"
```

Expected: ba dòng `OK`, và `77:  @Post('checkout')`

- [ ] **Step 3: Commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs: thay FEATURE_ROADMAP bang ROADMAP.md bam thuc te"
```

---

### Task 6: `CLAUDE.md` cho backend

**Files:**
- Create: `CLAUDE.md`

**Interfaces:**
- Consumes: toàn bộ `docs/` từ Task 1–5
- Produces: file tự nạp mỗi phiên — không cần gõ lệnh gì

- [ ] **Step 1: Viết `CLAUDE.md`**

Ngắn gọn, trỏ đi chứ không nhồi nội dung (nội dung đã nằm trong `docs/`):

```markdown
# elegant-shop-backend

Backend e-commerce: NestJS 11 · Prisma · PostgreSQL. Cổng 8080, prefix `/api`,
Swagger `/api/docs`.

## Repo anh em
Frontend Next.js tại `F:\elegant-shop` (`github.com/thphan1408/elegant-shop`),
gọi API qua `NEXT_PUBLIC_API_URL`, mặc định `http://localhost:8080/api`.
Bảng ánh xạ service ↔ route: `docs/ARCHITECTURE.md`.
**Sửa DTO ở đây thì frontend gãy im lặng — không test nào bắt được.**

## Bẫy
- `JwtAuthGuard` là `APP_GUARD` toàn cục ⇒ mọi route đòi token, muốn mở phải `@Public()`
- `ThrottlerGuard` toàn cục: 100 req / 60s ⇒ chạy test nhanh quá sẽ dính 429
- e2e phải chạy tuần tự (`--maxWorkers=1`, đã cấu hình trong script)
- Windows: đường dẫn CRLF, prettier đã được chỉnh để chấp nhận

## Quy ước một module
`src/<tên>/` gồm `<tên>.module.ts` · `<tên>.controller.ts` · `<tên>.service.ts` · `dto/`.
Controller chỉ nhận/trả, logic nằm ở service, truy vấn qua `PrismaService`.
Test: `test/unit/<tên>/` và `test/e2e/<tên>.e2e-spec.ts`.

## Lệnh
| Việc | Lệnh |
|---|---|
| Chạy dev | `npm run dev` |
| Test unit | `npm run test:unit` |
| Test e2e | `npm run test:e2e` |
| Sinh Prisma client | `npm run prisma:generate` |
| Tạo migration | `npm run migrate:dev` |

## Tài liệu
Đọc `docs/START-HERE.md` trước. Rồi `ARCHITECTURE.md` · `LEARNING-PATH.md` ·
`ROADMAP.md` · `ALGORITHMS.md`.

## Cách làm việc với chủ dự án
Chủ dự án quay lại sau kỳ nghỉ dài và đang học lại. Mặc định dùng skill
`mentor-mode`: giảng và viết test đỏ, **để chủ dự án tự viết implementation**.
Giải thích bằng tiếng Việt, giữ nguyên thuật ngữ tiếng Anh.
```

- [ ] **Step 2: Kiểm chứng mọi lệnh trong bảng đều tồn tại**

```bash
node -e "const s=require('./package.json').scripts; ['dev','test:unit','test:e2e','prisma:generate','migrate:dev'].forEach(k=>{if(!s[k])throw new Error('THIEU '+k)}); console.log('OK ca 5 lenh deu co that')"
```

Expected: `OK ca 5 lenh deu co that`

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: them CLAUDE.md lam ban do tu nap moi phien"
```

---

### Task 7: Skill `mentor-mode`

**Files:**
- Create: `.claude/skills/mentor-mode/SKILL.md`

**Interfaces:**
- Produces: skill gọi bằng `/mentor-mode`; bản gốc để Task 10 nhân bản sang frontend

- [ ] **Step 1: Viết `.claude/skills/mentor-mode/SKILL.md`**

Frontmatter bắt buộc đúng định dạng skill (`name` + `description`):

```markdown
---
name: mentor-mode
description: Dùng khi bắt tay vào bất kỳ task dev nào của elegant-shop (thêm tính năng, sửa bug). Giảng và viết test đỏ, để chủ dự án tự viết implementation. Dùng cho cả backend lẫn frontend.
---

# Mentor mode

> Bản gốc: `elegant-shop-backend/.claude/skills/mentor-mode/SKILL.md`.
> Sửa ở đây rồi copy sang `elegant-shop/.claude/skills/`.

Chủ dự án đang học lại sau kỳ nghỉ dài. Mục tiêu của mọi task **không phải là code
chạy được** — mà là chủ dự án hiểu tại sao nó chạy được.

## Năm bước, không bỏ bước nào

### 1. Định vị
Task này chạm backend, frontend, hay cả hai? Nếu cả hai, nói rõ làm bên nào trước
và tại sao. Liệt kê file sẽ đụng tới, kèm đường dẫn thật.

### 2. Ôn nền
Khái niệm nào cần cho task này. Giảng ngắn, và **luôn neo vào một đoạn code có thật
trong repo** — trích ra, chỉ rõ `file:dòng`. Không giảng chay.
Nếu khái niệm đã có trong `docs/ALGORITHMS.md`, trỏ tới mục đó thay vì viết lại.

### 3. Chỉ pattern tham chiếu
Tìm chỗ trong repo đã làm việc tương tự. "Chỗ này giống cách `register()` hash mật
khẩu ở `src/auth/auth.service.ts`." Học bằng đối chiếu nhanh hơn học từ đầu.

### 4. Viết test đỏ
Viết test thất bại, **chạy nó, dán output đỏ ra**. Test phải mô tả đúng hành vi mong
muốn, không phải mô tả cách cài đặt.

### 5. Bàn giao
Dừng lại. Nói rõ file nào cần sửa và hàm nào cần viết. **Không viết implementation.**

## Van chống bí
Nếu chủ dự án kẹt **quá 2 lần ở cùng một chỗ**, mới được đưa code mẫu — rồi yêu cầu
giải thích lại bằng lời. Chưa đủ 2 lần mà đã đưa code là hỏng mục đích của skill.

## Ngôn ngữ
Tiếng Việt. Giữ nguyên thuật ngữ tiếng Anh (`dependency injection`, `transaction`,
`guard`, `race condition`) — tài liệu ngoài đời đều tiếng Anh.

## Tự kiểm trước khi trả lời
- [ ] Đã nói rõ task chạm repo nào chưa?
- [ ] Phần giảng có neo vào code thật kèm `file:dòng` không?
- [ ] Đã chạy test và cho thấy nó đỏ thật chưa?
- [ ] Có đang định viết implementation không? Nếu có — **dừng lại**.
```

- [ ] **Step 2: Kiểm chứng frontmatter hợp lệ**

```bash
head -4 .claude/skills/mentor-mode/SKILL.md
grep -c "^name: mentor-mode$" .claude/skills/mentor-mode/SKILL.md
```

Expected: frontmatter mở bằng `---`, có `name:` và `description:`; lệnh thứ hai in `1`

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/mentor-mode/
git commit -m "feat: them skill mentor-mode day-roi-ban-giao"
```

---

### Task 8: Skill `hieu-code`

**Files:**
- Create: `.claude/skills/hieu-code/SKILL.md`

**Interfaces:**
- Consumes: `docs/ARCHITECTURE.md` (Task 3), `docs/ALGORITHMS.md` (Task 1)

- [ ] **Step 1: Viết `.claude/skills/hieu-code/SKILL.md`**

```markdown
---
name: hieu-code
description: Dùng khi cần hiểu lại một phần code của elegant-shop — "giải thích module X", "luồng đặt hàng chạy sao", "sửa chỗ này có hỏng gì không". Lần theo luồng xuyên cả frontend lẫn backend.
---

# Hiểu code

> Bản gốc: `elegant-shop-backend/.claude/skills/hieu-code/SKILL.md`.
> Sửa ở đây rồi copy sang `elegant-shop/.claude/skills/`.

Sản phẩm trải trên hai repo. **Luôn kiểm tra cả hai phía**, kể cả khi câu hỏi nghe
như chỉ hỏi một bên.

- Backend: `F:\elegant-shop-backend` — NestJS, cổng 8080, prefix `/api`
- Frontend: `F:\elegant-shop` — Next.js, gọi qua `services/*.service.ts`

## Trả lời đúng bốn phần, luôn theo thứ tự này

### 1. Vào từ cửa nào
Route nào. Guard nào chặn. Có `@Public()` không.
Nhắc lại: `JwtAuthGuard` là guard toàn cục ⇒ không có `@Public()` nghĩa là **đòi token**.

### 2. Đi dọc luồng
Lần theo, mỗi chặng kèm `file:dòng` thật:

```
app/… (trang)  →  services/*.service.ts  →  HTTP  →
  *.controller.ts  →  guard  →  *.service.ts  →  PrismaService  →  DB
```

Chặng nào không tồn tại thì nói thẳng "chưa có", đừng bịa.

### 3. Bản đồ ảnh hưởng
- Ai đang import cái này (chạy grep thật, đừng đoán)
- Test nào đang phủ: `test/unit/<module>/`, `test/e2e/<module>.e2e-spec.ts`
- **Sửa thì gì gãy ở phía bên kia** — đối chiếu bảng seam trong `docs/ARCHITECTURE.md`

### 4. Ba điều đáng nhớ
Đúng ba gạch đầu dòng. Nếu có thuật toán liên quan, trỏ tới đúng mục trong
`docs/ALGORITHMS.md` thay vì giảng lại.

## Tự kiểm trước khi trả lời
- [ ] Đã kiểm tra **cả hai** repo chưa?
- [ ] Mọi `file:dòng` có thật không — đã mở ra xem chưa hay đang đoán?
- [ ] Phần 3 đã chạy grep thật chưa?
- [ ] Có đúng ba gạch đầu dòng ở phần 4 không?
```

- [ ] **Step 2: Kiểm chứng frontmatter**

```bash
grep -c "^name: hieu-code$" .claude/skills/hieu-code/SKILL.md
```

Expected: `1`

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/hieu-code/
git commit -m "feat: them skill hieu-code lan luong xuyen hai repo"
```

---

### Task 9: Nghiệm thu

**Files:**
- Không tạo file. Chỉ chạy kiểm chứng.

- [ ] **Step 1: Kiểm tra bài toán 2027 — clone ra thư mục trống có đủ tài liệu không**

```bash
DEST="$(dirname "$(pwd)")/_clone-test-2027"
rm -rf "$DEST" && git clone -q "$(pwd)" "$DEST"
ls "$DEST/docs/" "$DEST/.claude/skills/" "$DEST/CLAUDE.md"
```

Expected: thấy đủ 5 file trong `docs/`, 2 thư mục skill, và `CLAUDE.md`.
**Đây là bài kiểm tra trực tiếp cho mục tiêu comeback — nếu thiếu là hỏng.**

- [ ] **Step 2: Dọn thư mục test**

```bash
rm -rf "$(dirname "$(pwd)")/_clone-test-2027"
```

- [ ] **Step 3: Kiểm tra mọi đường dẫn nhắc trong docs đều có thật**

```bash
grep -ohE 'src/[a-z/.-]+\.ts' docs/*.md CLAUDE.md | sort -u | while read f; do
  test -e "$f" || echo "DUONG DAN SAI: $f"
done; echo "--- xong ---"
```

Expected: chỉ in `--- xong ---`, không dòng `DUONG DAN SAI` nào

- [ ] **Step 4: Chạy thử skill `hieu-code` trên giỏ hàng**

Gõ `/hieu-code cart`. Đối chiếu output với bốn tiêu chí:

1. Có đủ bốn phần theo đúng thứ tự
2. Phần 2 lần được từ `F:\elegant-shop\services\cart.service.ts` sang
   `src/cart/cart.controller.ts` sang `src/cart/cart.service.ts`
3. Phần 3 chỉ ra `test/unit/cart/cart.service.spec.ts` và
   `test/e2e/cart.e2e-spec.ts`, đồng thời nêu rõ frontend **chưa có trang `/cart`**
4. Mọi `file:dòng` mở ra đều đúng

Trượt bất kỳ tiêu chí nào ⇒ sửa `SKILL.md` cho chặt hơn rồi thử lại.

- [ ] **Step 5: Chạy thử skill `mentor-mode` — bài kiểm tra quan trọng nhất**

Gõ `/mentor-mode làm chức năng quên mật khẩu`. Yêu cầu:

- Phải đi đủ năm bước
- Phải **dừng lại sau khi viết test đỏ**
- **Nếu tự viết luôn hàm `forgotPassword()` ⇒ SKILL FAIL.** Viết lại lời văn bước 5
  mạnh tay hơn rồi thử lại.

- [ ] **Step 6: Commit kết quả nghiệm thu nếu có sửa**

```bash
git add -A && git commit -m "fix: siet loi van skill sau nghiem thu" || echo "khong can sua"
```

---

### Task 10: Nhân bản sang repo frontend

**Files:**
- Create: `F:\elegant-shop\CLAUDE.md`
- Create: `F:\elegant-shop\.claude\skills\mentor-mode\SKILL.md` (bản sao Task 7)
- Create: `F:\elegant-shop\.claude\skills\hieu-code\SKILL.md` (bản sao Task 8)
- Modify: `F:\elegant-shop\.gitignore:47`

**Interfaces:**
- Consumes: hai file skill từ Task 7 và Task 8, **sao nguyên văn, không sửa**

**Điều kiện tiên quyết:** repo frontend hiện đang **chỉ-đọc** từ session backend
(`.claude/settings.local.json` chỉ cấp `Read(//f/elegant-shop/**)`). Task này cần
quyền ghi — sẽ có hộp thoại xin phép, cứ duyệt.

- [ ] **Step 1: Sao nguyên văn hai skill sang frontend**

```bash
mkdir -p "/f/elegant-shop/.claude/skills/mentor-mode" "/f/elegant-shop/.claude/skills/hieu-code"
cp .claude/skills/mentor-mode/SKILL.md "/f/elegant-shop/.claude/skills/mentor-mode/SKILL.md"
cp .claude/skills/hieu-code/SKILL.md "/f/elegant-shop/.claude/skills/hieu-code/SKILL.md"
diff .claude/skills/hieu-code/SKILL.md "/f/elegant-shop/.claude/skills/hieu-code/SKILL.md" && echo "OK giong het"
```

Expected: `OK giong het`

- [ ] **Step 2: Bỏ `/docs` khỏi `.gitignore` của frontend**

Sửa `F:\elegant-shop\.gitignore` dòng 47, thay `/docs` bằng `/docs/scratch/`.

```bash
grep -n "docs" /f/elegant-shop/.gitignore
```

Expected: chỉ còn `/docs/scratch/`

- [ ] **Step 3: Viết `F:\elegant-shop\CLAUDE.md`**

```markdown
# elegant-shop (frontend)

Storefront Next.js (App Router) cho elegant-shop. Chạy `npm run dev` → localhost:3000.
Gọi API qua `NEXT_PUBLIC_API_URL`, mặc định `http://localhost:8080/api` (`services/api.ts:12`).

## Repo anh em
Backend NestJS tại `F:\elegant-shop-backend` (`github.com/thphan1408/elegant-shop-backend`).
**Backend phải chạy trước, nếu không mọi lời gọi API đều hỏng.**
Bảng ánh xạ service ↔ route: `F:\elegant-shop-backend\docs\ARCHITECTURE.md`.

## Cấu trúc
| Thư mục | Việc |
|---|---|
| `app/` | route (App Router). Nhóm `(auth)`, `(shop)` |
| `services/` | mọi lời gọi API, mỗi file một module backend |
| `store/` | Zustand — hiện chỉ giữ state giao diện, dữ liệu giỏ hàng nằm ở server |
| `components/` · `lib/` · `types/` | dùng chung |

## Đang thiếu
- `services/order.service.ts` — backend đã mở `POST /api/orders/checkout` nhưng chưa ai gọi
- Trang `/cart` và `/checkout` trong `app/(shop)/`

## Cách làm việc với chủ dự án
Chủ dự án quay lại sau kỳ nghỉ dài và đang học lại. Mặc định dùng skill `mentor-mode`:
giảng và viết test đỏ, **để chủ dự án tự viết implementation**. Tiếng Việt, giữ nguyên
thuật ngữ tiếng Anh.
```

- [ ] **Step 4: Kiểm chứng các khẳng định trong `CLAUDE.md` frontend**

```bash
grep -n "baseURL" /f/elegant-shop/services/api.ts
test ! -e /f/elegant-shop/services/order.service.ts && echo "OK: dung la con thieu order.service.ts"
```

Expected: dòng 12 có `localhost:8080/api`, và dòng `OK: dung la con thieu...`

- [ ] **Step 5: Commit ở repo frontend**

```bash
cd /f/elegant-shop
git add CLAUDE.md .gitignore .claude/skills/
git commit -m "docs: them CLAUDE.md va 2 skill mentor cho frontend"
```

---

---

### Task 11: Dọn tài liệu cũ trong checkout chính (chạy SAU khi merge)

**Files:**
- Delete: 14 file cũ trong `F:\elegant-shop-backend\docs\`

**Bối cảnh:** Task 1–9 chạy trong worktree, nơi `docs/` cũ không tồn tại (vì đang bị
gitignore nên không được theo dõi). 14 file cũ vẫn nằm trên đĩa ở checkout chính. Khi
`/docs` hết bị ignore, chúng sẽ hiện ra trong `git status` lổn nhổn. Task này dọn chúng.

**Chỉ chạy sau khi đã merge nhánh này vào `master`.**

- [ ] **Step 1: Xác nhận backup còn nguyên trước khi xoá**

```bash
cd /f/elegant-shop-backend
git ls-tree -r refs/backup/docs-2026-07-29 --name-only | wc -l
```

Expected: `16`. Nếu không phải 16 thì **dừng lại**, đừng xoá gì cả.

- [ ] **Step 2: Xoá 14 file cũ đã bị thay thế**

```bash
cd /f/elegant-shop-backend/docs
rm -f COVERAGE_REPORT_EXPLANATION.md E2E_TEST_FIXES.md FAQ_MODULE_DESIGN.md \
      FEATURES_SUMMARY.md FEATURE_ROADMAP.md PROJECT_SUMMARY.md \
      REVIEW_FUNCTIONS_SUMMARY.md REVIEW_MODULE_ANALYSIS.md \
      REVIEW_REACTIONS_REPLIES_DESIGN.md REVIEW_REACTIONS_REPLIES_IMPLEMENTATION.md \
      SCHEMA_ANALYSIS_USER_REVIEW.md SECURITY_TESTS_SUMMARY.md SECURITY_TEST_RESULTS.md
ls
```

Expected: chỉ còn `ALGORITHMS.md`, `ARCHITECTURE.md`, `LEARNING-PATH.md`,
`ROADMAP.md`, `START-HERE.md`, `superpowers/`

Giữ lại `docs/superpowers/` — đó là spec và plan của chính công việc này.

- [ ] **Step 3: Xác nhận git sạch**

```bash
cd /f/elegant-shop-backend && git status --porcelain docs/
```

Expected: không dòng nào (mọi thứ trong `docs/` đã được commit hoặc đã xoá)

- [ ] **Step 4: Làm tương tự cho frontend nếu muốn**

Ba file `docs/` của frontend (`PERFORMANCE_OPTIMIZATION_GUIDE.md`, `PROJECT_SUMMARY.md`,
`ZUSTAND_CART_GUIDE.md`) chưa bị thay thế bởi tài liệu mới nào — **giữ nguyên**, chỉ cần
commit chúng sau khi Task 10 bỏ `/docs` khỏi `.gitignore`.

```bash
cd /f/elegant-shop && git add docs/ && git commit -m "docs: dua docs/ frontend vao git"
```

---

## Ghi chú vận hành

- Tài liệu cũ đã sao lưu tại `refs/backup/docs-2026-07-29` ở **cả hai** repo.
  Xem lại: `git show refs/backup/docs-2026-07-29:docs/PROJECT_SUMMARY.md`
  Xoá hẳn khi chắc chắn: `git update-ref -d refs/backup/docs-2026-07-29`
- Bốn worktree Cursor cũ đã xoá; phần chưa commit giữ tại `refs/backup/cursor-{lzj,ncy,qbj,sau}`
- Task 1–9 chạy trong repo backend. Chỉ Task 10 đụng repo frontend và cần quyền ghi.
