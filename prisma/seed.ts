import { PrismaClient, FAQCategory, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import slugify from 'slugify';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const pool = new Pool({
  connectionString,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...');

  // Clear all existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.review.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.reviewReaction.deleteMany({});
  await prisma.reviewReply.deleteMany({});
  try {
    await prisma.fAQ.deleteMany({});
  } catch (error) {
    // FAQ table might not exist yet, skip deletion
    console.log('⚠️  FAQ table does not exist yet, skipping...');
  }
  await prisma.productVariant.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});

  // Create sale dates - some products will have sales
  const now = new Date();
  const in2Days = new Date(now);
  in2Days.setDate(in2Days.getDate() + 2);
  const in5Days = new Date(now);
  in5Days.setDate(in5Days.getDate() + 5);
  const in10Days = new Date(now);
  in10Days.setDate(in10Days.getDate() + 10);
  const in15Days = new Date(now);
  in15Days.setDate(in15Days.getDate() + 15);

  const products = [
    // Living Room - 4 products
    {
      name: 'Modern Sectional Sofa',
      category: 'Living Room',
      measurement: '280x120x85 cm',
      description:
        'Stylish modern sectional sofa with premium fabric upholstery. Features deep seats, comfortable cushions, and sturdy wooden legs. Perfect for contemporary living spaces. Available in multiple colors to match your decor.',
      brand: 'ComfortHome',
      material: 'Polyester Fabric, Solid Wood Frame',
      weight: 58.5,
      warranty: '2 years',
      tags: ['sofa', 'sectional', 'furniture', 'modern', 'comfortable'],
      images: [
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=262&h=349&fit=crop',
        'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=262&h=349&fit=crop',
      ],
      meta_title: 'Modern Sectional Sofa - Premium Living Room Furniture',
      meta_description:
        'Shop our modern sectional sofa with premium quality and elegant design. Perfect for your living room.',
      is_featured: true,
      sale_start_date: now,
      sale_end_date: in10Days,
      variants: [
        {
          color: 'Charcoal Gray',
          colorHex: '#36454F',
          sku: 'SOFA-SECT-GRAY-001',
          price: 1299.99,
          price_sale: 999.99,
          quantity: 12,
          image:
            'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=262&h=349&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=262&h=349&fit=crop',
            'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=262&h=349&fit=crop',
          ],
          size: 'Standard',
        },
        {
          color: 'Navy Blue',
          colorHex: '#000080',
          sku: 'SOFA-SECT-NAVY-001',
          price: 1299.99,
          price_sale: 999.99,
          quantity: 8,
          image:
            'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=262&h=349&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=262&h=349&fit=crop',
          ],
          size: 'Standard',
        },
      ],
    },
    {
      name: 'Coffee Table with Storage',
      category: 'Living Room',
      measurement: '120x60x45 cm',
      description:
        'Stylish coffee table with hidden storage compartment and drawers. Made from high-quality engineered wood with elegant finish. Features smooth drawer slides and spacious storage space. Perfect centerpiece for your living room.',
      brand: 'FurniturePro',
      material: 'Engineered Wood, Metal Hardware',
      weight: 22.8,
      warranty: '1 year',
      tags: ['table', 'storage', 'coffee table', 'functional', 'modern'],
      images: [
        'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=262&h=349&fit=crop',
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=262&h=349&fit=crop',
      ],
      meta_title: 'Coffee Table with Storage - Modern Design',
      meta_description:
        'Functional coffee table with hidden storage. Perfect addition to your living room.',
      is_featured: false,
      variants: [
        {
          color: 'Oak Brown',
          colorHex: '#D2B48C',
          sku: 'CT-OAK-001',
          price: 299.99,
          quantity: 25,
          image:
            'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=262&h=349&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=262&h=349&fit=crop',
          ],
        },
        {
          color: 'Espresso',
          colorHex: '#3B2F2F',
          sku: 'CT-ESPRESSO-001',
          price: 299.99,
          quantity: 18,
          image:
            'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=262&h=349&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=262&h=349&fit=crop',
          ],
        },
      ],
    },
    {
      name: 'TV Stand Entertainment Center',
      category: 'Living Room',
      measurement: '180x40x50 cm',
      description:
        'Spacious TV stand with multiple shelves and built-in cable management system. Accommodates TVs up to 65 inches. Features glass doors, adjustable shelves, and hidden compartments. Modern design that complements any entertainment setup.',
      brand: 'TechFurniture',
      material: 'Engineered Wood, Tempered Glass',
      weight: 38.5,
      warranty: '2 years',
      tags: [
        'TV stand',
        'entertainment',
        'storage',
        'modern',
        'cable management',
      ],
      images: [
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=262&h=349&fit=crop',
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=262&h=349&fit=crop',
      ],
      meta_title: 'TV Stand Entertainment Center - Modern Design',
      meta_description:
        'Perfect TV stand for your entertainment setup with cable management.',
      is_featured: true,
      sale_start_date: in2Days,
      sale_end_date: in15Days,
      variants: [
        {
          color: 'Walnut',
          colorHex: '#5C4033',
          sku: 'TVS-WALNUT-001',
          price: 549.99,
          price_sale: 429.99,
          quantity: 10,
          image:
            'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=262&h=349&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=262&h=349&fit=crop',
          ],
        },
        {
          color: 'White',
          colorHex: '#FFFFFF',
          sku: 'TVS-WHITE-001',
          price: 549.99,
          price_sale: 429.99,
          quantity: 12,
          image:
            'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=262&h=349&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=262&h=349&fit=crop',
          ],
        },
      ],
    },
    {
      name: 'Velvet Accent Chair',
      category: 'Living Room',
      measurement: '75x75x95 cm',
      description:
        'Luxurious accent chair with premium velvet upholstery and elegant design. Features comfortable high back, padded armrests, and solid wood legs with gold accents. Perfect for reading, relaxing, or as a statement piece in your living room.',
      brand: 'LuxurySeating',
      material: 'Premium Velvet, Solid Wood, Metal',
      weight: 15.8,
      warranty: '1 year',
      tags: ['chair', 'accent', 'velvet', 'comfortable', 'luxury'],
      images: [
        'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=262&h=349&fit=crop',
        'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=262&h=349&fit=crop',
      ],
      meta_title: 'Velvet Accent Chair - Premium Luxury Seating',
      meta_description:
        'Elegant velvet accent chair for your living room. Premium quality and comfort.',
      is_featured: false,
      variants: [
        {
          color: 'Emerald Green',
          colorHex: '#50C878',
          sku: 'AC-VELVET-GREEN-001',
          price: 349.99,
          quantity: 15,
          image:
            'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=262&h=349&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=262&h=349&fit=crop',
          ],
        },
        {
          color: 'Dusty Rose',
          colorHex: '#B78B84',
          sku: 'AC-VELVET-ROSE-001',
          price: 349.99,
          quantity: 12,
          image:
            'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=262&h=349&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=262&h=349&fit=crop',
          ],
        },
      ],
    },
    // Bedroom - 4 products
    {
      name: 'Queen Size Platform Bed',
      category: 'Bedroom',
      measurement: '200x160x100 cm',
      description:
        'Modern platform bed frame with upholstered headboard. Features slatted base for optimal mattress support and no box spring needed. Clean lines and contemporary design that creates a serene bedroom atmosphere.',
      brand: 'SleepWell',
      material: 'Upholstered Fabric, Engineered Wood',
      weight: 62.5,
      warranty: '3 years',
      tags: ['bed', 'bedroom', 'queen size', 'platform', 'headboard'],
      images: [
        'https://images.unsplash.com/photo-1631889993954-3d17d8c3a58e?w=262&h=349&fit=crop',
        'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=262&h=349&fit=crop',
      ],
      meta_title: 'Queen Size Platform Bed - Modern Bedroom Furniture',
      meta_description:
        'Comfortable and stylish queen size platform bed for your bedroom.',
      is_featured: true,
      sale_start_date: now,
      sale_end_date: in5Days,
      variants: [
        {
          color: 'Light Gray',
          colorHex: '#D3D3D3',
          sku: 'BED-QUEEN-GRAY-001',
          price: 699.99,
          price_sale: 549.99,
          quantity: 8,
          image:
            'https://images.unsplash.com/photo-1631889993954-3d17d8c3a58e?w=262&h=349&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1631889993954-3d17d8c3a58e?w=262&h=349&fit=crop',
          ],
          size: 'Queen',
        },
        {
          color: 'Navy Blue',
          colorHex: '#000080',
          sku: 'BED-QUEEN-NAVY-001',
          price: 699.99,
          price_sale: 549.99,
          quantity: 6,
          image:
            'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=262&h=349&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=262&h=349&fit=crop',
          ],
          size: 'Queen',
        },
      ],
    },
    {
      name: '6-Drawer Dresser with Mirror',
      category: 'Bedroom',
      measurement: '140x50x160 cm',
      description:
        'Elegant dresser with attached full-length mirror and six spacious drawers. Perfect for storing clothes, accessories, and personal items. Features soft-close drawer mechanisms, adjustable mirror, and premium hardware. Beautiful addition to any bedroom.',
      brand: 'BedroomEssentials',
      material: 'Engineered Wood, Tempered Glass Mirror',
      weight: 58.3,
      warranty: '2 years',
      tags: ['dresser', 'mirror', 'storage', 'bedroom', 'drawers'],
      images: [
        'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=262&h=349&fit=crop',
        'https://images.unsplash.com/photo-1631889993954-3d17d8c3a58e?w=262&h=349&fit=crop',
      ],
      meta_title: '6-Drawer Dresser with Mirror - Bedroom Storage',
      meta_description:
        'Functional dresser with mirror for your bedroom organization.',
      is_featured: false,
      variants: [
        {
          color: 'White',
          colorHex: '#FFFFFF',
          sku: 'DRS-6-WHITE-001',
          price: 479.99,
          quantity: 12,
          image:
            'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=262&h=349&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=262&h=349&fit=crop',
          ],
        },
        {
          color: 'Charcoal',
          colorHex: '#36454F',
          sku: 'DRS-6-CHARCOAL-001',
          price: 479.99,
          quantity: 10,
          image:
            'https://images.unsplash.com/photo-1631889993954-3d17d8c3a58e?w=262&h=349&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1631889993954-3d17d8c3a58e?w=262&h=349&fit=crop',
          ],
        },
      ],
    },
    {
      name: 'Nightstand Set of 2',
      category: 'Bedroom',
      measurement: '45x40x60 cm each',
      description:
        'Matching pair of modern nightstands with drawer storage. Compact design perfect for bedside use. Features USB charging ports, soft-close drawer, and convenient storage space. Complete your bedroom set with this stylish duo.',
      brand: 'BedroomEssentials',
      material: 'MDF, Metal Hardware',
      weight: 18.5,
      warranty: '1 year',
      tags: ['nightstand', 'bedroom', 'storage', 'set', 'modern'],
      images: [
        'https://images.unsplash.com/photo-1631889993954-3d17d8c3a58e?w=262&h=349&fit=crop',
        'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=262&h=349&fit=crop',
      ],
      meta_title: 'Nightstand Set of 2 - Modern Bedroom Furniture',
      meta_description: 'Matching nightstand set for your bedroom.',
      is_featured: false,
      sale_start_date: in2Days,
      sale_end_date: in15Days,
      variants: [
        {
          color: 'Oak',
          colorHex: '#D2B48C',
          sku: 'NS-SET-OAK-001',
          price: 229.99,
          price_sale: 179.99,
          quantity: 18,
          image:
            'https://images.unsplash.com/photo-1631889993954-3d17d8c3a58e?w=262&h=349&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1631889993954-3d17d8c3a58e?w=262&h=349&fit=crop',
          ],
        },
        {
          color: 'Black',
          colorHex: '#000000',
          sku: 'NS-SET-BLACK-001',
          price: 229.99,
          price_sale: 179.99,
          quantity: 15,
          image:
            'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=262&h=349&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=262&h=349&fit=crop',
          ],
        },
      ],
    },
    // Kitchen - 3 products
    {
      name: 'Kitchen Island with Bar Stools',
      category: 'Kitchen',
      measurement: '180x90x92 cm',
      description:
        'Versatile kitchen island with built-in storage and three matching bar stools. Features granite countertop, multiple drawers, and open shelving. Perfect for meal preparation, casual dining, and entertaining. Creates a focal point in your kitchen.',
      brand: 'KitchenPro',
      material: 'Solid Wood, Granite, Stainless Steel',
      weight: 125.0,
      warranty: '2 years',
      tags: ['kitchen island', 'bar stools', 'storage', 'dining', 'granite'],
      images: [
        'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=262&h=349&fit=crop',
        'https://images.unsplash.com/photo-1556912173-48e7a0c93e7e?w=262&h=349&fit=crop',
      ],
      meta_title: 'Kitchen Island with Bar Stools - Functional Design',
      meta_description:
        'Perfect kitchen island for meal prep and casual dining with matching stools.',
      is_featured: true,
      sale_start_date: now,
      sale_end_date: in10Days,
      variants: [
        {
          color: 'Natural Oak',
          colorHex: '#DEB887',
          sku: 'KI-OAK-STOOLS-001',
          price: 1599.99,
          price_sale: 1249.99,
          quantity: 4,
          image:
            'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=262&h=349&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=262&h=349&fit=crop',
            'https://images.unsplash.com/photo-1556912173-48e7a0c93e7e?w=262&h=349&fit=crop',
          ],
        },
        {
          color: 'White',
          colorHex: '#FFFFFF',
          sku: 'KI-WHITE-STOOLS-001',
          price: 1599.99,
          price_sale: 1249.99,
          quantity: 3,
          image:
            'https://images.unsplash.com/photo-1556912173-48e7a0c93e7e?w=262&h=349&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1556912173-48e7a0c93e7e?w=262&h=349&fit=crop',
            'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=262&h=349&fit=crop',
          ],
        },
      ],
    },
    {
      name: '6-Piece Dining Table Set',
      category: 'Kitchen',
      measurement: '200x100x75 cm',
      description:
        'Beautiful extendable dining table set with 6 matching upholstered chairs. Table extends to accommodate up to 8 guests for special occasions. Made from premium hardwood with elegant finish. Comfortable chairs with padded seats and backs.',
      brand: 'DiningElegance',
      material: 'Hardwood, Premium Fabric Upholstery',
      weight: 95.5,
      warranty: '3 years',
      tags: ['dining table', 'chairs', 'set', 'extendable', 'elegant'],
      images: [
        'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=262&h=349&fit=crop',
        'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=262&h=349&fit=crop',
      ],
      meta_title: '6-Piece Dining Table Set - Elegant Design',
      meta_description:
        'Premium extendable dining table set with matching chairs for your kitchen or dining room.',
      is_featured: false,
      variants: [
        {
          color: 'Rich Mahogany',
          colorHex: '#C04000',
          sku: 'DT-SET-MAHOGANY-001',
          price: 1199.99,
          quantity: 5,
          image:
            'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=262&h=349&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=262&h=349&fit=crop',
          ],
        },
        {
          color: 'Natural Oak',
          colorHex: '#D2B48C',
          sku: 'DT-SET-OAK-001',
          price: 1199.99,
          quantity: 7,
          image:
            'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=262&h=349&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=262&h=349&fit=crop',
          ],
        },
      ],
    },
    {
      name: 'Kitchen Storage Cabinet',
      category: 'Kitchen',
      measurement: '100x45x190 cm',
      description:
        'Tall kitchen storage cabinet with multiple shelves and glass doors. Perfect for storing dishes, cookware, glassware, and pantry items. Features adjustable shelves, soft-close doors, and elegant design. Maximize your kitchen storage with style.',
      brand: 'KitchenPro',
      material: 'Engineered Wood, Tempered Glass',
      weight: 52.8,
      warranty: '2 years',
      tags: ['cabinet', 'storage', 'kitchen', 'shelves', 'glass doors'],
      images: [
        'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=262&h=349&fit=crop',
        'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=262&h=349&fit=crop',
      ],
      meta_title: 'Kitchen Storage Cabinet - Spacious Design',
      meta_description:
        'Functional storage cabinet with glass doors for your kitchen organization.',
      is_featured: false,
      sale_start_date: in2Days,
      sale_end_date: in15Days,
      variants: [
        {
          color: 'White',
          colorHex: '#FFFFFF',
          sku: 'KC-WHITE-001',
          price: 449.99,
          price_sale: 359.99,
          quantity: 12,
          image:
            'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=262&h=349&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=262&h=349&fit=crop',
          ],
        },
        {
          color: 'Charcoal Gray',
          colorHex: '#36454F',
          sku: 'KC-GRAY-001',
          price: 449.99,
          price_sale: 359.99,
          quantity: 10,
          image:
            'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=262&h=349&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=262&h=349&fit=crop',
          ],
        },
      ],
    },
  ];

  console.log('📦 Creating products...');

  for (const productData of products) {
    const { variants, ...productFields } = productData;
    const product = await prisma.product.create({
      data: {
        ...productFields,
        slug: slugify(productData.name, { lower: true, strict: true }),
        stars_evaluation: 0,
        variants: {
          create: variants,
        },
      },
      include: {
        variants: true,
      },
    });
    console.log(
      `✅ Created: ${product.name} (${product.category}) - ${product.variants.length} variants`,
    );
  }

  console.log(
    `\n✨ Products seed completed! Created ${products.length} products.`,
  );

  // ========== FAQ Seed Data ==========
  console.log('\n📋 Creating FAQs...');

  // Get all products for product-specific FAQs
  const allProducts = await prisma.product.findMany({
    select: { id: true, name: true },
  });

  const faqs = [
    // Privacy Policy FAQs
    {
      question: 'How do you protect my personal information?',
      answer:
        'We take your privacy seriously. All personal information is encrypted using SSL/TLS technology during transmission. We never sell your personal data to third parties. Your information is stored securely and only used for order processing and customer service purposes. For more details, please review our complete Privacy Policy.',
      category: FAQCategory.PRIVACY_POLICY,
      productId: null,
      order: 1,
      is_active: true,
    },
    {
      question: 'What information do you collect?',
      answer:
        'We collect information you provide directly to us, such as when you create an account, place an order, subscribe to our newsletter, or contact us. This includes your name, email address, shipping address, payment information, and phone number. We also automatically collect certain information about your device and how you interact with our website.',
      category: FAQCategory.PRIVACY_POLICY,
      productId: null,
      order: 2,
      is_active: true,
    },

    // Terms of Service FAQs
    {
      question: 'What are the terms and conditions for using your website?',
      answer:
        'By using our website, you agree to comply with all applicable laws and regulations. You may not use our site for any unlawful purpose or to solicit others to perform unlawful acts. All content on our website is our property and protected by copyright laws. We reserve the right to refuse service to anyone at any time.',
      category: FAQCategory.TERMS_OF_SERVICE,
      productId: null,
      order: 1,
      is_active: true,
    },
    {
      question: 'Can I cancel my order?',
      answer:
        'You can cancel your order within 24 hours of placing it, provided it has not been shipped. Once your order has been shipped, it cannot be cancelled, but you may return it for a refund in accordance with our return policy. To cancel an order, please contact our customer service team immediately.',
      category: FAQCategory.TERMS_OF_SERVICE,
      productId: null,
      order: 2,
      is_active: true,
    },

    // Shipping FAQs
    {
      question: 'What are your shipping options and delivery times?',
      answer:
        'We offer standard shipping (5-7 business days), expedited shipping (2-3 business days), and express shipping (1-2 business days) to most locations. Shipping costs vary based on the delivery method and destination. Free standard shipping is available on orders over $99. You will receive a tracking number via email once your order ships.',
      category: FAQCategory.SHIPPING,
      productId: null,
      order: 1,
      is_active: true,
    },
    {
      question: 'Do you ship internationally?',
      answer:
        'Currently, we ship to the United States, Canada, and select countries in Europe. International shipping rates and delivery times vary by destination. Additional customs duties and taxes may apply and are the responsibility of the customer. Please contact us for specific shipping information to your country.',
      category: FAQCategory.SHIPPING,
      productId: null,
      order: 2,
      is_active: true,
    },
    {
      question: 'How can I track my order?',
      answer:
        "Once your order ships, you will receive an email with a tracking number and link. You can use this tracking number on our website or the carrier's website to monitor your package's progress. If you have any questions about your shipment, please contact our customer service team.",
      category: FAQCategory.SHIPPING,
      productId: null,
      order: 3,
      is_active: true,
    },

    // Returns FAQs
    {
      question: 'What is your return policy?',
      answer:
        'We offer a 30-day return policy from the date of delivery. Items must be in their original condition, unused, and in original packaging with all tags attached. Furniture items must be disassembled and returned in original packaging. We will refund the purchase price (excluding shipping costs) once we receive and inspect the returned item.',
      category: FAQCategory.RETURNS,
      productId: null,
      order: 1,
      is_active: true,
    },
    {
      question: 'How do I return an item?',
      answer:
        'To return an item, please log into your account and initiate a return request, or contact our customer service team. We will provide you with a return authorization number and shipping instructions. You are responsible for return shipping costs unless the item is defective or we made an error. Please package items securely to prevent damage during transit.',
      category: FAQCategory.RETURNS,
      productId: null,
      order: 2,
      is_active: true,
    },
    {
      question: 'When will I receive my refund?',
      answer:
        'Refunds are processed within 5-7 business days after we receive your returned item and verify its condition. The refund will be issued to your original payment method. Please allow additional time for your bank or credit card company to process the refund and show it in your account.',
      category: FAQCategory.RETURNS,
      productId: null,
      order: 3,
      is_active: true,
    },

    // Warranty FAQs
    {
      question: 'What warranty do you offer on your products?',
      answer:
        "All our products come with a manufacturer's warranty ranging from 1-3 years depending on the product category. Furniture items typically have a 2-3 year warranty covering defects in materials and workmanship. Electronics have a 1-2 year warranty. Warranty terms are specified on each product page. Please keep your receipt as proof of purchase.",
      category: FAQCategory.WARRANTY,
      productId: null,
      order: 1,
      is_active: true,
    },
    {
      question: 'How do I make a warranty claim?',
      answer:
        'If you believe your product has a defect covered under warranty, please contact our customer service team with your order number, product details, photos of the issue, and a description of the problem. We will review your claim and may request additional information. If approved, we will repair, replace, or refund the item as appropriate.',
      category: FAQCategory.WARRANTY,
      productId: null,
      order: 2,
      is_active: true,
    },

    // Payment FAQs
    {
      question: 'What payment methods do you accept?',
      answer:
        'We accept all major credit cards (Visa, Mastercard, American Express), PayPal, Apple Pay, Google Pay, and bank transfers for larger orders. All payments are processed securely through encrypted payment gateways. We do not store your full credit card information on our servers for security reasons.',
      category: FAQCategory.PAYMENT,
      productId: null,
      order: 1,
      is_active: true,
    },
    {
      question: 'Is my payment information secure?',
      answer:
        'Yes, absolutely. We use industry-standard SSL encryption to protect your payment information during transmission. All payment processing is handled by trusted third-party payment processors (Stripe, PayPal) that are PCI DSS compliant. We never have access to your complete credit card number after the transaction is processed.',
      category: FAQCategory.PAYMENT,
      productId: null,
      order: 2,
      is_active: true,
    },
    {
      question: 'Do you offer payment plans or financing?',
      answer:
        'Yes, we offer financing options through Affirm and Klarna for qualifying orders over $500. You can choose to pay in installments with 0% APR for qualified customers. Financing approval is subject to credit check. Select the financing option at checkout to see if you qualify.',
      category: FAQCategory.PAYMENT,
      productId: null,
      order: 3,
      is_active: true,
    },

    // General FAQs
    {
      question: 'How do I create an account?',
      answer:
        'Creating an account is easy! Click on "Sign Up" or "Create Account" at the top of our website. You\'ll need to provide your name, email address, and create a password. Once registered, you can track orders, save your shipping addresses, create wishlists, and enjoy faster checkout.',
      category: FAQCategory.GENERAL,
      productId: null,
      order: 1,
      is_active: true,
    },
    {
      question: 'How can I contact customer service?',
      answer:
        'You can reach our customer service team via email at support@example.com, phone at 1-800-EXAMPLE (Monday-Friday, 9 AM-6 PM EST), or through live chat on our website. We typically respond within 24 hours. For urgent matters, please call our phone line during business hours.',
      category: FAQCategory.GENERAL,
      productId: null,
      order: 2,
      is_active: true,
    },
    {
      question: 'Do you offer assembly services?',
      answer:
        'Yes, we offer professional assembly services for furniture items in select areas. Assembly service can be added at checkout for an additional fee. Our certified technicians will assemble your furniture and remove all packaging materials. Please check availability in your area during checkout.',
      category: FAQCategory.GENERAL,
      productId: null,
      order: 3,
      is_active: true,
    },
    {
      question: 'What if my item arrives damaged?',
      answer:
        'If your item arrives damaged, please contact us within 48 hours of delivery. Take photos of the damaged packaging and product, and we will arrange for a replacement or full refund at no cost to you. We may request that you return the damaged item, and we will cover all return shipping costs.',
      category: FAQCategory.GENERAL,
      productId: null,
      order: 4,
      is_active: true,
    },
    {
      question: 'Can I modify or cancel my order after placing it?',
      answer:
        "You can modify or cancel your order within 2 hours of placing it if it hasn't entered the fulfillment process. After this window, please contact customer service immediately - we'll do our best to accommodate your request, but cannot guarantee changes once processing has begun. Orders that have shipped cannot be modified or cancelled.",
      category: FAQCategory.GENERAL,
      productId: null,
      order: 5,
      is_active: true,
    },
  ];

  // Create global FAQs
  for (const faqData of faqs) {
    await prisma.fAQ.create({
      data: faqData,
    });
    console.log(`✅ Created FAQ: ${faqData.question.substring(0, 50)}...`);
  }

  // Create product-related FAQs (generic, not tied to specific products)
  const productFAQs = [
    {
      question: 'What are the assembly requirements for furniture items?',
      answer:
        'Most furniture items require basic assembly with included hardware and instructions. Estimated assembly time varies by product (typically 30-90 minutes). All necessary tools are included unless otherwise stated. For assembly assistance, we offer professional assembly services available at checkout for an additional fee. Detailed assembly instructions and video guides are available on each product page.',
      category: FAQCategory.PRODUCT_POLICY,
      productId: null, // Generic product FAQ
      order: 1,
      is_active: true,
    },
    {
      question: 'How do I care for and maintain my furniture?',
      answer:
        'For best results, clean your furniture regularly with a soft, damp cloth and mild soap. Avoid harsh chemicals, abrasive cleaners, and excessive moisture. Use coasters and placemats to protect surfaces from heat and spills. Regular maintenance will help preserve the finish and extend the life of your furniture. Specific care instructions are included with each product or available on the product page.',
      category: FAQCategory.PRODUCT_POLICY,
      productId: null,
      order: 2,
      is_active: true,
    },
    {
      question: 'What dimensions should I measure before purchasing furniture?',
      answer:
        'Please measure your space carefully before ordering. Ensure you have adequate clearance for doorways (at least 32 inches wide), hallways, and the intended room. Consider ceiling height, existing furniture placement, traffic flow, and door swing radius. Measure twice and use our room planner tool or contact customer service for assistance with space planning.',
      category: FAQCategory.PRODUCT_POLICY,
      productId: null,
      order: 3,
      is_active: true,
    },
    {
      question: 'How long does it take to deliver furniture?',
      answer:
        'Standard furniture delivery typically takes 5-14 business days depending on the item size and your location. Large items may require additional time for processing and delivery. Express delivery (2-3 business days) is available for select items for an additional fee. You will receive tracking information once your order ships. Delivery times are estimates and may vary during peak seasons.',
      category: FAQCategory.SHIPPING,
      productId: null,
      order: 4,
      is_active: true,
    },
    {
      question: 'What if my furniture arrives damaged or defective?',
      answer:
        'If your furniture arrives damaged or defective, please contact us within 48 hours of delivery. Take photos of the damage and packaging, and we will arrange for a replacement or full refund at no cost to you. We may request that you return the damaged item, and we will cover all return shipping costs. Our quality guarantee ensures you receive furniture in perfect condition.',
      category: FAQCategory.PRODUCT_POLICY,
      productId: null,
      order: 5,
      is_active: true,
    },
    {
      question: 'Can I return customized or personalized furniture?',
      answer:
        'Customized, personalized, or made-to-order furniture items cannot be returned unless they arrive damaged or defective. Standard furniture items can be returned within 30 days of delivery in their original condition and packaging. Please review the product description carefully before ordering customized items, as these are non-returnable for change of mind.',
      category: FAQCategory.RETURNS,
      productId: null,
      order: 6,
      is_active: true,
    },
    {
      question: 'What warranty coverage do furniture items have?',
      answer:
        'Furniture items come with manufacturer warranties ranging from 1-5 years depending on the product type and brand. Warranties cover defects in materials and workmanship under normal use. Structural defects are covered for the full warranty period, while fabric and finish may have shorter coverage periods. Warranty details are specified on each product page. Please keep your receipt as proof of purchase.',
      category: FAQCategory.WARRANTY,
      productId: null,
      order: 7,
      is_active: true,
    },
    {
      question: 'How can I track my furniture delivery?',
      answer:
        "Once your furniture order ships, you will receive an email with a tracking number and carrier information. You can track your shipment on our website using the order number or on the carrier's website using the tracking number. For large furniture items, you may receive a call from the delivery team to schedule a convenient delivery time. Check your email and spam folder for tracking updates.",
      category: FAQCategory.SHIPPING,
      productId: null,
      order: 8,
      is_active: true,
    },
    {
      question: 'What payment methods are accepted for furniture purchases?',
      answer:
        'We accept all major credit cards (Visa, Mastercard, American Express), PayPal, Apple Pay, Google Pay, and bank transfers for larger orders. For furniture purchases over $500, we also offer financing options through Affirm and Klarna with 0% APR for qualified customers. All payments are processed securely through encrypted payment gateways. Select your preferred payment method at checkout.',
      category: FAQCategory.PAYMENT,
      productId: null,
      order: 9,
      is_active: true,
    },
    {
      question: 'Do you offer installation services for furniture?',
      answer:
        'Yes, we offer professional installation and assembly services for furniture items in select areas. Installation service can be added at checkout for an additional fee. Our certified technicians will assemble your furniture, ensure everything is properly set up, and remove all packaging materials. Installation availability varies by location - please check during checkout if service is available in your area.',
      category: FAQCategory.GENERAL,
      productId: null,
      order: 10,
      is_active: true,
    },
  ];

  for (const faqData of productFAQs) {
    await prisma.fAQ.create({
      data: faqData,
    });
    console.log(
      `✅ Created Product FAQ: ${faqData.question.substring(0, 50)}...`,
    );
  }

  console.log(
    `\n✨ FAQ seed completed! Created ${faqs.length + productFAQs.length} FAQs (${faqs.length} global + ${productFAQs.length} product-related).`,
  );

  // Create customer users
  console.log('\n👤 Creating customer users...');
  const saltRounds = 10;

  const customerUsers = [
    {
      email: 'john.doe@example.com',
      userName: 'johndoe',
      password: 'Customer123',
      name: 'John Doe',
      phone: '+84123456789',
      address: '123 Main Street, District 1, Ho Chi Minh City',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    },
    {
      email: 'jane.smith@example.com',
      userName: 'janesmith',
      password: 'Customer123',
      name: 'Jane Smith',
      phone: '+84987654321',
      address: '456 Park Avenue, District 3, Ho Chi Minh City',
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    },
    {
      email: 'michael.johnson@example.com',
      userName: 'michaelj',
      password: 'Customer123',
      name: 'Michael Johnson',
      phone: '+84111222333',
      address: '789 Ocean Drive, District 7, Ho Chi Minh City',
      avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    },
    {
      email: 'sarah.williams@example.com',
      userName: 'sarahw',
      password: 'Customer123',
      name: 'Sarah Williams',
      phone: '+84444555666',
      address: '321 Garden Street, District 2, Ho Chi Minh City',
      avatar:
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    },
    {
      email: 'david.brown@example.com',
      userName: 'davidb',
      password: 'Customer123',
      name: 'David Brown',
      phone: '+84777888999',
      address: '654 Mountain Road, District 10, Ho Chi Minh City',
      avatar:
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
    },
    {
      email: 'emily.davis@example.com',
      userName: 'emilyd',
      password: 'Customer123',
      name: 'Emily Davis',
      phone: '+84112233445',
      address: '987 River Lane, District 5, Ho Chi Minh City',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    },
    {
      email: 'robert.miller@example.com',
      userName: 'robertm',
      password: 'Customer123',
      name: 'Robert Miller',
      phone: '+84555666777',
      address: '147 Sunset Boulevard, Binh Thanh District, Ho Chi Minh City',
      avatar:
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400',
    },
    {
      email: 'lisa.wilson@example.com',
      userName: 'lisaw',
      password: 'Customer123',
      name: 'Lisa Wilson',
      phone: '+84888999000',
      address: '258 Forest Avenue, Tan Binh District, Ho Chi Minh City',
      avatar:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
    },
  ];

  const createdUsers: Array<{
    id: string;
    email: string;
    userName: string;
    name: string | null;
    password: string; // Plain text password for documentation
  }> = [];

  for (const userData of customerUsers) {
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        userName: userData.userName,
        password: hashedPassword,
        name: userData.name,
        role: UserRole.USER,
        is_active: true,
        phone: userData.phone,
        address: userData.address,
        avatar: userData.avatar,
      },
    });
    createdUsers.push({
      id: user.id,
      email: user.email,
      userName: user.userName,
      name: user.name,
      password: userData.password, // Store plain text for documentation
    });
    console.log(`✅ Created user: ${user.email} (${user.userName})`);
  }

  // Save user credentials to file
  const credentialsPath = path.join(process.cwd(), 'seed-credentials.json');
  const credentialsData = {
    generated_at: new Date().toISOString(),
    note: 'These are test user credentials for development/testing. All passwords are: Customer123',
    users: createdUsers.map((u) => ({
      email: u.email,
      username: u.userName,
      password: u.password,
      name: u.name,
    })),
  };
  fs.writeFileSync(
    credentialsPath,
    JSON.stringify(credentialsData, null, 2),
    'utf-8',
  );
  console.log(`\n📝 User credentials saved to: ${credentialsPath}`);

  // Get all created products for reviews (re-fetch after products were created)
  const allProductsForReviews = await prisma.product.findMany({
    select: { id: true, name: true },
  });

  let reviewCount = 0;

  if (allProductsForReviews.length === 0) {
    console.log('⚠️  No products found. Skipping reviews creation.');
  } else {
    // Create reviews for products
    console.log('\n⭐ Creating reviews...');

    const reviewComments = [
      'Excellent product! Very satisfied with the quality and delivery.',
      'Great value for money. Highly recommend!',
      'Good quality, but shipping took longer than expected.',
      'Perfect! Exceeded my expectations.',
      'Nice product, good build quality. Would buy again.',
      'Very happy with this purchase. Fast shipping too!',
      'Quality is okay, but could be better for the price.',
      'Amazing product! Love it!',
      'Good product overall, minor issues but acceptable.',
      'Outstanding quality and service. 5 stars!',
      'Pretty good, meets my needs well.',
      'Excellent craftsmanship and design.',
      'Solid product, worth the investment.',
      'Very pleased with this purchase!',
      'Great product, excellent customer service.',
      'Good quality, fast delivery, no complaints.',
      'Beautiful design and high quality materials.',
      'Satisfied customer! Will order again.',
      'Good value, well-made product.',
      'Perfect addition to my home!',
    ];

    // Create reviews for each product (2-4 reviews per product)
    for (const product of allProductsForReviews) {
      const numReviews = Math.floor(Math.random() * 3) + 2; // 2-4 reviews per product
      const shuffledUsers = [...createdUsers].sort(() => Math.random() - 0.5);

      for (let i = 0; i < Math.min(numReviews, createdUsers.length); i++) {
        const user = shuffledUsers[i];
        const rating = Math.floor(Math.random() * 2) + 4; // 4-5 stars (positive reviews)
        const comment =
          reviewComments[Math.floor(Math.random() * reviewComments.length)];

        try {
          await prisma.review.create({
            data: {
              productId: product.id,
              userId: user.id,
              rating,
              comment,
            },
          });
          reviewCount++;
        } catch (error) {
          // Skip if user already has a review for this product (unique constraint)
          console.log(
            `⚠️  Skipping duplicate review for user ${user.email} on product ${product.name}`,
          );
        }
      }
    }

    // Recalculate product ratings
    console.log('🔄 Recalculating product ratings...');
    for (const product of allProductsForReviews) {
      const reviews = await prisma.review.findMany({
        where: { productId: product.id },
        select: { rating: true },
      });

      if (reviews.length > 0) {
        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = totalRating / reviews.length;
        const roundedRating = Math.round(avgRating * 10) / 10; // Round to 1 decimal

        await prisma.product.update({
          where: { id: product.id },
          data: {
            stars_evaluation: roundedRating,
            rating_count: reviews.length,
          },
        });
      }
    }

    console.log(
      `✅ Created ${reviewCount} reviews and updated product ratings`,
    );
  }

  console.log(`\n🎉 All seed data completed successfully!`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Products: ${allProductsForReviews.length}`);
  console.log(`   - Users: ${createdUsers.length}`);
  console.log(`   - Reviews: ${reviewCount}`);
  console.log(`   - FAQs: ${faqs.length + productFAQs.length}`);
  console.log(
    `\n💡 User credentials saved to: seed-credentials.json (Password: Customer123 for all users)`,
  );
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
