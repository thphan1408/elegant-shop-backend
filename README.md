# 🛍️ Elegant Shop Backend API

Backend API cho hệ thống e-commerce được xây dựng với NestJS, Prisma ORM và PostgreSQL. Dự án cung cấp các tính năng quản lý sản phẩm (CRUD), hệ thống đánh giá, tìm kiếm và lọc sản phẩm với kiến trúc hiện đại và tối ưu hiệu suất.

## 📋 Mục lục

- [Tính năng nổi bật](#-tính-năng-nổi-bật)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Cài đặt](#-cài-đặt)
- [Cấu hình](#-cấu-hình)
- [Chạy dự án](#-chạy-dự-án)
- [API Documentation](#-api-documentation)
- [Kiến trúc dự án](#-kiến-trúc-dự-án)
- [Testing](#-testing)
- [Đặc tả kỹ thuật](#-đặc-tả-kỹ-thuật)

## ✨ Tính năng nổi bật

### 🎯 Quản lý Sản phẩm (Product Management)

- **CRUD đầy đủ**: Tạo, đọc, cập nhật và xóa sản phẩm
- **Soft Delete**: Xóa mềm sản phẩm (set `is_active = false`) để bảo toàn dữ liệu và có thể khôi phục
- **Auto-generate Slug**: Tự động tạo slug từ tên sản phẩm cho SEO-friendly URLs
- **Product Variants**: Quản lý nhiều biến thể sản phẩm (màu sắc, kích thước, SKU, giá, số lượng)
- **Product Status**: Hỗ trợ trạng thái sản phẩm (NEW, HOT, NONE)
- **Featured Products**: Đánh dấu sản phẩm nổi bật
- **Views Tracking**: Theo dõi lượt xem sản phẩm với atomic increment

### 🔍 Tìm kiếm & Lọc

- **Full-text Search**: Tìm kiếm trong tên và mô tả sản phẩm
- **Filter by Category**: Lọc sản phẩm theo danh mục
- **Filter by Brand**: Lọc sản phẩm theo thương hiệu
- **Filter by Featured**: Lọc sản phẩm nổi bật
- **Pagination**: Phân trang kết quả với `page` và `limit` (mặc định: page=1, limit=10, max=100)

### ⭐ Hệ thống Đánh giá (Rating System)

- **Auto-calculate Rating**: Tự động tính toán điểm đánh giá trung bình (`stars_evaluation`) từ reviews
- **Rating Count**: Đếm số lượng đánh giá cho mỗi sản phẩm
- **Precision**: Làm tròn điểm đánh giá đến 1 chữ số thập phân
- **Product Reviews API**: ⚠️ _Đang phát triển_ - Schema đã có sẵn, API endpoints chưa được implement

### 🏗️ Kiến trúc & Best Practices

- **Transaction Support**: Sử dụng Prisma transaction cho các thao tác phức tạp
- **Eager Loading**: Tránh N+1 query problem với Prisma include
- **Database Indexing**: Tối ưu queries với indexes trên các trường thường xuyên query
- **Cascade Delete**: Tự động xóa variants và reviews khi xóa sản phẩm
- **Data Validation**: Validation đầy đủ với class-validator và class-transformer
- **Error Handling**: Xử lý lỗi tập trung với custom exception filter
- **Response Transformation**: Chuẩn hóa response format với interceptor
- **Logging**: Logging chi tiết với Winston và daily rotate files
- **Rate Limiting**: Bảo vệ API với Throttler (100 requests/phút)
- **Security**: Helmet.js cho bảo mật HTTP headers
- **CORS**: Cấu hình CORS cho cross-origin requests

### 📊 Database Schema

- **Product Model**: Thông tin sản phẩm với đầy đủ metadata (SEO, tags, images, warranty, etc.)
- **ProductVariant Model**: Biến thể sản phẩm với SKU, giá, số lượng, màu sắc, kích thước
- **Review Model**: Đánh giá sản phẩm với rating và comment
- **Relations**: Quan hệ many-to-one và many-to-many giữa các models
- **Constraints**: Unique constraints cho slug, SKU và variant combinations

## 🛠️ Công nghệ sử dụng

### Core Framework

- **NestJS** (^11.0.1) - Progressive Node.js framework
- **TypeScript** (^5.7.3) - Type-safe JavaScript
- **Node.js** - Runtime environment

### Database & ORM

- **PostgreSQL** - Relational database
- **Prisma** (^7.1.0) - Next-generation ORM
- **@prisma/adapter-pg** - Prisma PostgreSQL adapter với connection pooling

### Validation & Transformation

- **class-validator** (^0.14.3) - Decorator-based validation
- **class-transformer** (^0.5.1) - Object transformation

### API Documentation

- **@nestjs/swagger** (^11.2.3) - API documentation với Swagger/OpenAPI
- **swagger-ui-express** (^5.0.1) - Swagger UI interface

### Security & Performance

- **helmet** (^8.1.0) - HTTP security headers
- **@nestjs/throttler** (^6.5.0) - Rate limiting

### Logging

- **winston** (^3.19.0) - Logging library
- **nest-winston** (^1.10.2) - Winston integration cho NestJS
- **winston-daily-rotate-file** (^5.0.0) - Daily rotating log files

### Configuration

- **@nestjs/config** (^4.0.2) - Configuration management
- **joi** (^18.0.2) - Schema validation cho environment variables

### Utilities

- **slugify** (^1.6.6) - Tạo slug từ text

### Testing

- **jest** (^30.0.0) - Testing framework
- **@nestjs/testing** (^11.0.1) - NestJS testing utilities
- **supertest** (^7.1.4) - HTTP assertions cho e2e testing
- **ts-jest** (^29.2.5) - TypeScript preprocessor cho Jest

## 📦 Cài đặt

### Yêu cầu hệ thống

- Node.js >= 18.x
- PostgreSQL >= 12.x
- npm >= 9.x hoặc yarn >= 1.x

### Bước 1: Clone repository

```bash
git clone <repository-url>
cd elegant-shop-backend
```

### Bước 2: Cài đặt dependencies

```bash
npm install
```

### Bước 3: Cấu hình Database

1. Tạo file `.env` trong thư mục gốc:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/elegant_shop?schema=public"

# Application
NODE_ENV=development
PORT=8080

# Security
JWT_SECRET=your-secret-key-change-in-production
```

2. Chạy migrations:

```bash
npm run migrate:dev
```

3. Generate Prisma Client:

```bash
npm run prisma:generate
```

### Bước 4: Chạy dự án

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## ⚙️ Cấu hình

### Environment Variables

| Variable       | Mô tả                                     | Mặc định    | Required |
| -------------- | ----------------------------------------- | ----------- | -------- |
| `DATABASE_URL` | PostgreSQL connection string              | -           | ✅       |
| `NODE_ENV`     | Environment (development/production/test) | development | ❌       |
| `PORT`         | Server port                               | 8080        | ❌       |
| `JWT_SECRET`   | Secret key cho JWT (sẽ dùng sau)          | -           | ✅       |

### Database Configuration

Prisma được cấu hình với:

- Connection pooling (max 20 connections trong production, 5 trong development)
- Query logging trong development mode
- Automatic connection management

### Logging Configuration

- **Development**: Console logging với colors và pretty print
- **Production**:
  - Daily rotating log files trong `logs/` directory
  - Application logs: `logs/application-YYYY-MM-DD.log`
  - Error logs: `logs/error-YYYY-MM-DD.log`
  - Auto-archive sau 14-30 ngày

## 🚀 Chạy dự án

### Development

```bash
npm run start:dev
```

Server sẽ chạy tại `http://localhost:8080` với hot-reload enabled.

### Production

```bash
# Build project
npm run build

# Run production server
npm run start:prod
```

### Debug Mode

```bash
npm run start:debug
```

## 📚 API Documentation

Sau khi khởi động server, truy cập Swagger UI tại:

```
http://localhost:8080/api/docs
```

### API Endpoints

#### Products

| Method   | Endpoint            | Mô tả                                                  |
| -------- | ------------------- | ------------------------------------------------------ |
| `POST`   | `/api/products`     | Tạo sản phẩm mới                                       |
| `GET`    | `/api/products`     | Lấy danh sách sản phẩm (có pagination, filter, search) |
| `GET`    | `/api/products/:id` | Lấy chi tiết sản phẩm theo ID                          |
| `PATCH`  | `/api/products/:id` | Cập nhật sản phẩm                                      |
| `DELETE` | `/api/products/:id` | Xóa mềm sản phẩm (soft delete)                         |

### Request/Response Examples

#### Tạo sản phẩm

```bash
POST /api/products
Content-Type: application/json

{
  "name": "Áo thun nam",
  "category": "Fashion",
  "measurement": "M",
  "description": "Áo thun chất lượng cao",
  "brand": "Nike",
  "material": "Cotton",
  "weight": 0.3,
  "warranty": "1 year",
  "tags": ["new", "hot"],
  "images": ["image1.jpg", "image2.jpg"],
  "is_featured": true,
  "variants": [
    {
      "color": "Đỏ",
      "colorHex": "#FF0000",
      "sku": "SKU001",
      "price": 299000,
      "price_sale": 249000,
      "quantity": 50,
      "image": "variant-red.jpg",
      "size": "M"
    }
  ]
}
```

#### Lấy danh sách sản phẩm với filter

```bash
GET /api/products?category=Fashion&brand=Nike&page=1&limit=10&search=áo
```

Response:

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "data": [
      {
        "id": "uuid",
        "name": "Áo thun nam",
        "slug": "ao-thun-nam",
        "stars_evaluation": 4.5,
        "rating_count": 10,
        "variants": [...],
        ...
      }
    ],
    "total": 25,
    "page": 1,
    "limit": 10
  }
}
```

## 🏛️ Kiến trúc dự án

```
src/
├── common/                 # Shared utilities
│   ├── filters/           # Exception filters
│   └── interceptors/      # Response interceptors
├── configs/               # Configuration modules
│   ├── config.module.ts   # Environment config
│   └── logger.config.ts   # Winston logger config
├── prisma/                # Prisma service
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── product/               # Product module
│   ├── dto/              # Data Transfer Objects
│   │   ├── create-product.dto.ts
│   │   ├── update-product.dto.ts
│   │   └── query-product.dto.ts
│   ├── product.controller.ts
│   ├── product.service.ts
│   └── product.module.ts
├── app.module.ts         # Root module
├── app.controller.ts     # Root controller
├── app.service.ts        # Root service
└── main.ts              # Application entry point

test/
├── e2e/                 # End-to-end tests
│   └── product.e2e-spec.ts
├── unit/                # Unit tests
│   └── product/
│       ├── product.controller.spec.ts
│       └── product.service.spec.ts
└── jest-e2e.json        # E2E test configuration

prisma/
├── schema.prisma        # Database schema
└── migrations/         # Database migrations
```

### Module Structure

- **AppModule**: Root module, imports tất cả các modules và configs
- **ProductModule**: Module quản lý sản phẩm với controller, service và DTOs
- **PrismaModule**: Module cung cấp PrismaService cho toàn bộ ứng dụng
- **CustomConfigModule**: Module cấu hình environment variables với validation

### Service Layer

- **ProductService**: Business logic cho quản lý sản phẩm
  - Transaction support cho atomic operations
  - Auto-generate slug
  - Soft delete implementation
  - Rating calculation
  - Search và filter logic

### Controller Layer

- **ProductController**: RESTful API endpoints
  - Input validation với DTOs
  - Error handling
  - Response transformation

## 🧪 Testing

### Chạy Tests

```bash
# Chạy tất cả tests với coverage
npm run test

# Chỉ chạy unit tests
npm run test:unit

# Chỉ chạy e2e tests
npm run test:e2e

# Chạy tests với coverage report chi tiết
npm run test:cov

# Watch mode
npm run test:watch

# Debug mode
npm run test:debug
```

### Test Coverage

Dự án có test coverage tốt với:

- **Unit Tests**: Test cho service và controller với mocked dependencies
- **E2E Tests**: Test tích hợp với database thực

### Test Structure

```
test/
├── unit/
│   └── product/
│       ├── product.service.spec.ts    # Service unit tests
│       └── product.controller.spec.ts # Controller unit tests
└── e2e/
    └── product.e2e-spec.ts            # E2E integration tests
```

### Test Cases Coverage

#### Product Service Tests

- ✅ Tạo sản phẩm với variants trong transaction
- ✅ Auto-generate slug từ tên sản phẩm
- ✅ Tạo sản phẩm với tất cả optional fields
- ✅ Tạo sản phẩm với nhiều variants
- ✅ Pagination với default values
- ✅ Filter by category, brand, is_featured
- ✅ Search trong name và description
- ✅ Tính toán stars_evaluation từ reviews
- ✅ Tìm sản phẩm theo ID với relations
- ✅ Increment views_count atomically
- ✅ Cập nhật sản phẩm với auto-update slug
- ✅ Soft delete sản phẩm

#### Product Controller Tests

- ✅ Tạo sản phẩm qua API
- ✅ Lấy danh sách sản phẩm với filters
- ✅ Lấy chi tiết sản phẩm
- ✅ Cập nhật sản phẩm
- ✅ Xóa sản phẩm
- ✅ Error handling (404, validation errors)

#### E2E Tests

- ✅ GET empty products list
- ✅ POST create product với variants
- ✅ GET product by ID
- ✅ GET 404 cho non-existent product
- ✅ PATCH update product với auto-update slug
- ✅ DELETE soft delete product
- ✅ GET với category filter
- ✅ GET với search query

## 📋 Đặc tả kỹ thuật

### Database Schema

#### Product Model

```prisma
model Product {
  id               String         @id @default(uuid())
  name             String
  slug             String?        @unique
  status           ProductStatus? @default(NONE)
  discount         Int?
  category         String
  measurement      String
  description      String
  stars_evaluation Float
  rating_count     Int            @default(1)
  brand            String?
  material         String?
  weight           Float?
  warranty         String?
  tags             String[]       @default([])
  images           String[]       @default([])
  meta_title       String?
  meta_description String?
  is_featured      Boolean        @default(false)
  is_active        Boolean        @default(true)
  views_count      Int            @default(0)
  publish_date     DateTime?
  created_at       DateTime       @default(now())
  updated_at       DateTime       @updatedAt

  variants        ProductVariant[]
  reviews         Review[]
  relatedProducts Product[]        @relation("RelatedProducts")
  relatedTo       Product[]        @relation("RelatedProducts")

  @@index([category])
  @@index([brand])
  @@index([is_featured, is_active(sort: Desc)])
  @@index([name])
}
```

#### ProductVariant Model

```prisma
model ProductVariant {
  id         String   @id @default(uuid())
  productId  String
  color      String
  colorHex   String?
  image      String
  images     String[] @default([])
  sku        String   @unique
  quantity   Int      @default(0)
  price      Float
  price_sale Float?
  size       String?
  material   String?

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@unique([productId, color, size])
  @@index([productId])
  @@index([sku])
}
```

#### Review Model

```prisma
model Review {
  id         String   @id @default(uuid())
  productId  String
  userId     String?
  rating     Int
  comment    String?
  created_at DateTime @default(now())

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
}
```

### API Response Format

#### Success Response

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": { ... }
}
```

#### Error Response

```json
{
  "statusCode": 404,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/products/invalid-id",
  "message": "Product not found"
}
```

### Performance Optimizations

1. **Database Indexing**: Indexes trên các trường thường xuyên query
2. **Eager Loading**: Load relations trong một query để tránh N+1
3. **Connection Pooling**: Prisma adapter với PostgreSQL pool
4. **Atomic Operations**: Sử dụng atomic increment cho views_count
5. **Transaction**: Đảm bảo data consistency
6. **Pagination**: Giới hạn số lượng records trả về

### Security Features

1. **Helmet.js**: Bảo vệ HTTP headers
2. **Rate Limiting**: Giới hạn 100 requests/phút
3. **Input Validation**: Validation tất cả inputs với class-validator
4. **SQL Injection Protection**: Prisma ORM tự động escape queries
5. **CORS**: Cấu hình CORS cho cross-origin requests
6. **Error Handling**: Không expose stack trace trong production

### Code Quality

- ✅ TypeScript strict mode
- ✅ ESLint configuration
- ✅ Prettier formatting
- ✅ Comprehensive test coverage
- ✅ Error handling và logging
- ✅ Code comments và documentation

## 📝 Scripts

| Script                    | Mô tả                                   |
| ------------------------- | --------------------------------------- |
| `npm run build`           | Build project                           |
| `npm run start`           | Start production server                 |
| `npm run start:dev`       | Start development server với watch mode |
| `npm run start:debug`     | Start với debug mode                    |
| `npm run test`            | Chạy tests với coverage                 |
| `npm run test:unit`       | Chỉ chạy unit tests                     |
| `npm run test:e2e`        | Chỉ chạy e2e tests                      |
| `npm run test:cov`        | Chạy tests với coverage report          |
| `npm run lint`            | Lint code                               |
| `npm run format`          | Format code với Prettier                |
| `npm run migrate:dev`     | Chạy Prisma migrations                  |
| `npm run prisma:generate` | Generate Prisma Client                  |

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 🚧 Tính năng đang phát triển

Các tính năng sau đây đã được thiết kế trong database schema nhưng chưa có API endpoints:

- ⏳ **Review Module**: CRUD API cho đánh giá sản phẩm
- ⏳ **User/Auth Module**: Xác thực người dùng với JWT (schema đã có `userId` trong Review)
- ⏳ **Related Products API**: Quản lý sản phẩm liên quan (relation đã có trong schema)
- ⏳ **Category Module**: Module quản lý danh mục (hiện tại chỉ là string field)
- ⏳ **Order/Cart Module**: Quản lý giỏ hàng và đơn hàng

## 📄 License

This project is private and unlicensed.

## 👨‍💻 Author

Developed with ❤️ using NestJS

---

**Note**: Đây là backend API cho hệ thống e-commerce. Frontend sẽ được phát triển riêng và kết nối với API này.
