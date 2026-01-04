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
- [Algorithms & Data Structures](#-algorithms--data-structures)

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

### ⭐ Hệ thống Đánh giá (Review System)

- **CRUD Reviews**: Tạo, đọc, cập nhật và xóa đánh giá
- **Upsert Logic**: Mỗi user chỉ có 1 review cho mỗi sản phẩm (có thể update)
- **Auto-calculate Rating**: Tự động tính toán điểm đánh giá trung bình (`stars_evaluation`) từ reviews
- **Rating Count**: Đếm số lượng đánh giá cho mỗi sản phẩm
- **Precision**: Làm tròn điểm đánh giá đến 1 chữ số thập phân
- **Review Reactions**: Like/Dislike reviews (yêu cầu đăng nhập)
- **Review Replies**: Trả lời đánh giá với nested structure (yêu cầu đăng nhập)
- **Authorization**: Admin xóa tất cả, User chỉ xóa/update review của mình
- **Count Reviews by User**: Đếm số lượng review của mỗi user

### 🔐 Xác thực & Phân quyền (Authentication & Authorization)

- **JWT Authentication**: Access Token + Refresh Token
- **Register/Login**: Hỗ trợ đăng ký và đăng nhập (email hoặc username, remember me)
- **Password Hashing**: bcrypt với salt rounds
- **Role-based Access Control**: USER, ADMIN, MODERATOR, GUEST
- **Public Routes**: Hỗ trợ routes public với `@Public()` decorator
- **Current User Decorator**: Dễ dàng lấy thông tin user hiện tại
- **Auto Admin Initialization**: Tự động tạo admin account khi app khởi động (nếu chưa có)
- **Test Token**: Endpoint tạo access token vô hạn (100 năm) để test API với quyền cao hơn ADMIN (token log ra console, không hiển thị trong Swagger)

### 🛒 Quản lý Đơn hàng (Order Management)

- **Guest Checkout**: Cho phép đặt hàng mà không cần đăng nhập
- **Authenticated Checkout**: Đặt hàng với tài khoản USER role (đã đăng nhập)
- **Role Restrictions**: ADMIN và MODERATOR **KHÔNG THỂ** đặt hàng (chỉ xem sản phẩm để quản lý)
- **Stock Management**: Tự động giảm stock khi đặt hàng
- **Order Tracking**: Theo dõi trạng thái đơn hàng (PENDING, PAID, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED)
- **Payment Methods**: Hỗ trợ nhiều phương thức thanh toán (COD, Bank Transfer, Credit Card, E-Wallet, PayPal)
- **Public Order Tracking**: Track đơn hàng bằng order number (không cần đăng nhập)
- **Authorization**: Users chỉ xem/update đơn hàng của mình, Admins xem/update tất cả

### ❓ FAQ Module (Câu hỏi Thường gặp)

- **Global FAQs**: Câu hỏi chung cho toàn bộ hệ thống
- **Product-specific FAQs**: FAQ riêng cho từng sản phẩm
- **FAQ Categories**: Phân loại FAQ (Privacy Policy, Terms of Service, Shipping, Returns, Warranty, Payment, etc.)
- **File/Image Upload**: Upload hình ảnh và file lên Cloudinary
- **Order/Display Order**: Sắp xếp thứ tự hiển thị
- **Active/Inactive Status**: Quản lý trạng thái FAQ

### 👤 Quản lý Người dùng (User Management)

- **User CRUD**: Tạo, đọc, cập nhật và xóa user
  - **Admin**: Toàn quyền (CRUD đầy đủ)
  - **Moderator**: Có thể tạo user (USER role only), xem tất cả users, update user (limited fields), KHÔNG được xóa user
  - **User**: Chỉ xem và update profile của chính mình
- **User Roles**: Phân quyền theo role (USER, ADMIN, MODERATOR, GUEST)
- **User Profile**: Quản lý thông tin người dùng
- **Auto Admin Setup**: Tự động tạo admin account mặc định khi app khởi động lần đầu

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

- **Product Model**: Thông tin sản phẩm với đầy đủ metadata (SEO, tags, images, warranty, sale dates, etc.)
- **ProductVariant Model**: Biến thể sản phẩm với SKU, giá, số lượng, màu sắc, kích thước
- **Review Model**: Đánh giá sản phẩm với rating và comment (1 review/user/product)
- **ReviewReaction Model**: Reactions (like/dislike) cho reviews
- **ReviewReply Model**: Trả lời đánh giá với nested structure
- **User Model**: Thông tin người dùng với roles và authentication
- **Order Model**: Đơn hàng với trạng thái và phương thức thanh toán
- **OrderItem Model**: Chi tiết đơn hàng (sản phẩm, số lượng, giá)
- **FAQ Model**: Câu hỏi thường gặp (global và product-specific)
- **Relations**: Quan hệ many-to-one và many-to-many giữa các models
- **Constraints**: Unique constraints cho slug, SKU, variant combinations, user-product reviews

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
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=your-refresh-secret-key (optional)
JWT_REFRESH_EXPIRES_IN=7d

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Admin Account (optional - for auto-creation on first start)
DEFAULT_ADMIN_EMAIL=admin@elegantshop.com
DEFAULT_ADMIN_PASSWORD=Admin@123456
DEFAULT_ADMIN_USERNAME=admin
```

2. Chạy migrations:

```bash
npm run migrate:dev
```

3. Generate Prisma Client:

```bash
npm run prisma:generate
```

### Bước 4: Khởi động ứng dụng lần đầu

Khi chạy ứng dụng lần đầu tiên, hệ thống sẽ **tự động tạo admin account** nếu các environment variables được cấu hình trong file `.env`:

```env
DEFAULT_ADMIN_EMAIL=your-admin-email@example.com
DEFAULT_ADMIN_PASSWORD=your-secure-password
DEFAULT_ADMIN_USERNAME=your-admin-username
```

⚠️ **Lưu ý**:

- Nếu các environment variables này **không được set**, hệ thống sẽ **bỏ qua việc tạo admin account** (không có hardcode values)
- Sau khi set env vars và khởi động app, kiểm tra console log để xem thông tin đăng nhập
- Hãy đổi mật khẩu sau lần đăng nhập đầu tiên!

### Bước 5: Chạy dự án

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

**Lưu ý**: Khi khởi động lần đầu, hệ thống sẽ tự động tạo admin account nếu chưa có. Xem log để lấy thông tin đăng nhập mặc định.

## ⚙️ Cấu hình

### Environment Variables

| Variable                 | Mô tả                                     | Mặc định    | Required |
| ------------------------ | ----------------------------------------- | ----------- | -------- |
| `DATABASE_URL`           | PostgreSQL connection string              | -           | ✅       |
| `NODE_ENV`               | Environment (development/production/test) | development | ❌       |
| `PORT`                   | Server port                               | 8080        | ❌       |
| `JWT_SECRET`             | Secret key cho JWT                        | -           | ✅       |
| `JWT_EXPIRES_IN`         | Access token expiration time              | 1d          | ❌       |
| `JWT_REFRESH_SECRET`     | Refresh token secret (optional)           | JWT_SECRET  | ❌       |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration time             | 7d          | ❌       |
| `CLOUDINARY_CLOUD_NAME`  | Cloudinary cloud name                     | -           | ✅       |
| `CLOUDINARY_API_KEY`     | Cloudinary API key                        | -           | ✅       |
| `CLOUDINARY_API_SECRET`  | Cloudinary API secret                     | -           | ✅       |
| `DEFAULT_ADMIN_EMAIL`    | Email cho admin account tự động tạo       | -           | ❌       |
| `DEFAULT_ADMIN_PASSWORD` | Password cho admin account tự động tạo    | -           | ❌       |
| `DEFAULT_ADMIN_USERNAME` | Username cho admin account tự động tạo    | -           | ❌       |

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

### Test Token (Development/Testing Only)

Để test API dễ dàng, bạn có thể lấy test token vô hạn (100 năm expiration) với quyền cao hơn ADMIN:

```bash
POST /api/auth/test-token
```

**Lưu ý**: Endpoint này không xuất hiện trong Swagger UI. Token sẽ được in ra console terminal (không trả về trong response).

Khi gọi endpoint này, token sẽ được hiển thị trong console terminal như sau:

```
═══════════════════════════════════════════════════════════
🔑 TEST TOKEN GENERATED
═══════════════════════════════════════════════════════════
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
═══════════════════════════════════════════════════════════
⚠️  This token has super admin privileges and bypasses all guards!
⚠️  USE ONLY IN DEVELOPMENT/TESTING ENVIRONMENT!
═══════════════════════════════════════════════════════════
```

**Thông tin về Test Token**:

- Token này có quyền cao hơn ADMIN (bypass tất cả guards)
- Chỉ nên dùng trong development/testing environment
- Token có expiration 100 năm (effectively infinite)
- Token chỉ được log ra console, không xuất hiện trong Swagger UI

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
├── auth/                 # Authentication module
│   ├── decorators/      # Custom decorators (@Public, @CurrentUser, @Roles)
│   ├── guards/          # Auth guards (JwtAuthGuard, RolesGuard)
│   ├── strategies/      # Passport strategies (JWT)
│   ├── dto/            # Auth DTOs (register, login, refresh)
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── user/                # User management module
│   ├── dto/            # User DTOs
│   ├── user.controller.ts
│   ├── user.service.ts
│   └── user.module.ts
├── product/             # Product module
│   ├── dto/            # Product DTOs
│   ├── product.controller.ts
│   ├── product.service.ts
│   └── product.module.ts
├── review/              # Review module
│   ├── dto/            # Review DTOs
│   ├── review.controller.ts
│   ├── review.service.ts
│   └── review.module.ts
├── order/               # Order module
│   ├── dto/            # Order DTOs
│   ├── order.controller.ts
│   ├── order.service.ts
│   └── order.module.ts
├── faq/                 # FAQ module
│   ├── dto/            # FAQ DTOs
│   ├── faq.controller.ts
│   ├── faq.service.ts
│   └── faq.module.ts
├── cloudinary/          # Cloudinary integration
│   ├── cloudinary.service.ts
│   └── cloudinary.module.ts
├── common/              # Shared utilities
│   ├── filters/        # Exception filters
│   ├── interceptors/   # Response interceptors
│   ├── services/       # Common services
│   │   └── init.service.ts  # Auto-create admin account
│   └── common.module.ts
├── configs/            # Configuration modules
│   ├── config.module.ts
│   └── logger.config.ts
├── prisma/             # Prisma service
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── app.module.ts      # Root module
├── app.controller.ts  # Root controller
├── app.service.ts     # Root service
└── main.ts           # Application entry point

test/
├── e2e/              # End-to-end tests
│   ├── auth.e2e-spec.ts
│   ├── user.e2e-spec.ts
│   ├── product.e2e-spec.ts
│   ├── review.e2e-spec.ts
│   ├── order.e2e-spec.ts
│   └── faq.e2e-spec.ts
├── unit/             # Unit tests
│   ├── auth/
│   ├── user/
│   ├── product/
│   ├── review/
│   ├── order/
│   └── faq/
└── jest-e2e.json     # E2E test configuration

prisma/
├── schema.prisma     # Database schema
├── migrations/       # Database migrations
└── seed.ts          # Database seeding script
```

### Module Structure

- **AppModule**: Root module, imports tất cả các modules và configs
- **ProductModule**: Module quản lý sản phẩm với controller, service và DTOs
- **ReviewModule**: Module quản lý reviews, reactions, replies
- **AuthModule**: Module xác thực JWT, register, login, logout
- **UserModule**: Module quản lý users với role-based access
- **OrderModule**: Module quản lý orders (guest và authenticated)
- **FAQModule**: Module quản lý FAQs (global và product-specific)
- **CommonModule**: Module chứa InitService (auto-create admin)
- **PrismaModule**: Module cung cấp PrismaService cho toàn bộ ứng dụng
- **CustomConfigModule**: Module cấu hình environment variables với validation
- **CloudinaryModule**: Module tích hợp Cloudinary cho file upload

### Service Layer

- **ProductService**: Business logic cho quản lý sản phẩm
  - Transaction support cho atomic operations
  - Auto-generate slug
  - Soft delete implementation
  - Rating calculation
  - Search và filter logic
  - Sale management với auto cleanup

- **ReviewService**: Business logic cho reviews, reactions, replies
  - Upsert logic (1 review/user/product)
  - Auto-calculate product rating
  - Nested replies structure

- **AuthService**: Business logic cho authentication
  - JWT token generation
  - Password hashing
  - Test token generation (development only)

- **UserService**: Business logic cho user management
  - Role-based CRUD operations
  - Moderator limited permissions

- **OrderService**: Business logic cho order management
  - Guest và authenticated checkout
  - Stock management
  - Order tracking

- **FAQService**: Business logic cho FAQ management
  - Global và product-specific FAQs
  - File/image upload integration

- **InitService**: Khởi tạo admin account khi app start (OnModuleInit)

### Controller Layer

- **ProductController**: RESTful API endpoints với input validation
- **ReviewController**: Review endpoints với authorization
- **AuthController**: Authentication endpoints (login, register, test-token)
- **UserController**: User CRUD với role-based guards
- **OrderController**: Order endpoints với guest support
- **FAQController**: FAQ endpoints với file upload

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
├── unit/              # Unit tests
│   ├── auth/         # Auth service/controller tests
│   ├── user/         # User service/controller tests
│   ├── product/      # Product service/controller tests
│   ├── review/       # Review service/controller tests
│   ├── order/        # Order service/controller tests
│   └── faq/          # FAQ service/controller tests
└── e2e/              # End-to-end tests
    ├── app.e2e-spec.ts
    ├── auth.e2e-spec.ts
    ├── user.e2e-spec.ts
    ├── product.e2e-spec.ts
    ├── review.e2e-spec.ts
    ├── order.e2e-spec.ts
    └── faq.e2e-spec.ts
```

### Test Coverage

**Tổng Coverage: 60.05%**

#### Modules có Coverage Tốt (>80%)

- ✅ **App Module**: 100% coverage
- ✅ **Auth Module**: 97.8% coverage
- ✅ **Order Module**: 95.28% coverage
- ✅ **User Module**: 95.18% coverage
- ✅ **Product Module**: 88.54% coverage

#### Modules cần Cải thiện

- ⚠️ **Review Module**: 36.24% coverage (cần E2E tests)
- ⚠️ **FAQ Module**: 25.92% coverage (cần E2E tests)
- ⚠️ **Cloudinary Module**: 0% coverage (cần unit tests với mocks)

### Test Cases Coverage

#### Product Tests

- ✅ CRUD operations
- ✅ Variants management
- ✅ Search & filter
- ✅ Sale management
- ✅ Views tracking
- ✅ Soft delete

#### Auth Tests

- ✅ Register với validation
- ✅ Login (email/username)
- ✅ JWT token generation
- ✅ Refresh token
- ✅ Logout
- ✅ Password hashing

#### Order Tests

- ✅ Guest checkout
- ✅ Authenticated checkout
- ✅ Stock management
- ✅ Order tracking
- ✅ Authorization

#### Review Tests (Partial)

- ✅ Review CRUD
- ✅ Reactions
- ✅ Replies
- ⚠️ E2E tests cần được bổ sung

#### Security Tests

- ✅ SQL Injection protection
- ✅ XSS protection
- ✅ IDOR protection
- ✅ Mass assignment protection
- ✅ Input validation

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

### Algorithms & Data Structures

Dự án sử dụng nhiều thuật toán và cấu trúc dữ liệu được tối ưu:

- **Pagination**: Skip/Take pattern với O(limit) space complexity
- **Rating Calculation**: O(n) time với reduce algorithm
- **Password Hashing**: bcrypt với O(2^10) iterations
- **Search**: Full-text search với database indexes (O(log n))
- **Transactions**: ACID transactions cho data consistency
- **Atomic Operations**: O(1) atomic increment/decrement
- **Upsert Algorithm**: O(1) với unique indexes
- **Stock Management**: Atomic decrement trong transactions
- **Nested Replies**: Tree structure với self-referencing

Xem chi tiết tại [docs/ALGORITHMS.md](./docs/ALGORITHMS.md)

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

## ✅ Tính năng đã Hoàn thành

- ✅ **Product Module**: CRUD đầy đủ, variants, sale management, search & filter
- ✅ **Review Module**: CRUD reviews, reactions, replies, authorization
- ✅ **User Module**: CRUD users với role-based access (Admin/Moderator/User permissions)
- ✅ **Auth Module**: JWT authentication, register, login, logout, refresh token
- ✅ **Order Module**: Guest checkout, authenticated checkout, order tracking
- ✅ **FAQ Module**: Global và product-specific FAQs, file upload
- ✅ **Cloudinary Integration**: Image và file upload
- ✅ **Security**: JWT, password hashing, role-based access, input validation
- ✅ **Testing**: Unit tests và E2E tests với coverage 60%+
- ✅ **Auto Admin Setup**: Tự động tạo admin account khi app khởi động
- ✅ **Test Token**: Endpoint tạo test token vô hạn (100 năm) để test API với quyền cao hơn ADMIN

## 🚧 Tính năng có thể Phát triển thêm

- ⏳ **Related Products API**: Quản lý sản phẩm liên quan (relation đã có trong schema)
- ⏳ **Category Module**: Module quản lý danh mục (hiện tại chỉ là string field)
- ⏳ **Cart Module**: Quản lý giỏ hàng (shopping cart)
- ⏳ **Email Notifications**: Thông báo qua email
- ⏳ **Payment Gateway Integration**: Tích hợp cổng thanh toán
- ⏳ **Tax & Shipping Calculation**: Tính toán thuế và phí vận chuyển tự động
- ⏳ **Discount/Coupon System**: Hệ thống giảm giá và mã giảm giá
- ⏳ **Analytics Dashboard**: Dashboard thống kê và phân tích
- ⏳ **Search Optimization**: Tối ưu tìm kiếm với Elasticsearch
- ⏳ **Caching**: Redis caching cho performance
- ⏳ **GraphQL API**: GraphQL API bên cạnh REST API

## 📄 License

This project is private and unlicensed.

## 👨‍💻 Author

Developed with ❤️ using NestJS

---

**Note**: Đây là backend API cho hệ thống e-commerce. Frontend sẽ được phát triển riêng và kết nối với API này.
