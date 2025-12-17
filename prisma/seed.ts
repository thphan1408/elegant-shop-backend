import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import slugify from 'slugify';
import * as dotenv from 'dotenv';

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
  await prisma.productVariant.deleteMany({});
  await prisma.product.deleteMany({});

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
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&h=600&fit=crop',
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
            'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=400&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&h=600&fit=crop',
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
            'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&h=400&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&h=600&fit=crop',
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
        'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
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
            'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=600&h=400&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=800&h=600&fit=crop',
          ],
        },
        {
          color: 'Espresso',
          colorHex: '#3B2F2F',
          sku: 'CT-ESPRESSO-001',
          price: 299.99,
          quantity: 18,
          image:
            'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=400&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
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
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600&fit=crop',
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
            'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=400&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
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
            'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=400&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600&fit=crop',
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
        'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&h=600&fit=crop',
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
            'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600&h=400&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&h=600&fit=crop',
          ],
        },
        {
          color: 'Dusty Rose',
          colorHex: '#B78B84',
          sku: 'AC-VELVET-ROSE-001',
          price: 349.99,
          quantity: 12,
          image:
            'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=600&h=400&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&h=600&fit=crop',
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
        'https://images.unsplash.com/photo-1631889993954-3d17d8c3a58e?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&h=600&fit=crop',
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
            'https://images.unsplash.com/photo-1631889993954-3d17d8c3a58e?w=600&h=400&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1631889993954-3d17d8c3a58e?w=800&h=600&fit=crop',
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
            'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=600&h=400&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&h=600&fit=crop',
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
        'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1631889993954-3d17d8c3a58e?w=800&h=600&fit=crop',
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
            'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=600&h=400&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&h=600&fit=crop',
          ],
        },
        {
          color: 'Charcoal',
          colorHex: '#36454F',
          sku: 'DRS-6-CHARCOAL-001',
          price: 479.99,
          quantity: 10,
          image:
            'https://images.unsplash.com/photo-1631889993954-3d17d8c3a58e?w=600&h=400&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1631889993954-3d17d8c3a58e?w=800&h=600&fit=crop',
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
        'https://images.unsplash.com/photo-1631889993954-3d17d8c3a58e?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&h=600&fit=crop',
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
            'https://images.unsplash.com/photo-1631889993954-3d17d8c3a58e?w=600&h=400&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1631889993954-3d17d8c3a58e?w=800&h=600&fit=crop',
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
            'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=600&h=400&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&h=600&fit=crop',
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
        'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1556912173-48e7a0c93e7e?w=800&h=600&fit=crop',
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
            'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=600&h=400&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1556912173-48e7a0c93e7e?w=800&h=600&fit=crop',
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
            'https://images.unsplash.com/photo-1556912173-48e7a0c93e7e?w=600&h=400&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1556912173-48e7a0c93e7e?w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&h=600&fit=crop',
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
        'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&h=600&fit=crop',
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
            'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&h=400&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&h=600&fit=crop',
          ],
        },
        {
          color: 'Natural Oak',
          colorHex: '#D2B48C',
          sku: 'DT-SET-OAK-001',
          price: 1199.99,
          quantity: 7,
          image:
            'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=600&h=400&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&h=600&fit=crop',
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
        'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&h=600&fit=crop',
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
            'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=600&h=400&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=800&h=600&fit=crop',
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
            'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=600&h=400&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&h=600&fit=crop',
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

  console.log(`\n✨ Seed completed! Created ${products.length} products.`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
