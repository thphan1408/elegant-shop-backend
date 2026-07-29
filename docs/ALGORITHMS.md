# 🔬 Thuật toán và Cấu trúc Dữ liệu (Algorithms & Data Structures)

Tài liệu này mô tả các thuật toán và cấu trúc dữ liệu được sử dụng trong dự án Elegant Shop Backend, bao gồm độ phức tạp thời gian (Time Complexity) và không gian (Space Complexity).

## 📋 Mục lục

1. [Pagination Algorithm](#1-pagination-algorithm)
2. [Rating Calculation Algorithm](#2-rating-calculation-algorithm)
3. [Slug Generation Algorithm](#3-slug-generation-algorithm)
4. [Password Hashing Algorithm (bcrypt)](#4-password-hashing-algorithm-bcrypt)
5. [Search Algorithm](#5-search-algorithm)
6. [Transaction Management](#6-transaction-management)
7. [Atomic Operations](#7-atomic-operations)
8. [Upsert Algorithm](#8-upsert-algorithm)
9. [Order Number Generation](#9-order-number-generation)
10. [Stock Management Algorithm](#10-stock-management-algorithm)
11. [Nested Replies Structure](#11-nested-replies-structure)
12. [Filtering Algorithm](#12-filtering-algorithm)

---

## 1. Pagination Algorithm

### Mô tả
Thuật toán phân trang được sử dụng để chia nhỏ kết quả truy vấn thành các trang nhỏ hơn, giúp tối ưu hiệu suất và trải nghiệm người dùng.

### Implementation
```typescript
// src/product/product.service.ts
const page = query.page || 1;
const limit = query.limit || 10;
const skip = (page - 1) * limit;

const [products, total] = await Promise.all([
  this.prismaService.product.findMany({
    where,
    skip,
    take: limit,
    orderBy: { updated_at: 'desc' },
  }),
  this.prismaService.product.count({ where }),
]);
```

### Độ phức tạp
- **Time Complexity**: 
  - Tính toán skip: `O(1)`
  - Database query: `O(n)` với n là tổng số records, nhưng được tối ưu bởi database indexes
  - Tổng thể: `O(n)` cho query, nhưng chỉ trả về `limit` records
- **Space Complexity**: `O(limit)` - chỉ lưu trữ số lượng records trong một trang

### Tại sao sử dụng?
- **Hiệu suất**: Giảm lượng dữ liệu truyền tải và xử lý
- **Trải nghiệm người dùng**: Tải trang nhanh hơn
- **Scalability**: Hỗ trợ tốt khi số lượng records tăng lên hàng triệu
- **Database Optimization**: Sử dụng `LIMIT` và `OFFSET` của SQL, được tối ưu bởi database engine

### Cải tiến có thể áp dụng
- **Cursor-based Pagination**: Thay vì `OFFSET`, sử dụng cursor (ID hoặc timestamp) để tránh vấn đề performance khi `OFFSET` lớn
- **Index Optimization**: Đảm bảo có indexes trên các trường được sử dụng trong `orderBy`

---

## 2. Rating Calculation Algorithm

### Mô tả
Thuật toán tính điểm đánh giá trung bình của sản phẩm dựa trên tất cả các reviews.

### Implementation
```typescript
// src/product/product.service.ts
const reviewCount = product.reviews.length;
const avgRating = reviewCount
  ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
  : 0;
product.stars_evaluation = Math.round(avgRating * 10) / 10; // Round to 1 decimal
```

### Độ phức tạp
- **Time Complexity**: `O(n)` với n là số lượng reviews của sản phẩm
- **Space Complexity**: `O(1)` - chỉ sử dụng biến tạm để lưu tổng và đếm

### Tại sao sử dụng?
- **Đơn giản và hiệu quả**: Thuật toán đơn giản, dễ hiểu và maintain
- **Chính xác**: Tính toán chính xác điểm trung bình
- **Làm tròn**: Làm tròn đến 1 chữ số thập phân để hiển thị đẹp hơn (4.5 thay vì 4.5234)

### Cải tiến có thể áp dụng
- **Caching**: Cache kết quả rating để tránh tính toán lại mỗi lần query
- **Incremental Update**: Thay vì tính lại từ đầu, cập nhật incrementally khi có review mới
  ```typescript
  // Pseudo-code
  newAvg = (oldAvg * oldCount + newRating) / (oldCount + 1)
  ```

---

## 3. Slug Generation Algorithm

### Mô tả
Thuật toán chuyển đổi tên sản phẩm thành URL-friendly slug (ví dụ: "Áo thun nam" → "ao-thun-nam").

### Implementation
```typescript
// src/product/product.service.ts
import slugify from 'slugify';

slug: slugify(createProductDto.name, { lower: true })
```

### Thuật toán (slugify library)
1. Chuyển đổi sang lowercase
2. Loại bỏ các ký tự đặc biệt
3. Thay thế khoảng trắng bằng dấu gạch ngang (-)
4. Loại bỏ các ký tự không phải alphanumeric và dấu gạch ngang

### Độ phức tạp
- **Time Complexity**: `O(n)` với n là độ dài của string
- **Space Complexity**: `O(n)` - tạo string mới

### Tại sao sử dụng?
- **SEO-friendly URLs**: URLs dễ đọc và thân thiện với search engines
- **URL Safety**: Loại bỏ các ký tự không an toàn trong URL
- **Consistency**: Đảm bảo format nhất quán cho tất cả slugs

### Cải tiến có thể áp dụng
- **Unicode Support**: Hỗ trợ tốt hơn cho các ngôn ngữ có ký tự đặc biệt (tiếng Việt, tiếng Trung, etc.)
- **Collision Detection**: Kiểm tra và xử lý trường hợp slug trùng lặp (thêm số hoặc hash)

---

## 4. Password Hashing Algorithm (bcrypt)

### Mô tả
Thuật toán hash mật khẩu sử dụng bcrypt với salt rounds để bảo mật.

### Implementation
```typescript
// src/auth/auth.service.ts
private readonly saltRounds = 10;

const hashedPassword = await bcrypt.hash(
  registerDto.password,
  this.saltRounds,
);

// Verify password
const isPasswordValid = await bcrypt.compare(
  loginDto.password,
  user.password,
);
```

### Thuật toán bcrypt
1. **Salt Generation**: Tạo random salt (10 rounds = 2^10 = 1024 iterations)
2. **Key Derivation**: Sử dụng Blowfish cipher để hash password với salt
3. **Multiple Rounds**: Lặp lại quá trình hash nhiều lần (2^rounds) để tăng độ bảo mật

### Độ phức tạp
- **Time Complexity**: `O(2^rounds)` = `O(2^10)` = `O(1024)` iterations
  - Hash: ~100ms per password
  - Compare: ~100ms per comparison
- **Space Complexity**: `O(1)` - hash result có độ dài cố định (60 characters)

### Tại sao sử dụng?
- **Security**: Bảo mật cao, chống lại rainbow table attacks
- **Adaptive**: Có thể tăng số rounds khi hardware mạnh hơn
- **Industry Standard**: Được sử dụng rộng rãi trong ngành

### Cải tiến có thể áp dụng
- **Argon2**: Thuật toán mới hơn, được khuyến nghị bởi OWASP (nhưng bcrypt vẫn an toàn)
- **Rate Limiting**: Giới hạn số lần thử đăng nhập để chống brute force attacks

---

## 5. Search Algorithm

### Mô tả
Thuật toán tìm kiếm full-text trong tên và mô tả sản phẩm.

### Implementation
```typescript
// src/product/product.service.ts
if (query.search) {
  where.OR = [
    { name: { contains: query.search } },
    { description: { contains: query.search } },
  ];
}
```

### Thuật toán
- **Database-level Search**: Sử dụng PostgreSQL `LIKE` hoặc `ILIKE` (case-insensitive)
- **OR Condition**: Tìm kiếm trong cả `name` và `description`

### Độ phức tạp
- **Time Complexity**: 
  - Linear search: `O(n * m)` với n là số products, m là độ dài search term
  - Với full-text index: `O(log n + m)` (nhanh hơn nhiều)
- **Space Complexity**: `O(k)` với k là số kết quả trả về

### Tại sao sử dụng?
- **Simplicity**: Dễ implement và maintain
- **Flexibility**: Hỗ trợ tìm kiếm partial matches

### Cải tiến có thể áp dụng
- **Full-Text Search**: Sử dụng PostgreSQL Full-Text Search (FTS) với `tsvector` và `tsquery`
  ```sql
  -- Example
  CREATE INDEX product_search_idx ON "Product" 
  USING gin(to_tsvector('english', name || ' ' || description));
  ```
- **Elasticsearch**: Sử dụng Elasticsearch cho tìm kiếm phức tạp hơn (fuzzy search, autocomplete, etc.)
- **Search Ranking**: Sắp xếp kết quả theo relevance score

---

## 6. Transaction Management

### Mô tả
Sử dụng database transactions để đảm bảo tính nhất quán dữ liệu (ACID properties).

### Implementation
```typescript
// src/product/product.service.ts
return this.prismaService.$transaction(async (tx) => {
  const product = await tx.product.create({
    data: { ...createProductDto, slug: slugify(...) },
  });
  // Multiple operations...
  return product;
});
```

### Thuật toán
- **ACID Properties**:
  - **Atomicity**: Tất cả operations thành công hoặc rollback
  - **Consistency**: Dữ liệu luôn ở trạng thái hợp lệ
  - **Isolation**: Transactions không ảnh hưởng lẫn nhau
  - **Durability**: Dữ liệu được lưu vĩnh viễn sau khi commit

### Độ phức tạp
- **Time Complexity**: `O(k)` với k là số operations trong transaction
- **Space Complexity**: `O(1)` - transaction state được quản lý bởi database

### Tại sao sử dụng?
- **Data Integrity**: Đảm bảo dữ liệu không bị inconsistent
- **Error Handling**: Tự động rollback khi có lỗi
- **Concurrency Control**: Xử lý concurrent requests an toàn

### Ví dụ sử dụng
- **Order Creation**: Tạo order và giảm stock trong cùng transaction
- **Review Creation**: Tạo review và cập nhật product rating trong cùng transaction

---

## 7. Atomic Operations

### Mô tả
Sử dụng atomic operations để tránh race conditions khi cập nhật dữ liệu.

### Implementation
```typescript
// src/product/product.service.ts
// Atomic increment views_count
await this.prismaService.product.update({
  where: { id },
  data: { views_count: { increment: 1 } },
});
```

### Thuật toán
- **Database Atomic Operations**: Sử dụng SQL `UPDATE SET column = column + 1` thay vì `read-modify-write`

### Độ phức tạp
- **Time Complexity**: `O(1)` - single database operation
- **Space Complexity**: `O(1)`

### Tại sao sử dụng?
- **Race Condition Prevention**: Tránh lost updates khi có nhiều requests đồng thời
- **Performance**: Nhanh hơn read-modify-write pattern
- **Consistency**: Đảm bảo giá trị chính xác

### Ví dụ vấn đề nếu không dùng atomic:
```typescript
// ❌ BAD: Race condition
const product = await prisma.product.findUnique({ where: { id } });
product.views_count += 1;
await prisma.product.update({ where: { id }, data: { views_count: product.views_count } });
// Nếu 2 requests cùng lúc, có thể mất 1 increment

// ✅ GOOD: Atomic operation
await prisma.product.update({
  where: { id },
  data: { views_count: { increment: 1 } },
});
```

---

## 8. Upsert Algorithm

### Mô tả
Thuật toán "update or insert" - cập nhật nếu đã tồn tại, tạo mới nếu chưa có.

### Implementation
```typescript
// src/review/review.service.ts
const existingReview = await tx.review.findUnique({
  where: {
    productId_userId: {
      productId: createReviewDto.productId,
      userId: createReviewDto.userId,
    },
  },
});

if (existingReview) {
  // Update existing review
  review = await tx.review.update({ ... });
} else {
  // Create new review
  review = await tx.review.create({ ... });
}
```

### Độ phức tạp
- **Time Complexity**: 
  - Find: `O(1)` với unique index
  - Update/Create: `O(1)` với index
  - Tổng: `O(1)`
- **Space Complexity**: `O(1)`

### Tại sao sử dụng?
- **Business Logic**: Mỗi user chỉ có 1 review cho mỗi product (có thể update)
- **Data Integrity**: Tránh duplicate reviews
- **User Experience**: User có thể cập nhật review của mình

### Cải tiến có thể áp dụng
- **Prisma upsert**: Sử dụng `upsert` method của Prisma (nếu có)
  ```typescript
  await tx.review.upsert({
    where: { productId_userId: { ... } },
    update: { rating, comment },
    create: { productId, userId, rating, comment },
  });
  ```

---

## 9. Order Number Generation

### Mô tả
Thuật toán tạo order number duy nhất cho mỗi đơn hàng.

### Implementation
```typescript
// src/order/order.service.ts
private generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${dateStr}-${random}`;
}
```

### Thuật toán
1. Lấy ngày hiện tại (YYYY-MM-DD)
2. Loại bỏ dấu gạch ngang → YYYYMMDD
3. Tạo số ngẫu nhiên 3 chữ số (000-999)
4. Kết hợp: `ORD-YYYYMMDD-XXX`

### Độ phức tạp
- **Time Complexity**: `O(1)`
- **Space Complexity**: `O(1)`

### Tại sao sử dụng?
- **Uniqueness**: Order number duy nhất (với collision probability rất thấp)
- **Readability**: Dễ đọc và nhớ (ORD-20240101-123)
- **Sortable**: Có thể sắp xếp theo thời gian

### Cải tiến có thể áp dụng
- **UUID**: Sử dụng UUID để đảm bảo uniqueness 100%
- **Sequential Number**: Sử dụng auto-increment với prefix (ORD-000001)
- **Collision Detection**: Kiểm tra và retry nếu trùng

---

## 10. Stock Management Algorithm

### Mô tả
Thuật toán quản lý tồn kho khi tạo đơn hàng, đảm bảo không bán quá số lượng có sẵn.

### Implementation
```typescript
// src/order/order.service.ts
// Check stock
if (variant.quantity < item.quantity) {
  throw new BadRequestException('Insufficient stock');
}

// Decrease stock (atomic operation)
await tx.productVariant.update({
  where: { id: variant.id },
  data: { quantity: { decrement: item.quantity } },
});
```

### Thuật toán
1. **Validation**: Kiểm tra stock có đủ không
2. **Atomic Decrement**: Giảm stock bằng atomic operation (trong transaction)
3. **Transaction**: Tất cả trong transaction để đảm bảo consistency

### Độ phức tạp
- **Time Complexity**: `O(k)` với k là số items trong order
- **Space Complexity**: `O(1)`

### Tại sao sử dụng?
- **Prevent Overselling**: Tránh bán quá số lượng có sẵn
- **Atomic Operations**: Đảm bảo stock được cập nhật đúng
- **Transaction Safety**: Rollback nếu có lỗi

### Cải tiến có thể áp dụng
- **Reserved Stock**: Tạm giữ stock trong một khoảng thời gian (15 phút) trước khi thanh toán
- **Stock Alerts**: Cảnh báo khi stock thấp
- **Backorder Support**: Cho phép đặt hàng khi hết stock (backorder)

---

## 11. Nested Replies Structure

### Mô tả
Cấu trúc dữ liệu tree để lưu trữ nested replies (trả lời đánh giá có thể trả lời lại).

### Implementation
```typescript
// prisma/schema.prisma
model ReviewReply {
  id        String   @id @default(uuid())
  reviewId  String
  parentId  String?  // Self-referencing for nested replies
  userId    String?
  content   String
  // ...
  parent    ReviewReply? @relation("ReplyReplies", fields: [parentId], references: [id])
  replies   ReviewReply[] @relation("ReplyReplies")
}
```

### Cấu trúc dữ liệu
- **Tree Structure**: Mỗi reply có thể có nhiều child replies
- **Self-referencing**: `parentId` trỏ đến reply cha

### Độ phức tạp
- **Time Complexity**: 
  - Query: `O(n)` với n là số replies (cần recursive query hoặc multiple queries)
  - Insert: `O(1)`
- **Space Complexity**: `O(n)` với n là số replies

### Tại sao sử dụng?
- **Flexibility**: Hỗ trợ nested replies (reply to reply)
- **User Experience**: Cho phép discussion threads
- **Scalability**: Có thể mở rộng nhiều levels

### Cải tiến có thể áp dụng
- **Materialized Path**: Lưu path từ root đến node (ví dụ: "1/2/5") để query nhanh hơn
- **Nested Set Model**: Sử dụng left/right values để query tree nhanh hơn
- **Closure Table**: Bảng riêng lưu tất cả ancestor-descendant relationships

---

## 12. Filtering Algorithm

### Mô tả
Thuật toán lọc sản phẩm theo nhiều tiêu chí (category, brand, featured, etc.).

### Implementation
```typescript
// src/product/product.service.ts
const where: {
  category?: string;
  brand?: string;
  is_featured?: boolean;
  is_active: boolean;
  OR?: Array<{ name: { contains: string } } | { description: { contains: string } }>;
} = {
  is_active: true,
};

// Conditionally add filters
if (query.category !== undefined) {
  where.category = query.category;
}
if (query.brand !== undefined) {
  where.brand = query.brand;
}
// ...
```

### Thuật toán
- **Conditional Filtering**: Chỉ thêm filter vào query nếu giá trị được cung cấp
- **Database Indexing**: Sử dụng indexes trên các trường filter để tối ưu

### Độ phức tạp
- **Time Complexity**: 
  - Build where clause: `O(1)`
  - Database query: `O(n)` nhưng được tối ưu bởi indexes → `O(log n)` hoặc `O(1)` với index
- **Space Complexity**: `O(1)`

### Tại sao sử dụng?
- **Flexibility**: Hỗ trợ filter theo nhiều tiêu chí
- **Performance**: Sử dụng database indexes
- **Clean Code**: Code dễ đọc và maintain

### Cải tiến có thể áp dụng
- **Query Builder Pattern**: Sử dụng query builder để dynamic filtering
- **Filter Caching**: Cache kết quả filter phổ biến
- **Composite Indexes**: Tạo composite indexes cho các filter thường dùng cùng nhau

---

## 📊 Tổng kết Độ phức tạp

| Thuật toán | Time Complexity | Space Complexity | Tối ưu hóa |
|------------|----------------|------------------|-----------|
| Pagination | O(n) → O(limit) | O(limit) | ✅ Indexes |
| Rating Calculation | O(n) | O(1) | ⚠️ Có thể cache |
| Slug Generation | O(n) | O(n) | ✅ |
| Password Hashing | O(2^10) | O(1) | ✅ |
| Search | O(n*m) → O(log n) | O(k) | ⚠️ Cần FTS |
| Transaction | O(k) | O(1) | ✅ |
| Atomic Operations | O(1) | O(1) | ✅ |
| Upsert | O(1) | O(1) | ✅ |
| Order Number | O(1) | O(1) | ✅ |
| Stock Management | O(k) | O(1) | ✅ |
| Nested Replies | O(n) | O(n) | ⚠️ Có thể tối ưu |
| Filtering | O(log n) | O(1) | ✅ Indexes |

---

## 🚀 Các Thuật toán có thể Áp dụng thêm

### 1. **Caching Algorithms**
- **LRU Cache**: Cache các sản phẩm được xem nhiều nhất
- **Time Complexity**: O(1) cho get/set
- **Use Case**: Cache product details, FAQs

### 2. **Sorting Algorithms**
- **Quick Sort / Merge Sort**: Sắp xếp sản phẩm theo nhiều tiêu chí
- **Time Complexity**: O(n log n)
- **Use Case**: Sort products by price, rating, date

### 3. **Graph Algorithms**
- **BFS/DFS**: Tìm sản phẩm liên quan (related products)
- **Time Complexity**: O(V + E)
- **Use Case**: Recommendation system

### 4. **String Matching Algorithms**
- **KMP / Boyer-Moore**: Tìm kiếm nâng cao trong product names
- **Time Complexity**: O(n + m)
- **Use Case**: Advanced search với pattern matching

### 5. **Hash Tables / Maps**
- **HashMap**: Lưu trữ session data, cache
- **Time Complexity**: O(1) average case
- **Use Case**: Session management, rate limiting

### 6. **Priority Queue / Heap**
- **Max Heap**: Tìm top N sản phẩm bán chạy nhất
- **Time Complexity**: O(n log k) với k là số items cần
- **Use Case**: Top products, trending items

---

## 📚 Tài liệu tham khảo

- [Big O Notation Cheat Sheet](https://www.bigocheatsheet.com/)
- [Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- [bcrypt Algorithm](https://en.wikipedia.org/wiki/Bcrypt)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)

---

**Lưu ý**: Các độ phức tạp được tính toán dựa trên implementation hiện tại. Với database indexes và optimizations, performance thực tế có thể tốt hơn.

