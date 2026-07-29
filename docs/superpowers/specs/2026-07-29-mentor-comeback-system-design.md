# Thiết kế: Hệ thống học lại & phát triển Elegant Shop sau kỳ nghỉ dài

- **Ngày:** 2026-07-29
- **Trạng thái:** Đã duyệt design, chờ triển khai
- **Bối cảnh:** Chủ dự án quay lại sau 7 tháng không đụng code, dự kiến còn một kỳ nghỉ dài nữa trước khi comeback vào 2027

---

## 1. Vấn đề

Chủ dự án quay lại sau 7 tháng và gặp đồng thời **bốn** điểm nghẽn (tự xác nhận, không phải suy đoán):

1. Đọc code không hiểu — không nhớ module làm gì, luồng chạy ra sao
2. Quên thuật toán / kiến thức nền — pagination, bcrypt, transaction, N+1
3. Không biết bắt đầu task mới từ đâu — quên quy ước đặt file, DTO, guard, test
4. Sợ sửa code làm hỏng chỗ khác — không nhớ chỗ nào phụ thuộc chỗ nào

Ràng buộc bao trùm: **phải sống sót tới 2027.** Mọi thứ có giá trị bắt buộc nằm trong git.

## 2. Phát hiện quyết định thiết kế

Ba sự thật tìm được khi khảo sát, mỗi cái đều bẻ lái thiết kế:

**2.1. Sản phẩm trải trên hai repo, gộp thành một workspace**

```
F:\elegant-shop-backend   NestJS + Prisma + PostgreSQL   (thư mục gốc, đọc-ghi)
F:\elegant-shop           Next.js                        (thêm vào, hiện chỉ-đọc)
```

Bằng chứng: `.claude/settings.local.json` của backend cấp quyền `Read(//f/elegant-shop/**)`.
Không có file `.code-workspace` — gộp bằng tính năng add-directory của Claude Code.

`services/*.service.ts` bên frontend ánh xạ gần 1:1 với module backend (`auth`, `cart`,
`faq`, `product`, `review`). **Đường nối này là chỗ dễ vỡ nhất và khó nhớ nhất** — sửa DTO
bên backend thì frontend gãy im lặng, không test nào bắt được. Mọi thiết kế chỉ nhìn một
repo đều bỏ sót đúng vùng nguy hiểm nhất.

Lỗ hổng đang tồn tại: frontend có `app/orders` nhưng **chưa có `order.service.ts`**, trong
khi backend đã có `OrderModule` đầy đủ. Backend có `notification` mà frontend chưa dùng.

**2.2. `/docs` bị gitignore ở cả hai repo**

Backend `.gitignore:60`, frontend `.gitignore:47`. Toàn bộ ~1.500 dòng tài liệu **chưa bao
giờ được commit** — chỉ tồn tại trên một ổ đĩa. Clone repo về máy khác sẽ nhận được con số
không tài liệu. Đây là thứ đánh sập trực tiếp mục tiêu comeback 2027.

**2.3. Tài liệu cũ vừa trùng lặp vừa lỗi thời**

- `PROJECT_SUMMARY.md` và `FEATURES_SUMMARY.md` trùng nhau ~80%, cả hai liệt kê **7 module**
  trong khi dự án có **9** — thiếu hẳn `cart` và `notification`
- `FEATURE_ROADMAP.md` là danh sách chung chung "Priority 1–5 / Phase 1–8 tuần", không bám thực tế
- `E2E_TEST_FIXES.md`, `COVERAGE_REPORT_EXPLANATION.md`, `SCHEMA_ANALYSIS_*.md`, 4 file
  `REVIEW_*.md` là output rác của các phiên làm việc cũ
- `ALGORITHMS.md` (585 dòng, 12 thuật toán kèm độ phức tạp) là **thứ duy nhất còn nguyên giá trị**

Không file nào trả lời được câu hỏi "tôi nên bắt đầu từ đâu".

## 3. Nguyên tắc thiết kế

1. **Cái gì có giá trị thì phải nằm trong git** — thư mục home không sống tới 2027
2. **Móc kéo kiến thức ra đúng lúc, không xây kho kiến thức thứ hai** — `ALGORITHMS.md` giữ
   nguyên nội dung, chỉ được trỏ tới
3. **Kiến thức riêng repo nằm trong repo đó; quy trình dùng chung thì nhân bản, backend là bản gốc**
4. **Dạy chứ không code hộ** — vai trò đã chốt: phân tích, chỉ đường, viết test đỏ, rồi bàn giao

## 4. Kiến trúc

```
elegant-shop-backend/  (bản gốc)          elegant-shop/  (bản sao)
├── CLAUDE.md                             ├── CLAUDE.md
├── .claude/skills/                       ├── .claude/skills/
│   ├── mentor-mode/SKILL.md              │   ├── mentor-mode/SKILL.md
│   └── hieu-code/SKILL.md                │   └── hieu-code/SKILL.md
└── docs/                                 └── docs/
    ├── START-HERE.md                         └── (giữ 3 file hiện có)
    ├── ALGORITHMS.md      (giữ nguyên)
    ├── ARCHITECTURE.md
    ├── LEARNING-PATH.md
    └── ROADMAP.md
```

### 4.1. `CLAUDE.md` (mỗi repo một bản riêng, tự động nạp)

Đây là mảnh **không cần nhớ gõ gì** — nó giải quyết điểm nghẽn 3.

Nội dung: repo này là gì (3 câu) · bản đồ module/route · quy ước code · cách chạy cả hệ
thống · khối "repo anh em" (đường dẫn + remote + cách hai bên nối nhau) · bẫy đã biết.

Bẫy phải ghi đầu tiên: `JwtAuthGuard` đăng ký làm `APP_GUARD` toàn cục tại
`src/app.module.ts` ⇒ **mọi route mặc định cần token**, muốn mở public phải gắn `@Public()`.
Đây đúng loại chi tiết gây mất hai tiếng debug "sao gọi API nào cũng 401".

### 4.2. Skill `hieu-code` (giải quyết điểm nghẽn 1 và 4)

Kích hoạt khi: "giải thích module X", "luồng đặt hàng chạy sao", "sửa chỗ này có hỏng gì không".

Output **cố định 4 phần**, lần theo **xuyên hai repo**:

1. **Vào từ cửa nào** — route nào, guard nào chặn
2. **Đi dọc luồng** — `app/` → `store/` → `services/*.service.ts` → HTTP → controller →
   guard → service → Prisma → DB, chỉ rõ `file:dòng`
3. **Bản đồ ảnh hưởng** — ai đang import, test nào đang phủ, sửa thì gì gãy **ở cả hai phía**
4. **Ba điều đáng nhớ** — kèm link tới đúng mục trong `ALGORITHMS.md`

### 4.3. Skill `mentor-mode` (giải quyết điểm nghẽn 2 và 3)

Kích hoạt khi: bắt tay vào bất kỳ task dev nào.

Quy trình 5 bước bắt buộc:

1. **Định vị** — task chạm frontend, backend, hay cả hai; nếu cả hai thì làm bên nào trước
2. **Ôn nền** — khái niệm cần cho task này, **luôn neo vào một đoạn code có thật trong repo**
3. **Chỉ pattern tham chiếu** — "chỗ này đã làm tương tự ở `register()`"
4. **Viết test đỏ** — Claude viết test thất bại và chạy cho thấy nó đỏ thật
5. **Bàn giao** — chủ dự án viết code cho xanh. **Claude không viết implementation.**

Hai quy tắc phụ:

- **Ngôn ngữ:** giảng tiếng Việt, giữ nguyên thuật ngữ tiếng Anh (`dependency injection`,
  `transaction`) vì tài liệu ngoài đời đều tiếng Anh
- **Van chống bí:** kẹt **quá 2 lần ở cùng một chỗ** thì Claude mới đưa code mẫu, rồi yêu cầu
  giải thích lại bằng lời. Thiếu van này mentor-mode thành tra tấn; van lỏng quá thì thành code hộ

### 4.4. Bộ `docs/` mới (backend)

| File | Vai trò |
|---|---|
| `START-HERE.md` | Cửa vào duy nhất. Đọc 5 phút biết dự án là gì, đang ở đâu, làm gì tiếp |
| `ARCHITECTURE.md` | Bản đồ 9 module + đường nối sang frontend + sơ đồ dữ liệu |
| `LEARNING-PATH.md` | Lộ trình học lại có thứ tự, mỗi bước neo vào file thật + mục trong `ALGORITHMS.md` |
| `ROADMAP.md` | Việc còn lại, xếp theo thứ tự làm được ngay, thay `FEATURE_ROADMAP.md` cũ |
| `ALGORITHMS.md` | **Giữ nguyên 585 dòng**, chỉ thêm mục lục liên kết sang `LEARNING-PATH.md` |

Bỏ: `PROJECT_SUMMARY.md`, `FEATURES_SUMMARY.md`, `FEATURE_ROADMAP.md`, `E2E_TEST_FIXES.md`,
`COVERAGE_REPORT_EXPLANATION.md`, `SCHEMA_ANALYSIS_USER_REVIEW.md`, `FAQ_MODULE_DESIGN.md`,
4 file `REVIEW_*.md`, 2 file `SECURITY_*.md` (nội dung còn giá trị gộp vào `ARCHITECTURE.md`).

Tất cả đã sao lưu tại ref `refs/backup/docs-2026-07-29` của mỗi repo.

## 5. Chống lệch bản

Backend là **bản gốc** của hai skill. Mỗi file skill mở đầu bằng một dòng ghi rõ điều đó và
chỉ cách đồng bộ. Chỉ có 2 file nhân đôi nên đồng bộ thủ công là chấp nhận được; dựng cơ chế
tự động lúc này là thừa.

## 6. Nghiệm thu

Bài kiểm tra thật, không phải tự nhận:

1. Gọi `/hieu-code cart` — giỏ hàng là tính năng **duy nhất đã chạy đủ hai đầu**. Output phải
   có đủ 4 phần và `file:dòng` phải trỏ đúng chỗ có thật.
2. Vào `mentor-mode` với task `forgot-password` — Claude phải **dừng lại sau khi viết test đỏ**.
3. **Nếu Claude tự viết luôn `forgotPassword()` ⇒ skill FAIL**, phải viết lại lời văn mạnh tay hơn.
4. `git clone` repo về thư mục trống — `docs/` và `.claude/skills/` phải có mặt đầy đủ.
   Đây là bài kiểm tra trực tiếp cho mục tiêu 2027.

## 7. Cố ý KHÔNG làm (YAGNI)

- Không viết lại `ALGORITHMS.md` — đã tốt, chỉ trỏ tới
- Không tạo skill `refresh-concept` riêng — đã nằm trong bước 2 của `mentor-mode`
- Không dựng cơ chế đồng bộ skill tự động — 2 file, thủ công là đủ
- Không đặt gì ở `~/.claude/skills/` — không sống sót tới 2027

## 8. Rủi ro đã biết

| Rủi ro | Xử lý |
|---|---|
| Bỏ `/docs` khỏi `.gitignore` có thể trái ý đồ ban đầu | Đảo lại chỉ mất một dòng; đã nêu rõ với chủ dự án |
| Frontend đang chỉ-đọc từ session backend | Phần frontend tách thành bước riêng, cần duyệt quyền ghi |
| Tài liệu mới rồi cũng lỗi thời | `START-HERE.md` ghi ngày cập nhật; `LEARNING-PATH.md` neo vào file thật nên lệch là thấy ngay |
