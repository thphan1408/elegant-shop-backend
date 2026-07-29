---
name: hieu-code
description: Dùng khi cần hiểu lại một phần code của elegant-shop — "giải thích module X", "luồng đặt hàng chạy thế nào", "sửa chỗ này có hỏng gì không". Lần theo luồng xuyên cả frontend lẫn backend.
---

# Hiểu code

> **Bản gốc:** `elegant-shop-backend/.claude/skills/hieu-code/SKILL.md`
> Sửa ở đây rồi copy sang `elegant-shop/.claude/skills/hieu-code/SKILL.md`.

Sản phẩm trải trên hai repo. **Luôn kiểm tra cả hai phía**, kể cả khi câu hỏi nghe như
chỉ hỏi một bên — vùng hay gãy nhất nằm đúng chỗ nối giữa chúng.

- Backend: `F:\elegant-shop-backend` — NestJS, cổng 8080, prefix `/api`
- Frontend: `F:\elegant-shop` — Next.js, gọi qua `services/*.service.ts`

## Trả lời đúng bốn phần, luôn theo thứ tự này

### 1. Vào từ cửa nào

Route nào. Guard nào chặn. Có `@Public()` không.

Nhắc lại: `JwtAuthGuard` là guard **toàn cục** ⇒ không có `@Public()` nghĩa là **đòi
token**. Đây là nguồn gốc phần lớn lỗi 401 khó hiểu.

### 2. Đi dọc luồng

Lần theo, mỗi chặng kèm `file:dòng` **thật**:

```
app/… (trang)  →  services/*.service.ts  →  HTTP  →
  *.controller.ts  →  guard  →  *.service.ts  →  PrismaService  →  DB
```

Chặng nào không tồn tại thì **nói thẳng "chưa có"**, đừng bịa cho đủ sơ đồ. Ví dụ hiện
tại: giỏ hàng có service bên frontend nhưng chưa có trang `/cart`.

### 3. Bản đồ ảnh hưởng

Phần này chữa nỗi sợ "sửa cái này hỏng cái kia":

- **Ai đang import cái này** — chạy grep thật, đừng đoán
- **Test nào đang phủ** — `test/unit/<module>/`, `test/e2e/<module>.e2e-spec.ts`
- **Sửa thì gì gãy ở phía bên kia** — đối chiếu bảng đường nối trong
  `docs/ARCHITECTURE.md`. Nhớ rằng lỗi xuyên repo **không test nào bắt được**, nên
  phần này phải nói rõ ràng chứ không được lướt.

### 4. Ba điều đáng nhớ

Đúng ba gạch đầu dòng, chọn thứ đáng nhớ nhất chứ không tóm tắt lại tất cả.

Nếu có thuật toán liên quan, trỏ tới đúng mục trong `docs/ALGORITHMS.md` thay vì giảng
lại từ đầu.

## Tự kiểm trước khi trả lời

- [ ] Đã kiểm tra **cả hai** repo chưa?
- [ ] Mọi `file:dòng` có thật không — đã mở ra xem, hay đang đoán?
- [ ] Phần 3 đã chạy grep thật chưa?
- [ ] Phần 4 có đúng ba gạch đầu dòng không?
