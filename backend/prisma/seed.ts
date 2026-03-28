import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient, Role, TableStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ── Clean in dependency order ────────────────────────────
  await prisma.notification.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.tableSession.deleteMany();
  await prisma.table.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.restaurant.deleteMany();

  // ── Restaurant ───────────────────────────────────────────
  await prisma.restaurant.create({
    data: {
      name: 'La Maison',
      description: 'Fine dining with a modern twist on classic cuisine',
      address: '123 Gourmet Street, Downtown',
      phone: '+1 (555) 123-4567',
      email: 'info@lamaison.com',
      //currency: 'USD',
      currency: 'JOD',

      isOpen: true,
    },
  });

  // ── Users ────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const staffHash = await bcrypt.hash('Staff@123', 10);

  await prisma.user.createMany({
    data: [
      { email: 'admin@lamaison.com',   password: adminHash, name: 'Admin User',         role: Role.SUPER_ADMIN, isActive: true },
      { email: 'manager@lamaison.com', password: adminHash, name: 'Restaurant Manager',  role: Role.ADMIN,       isActive: true },
      { email: 'staff@lamaison.com',   password: staffHash, name: 'Staff Member',        role: Role.STAFF,       isActive: true },
    ],
  });

  // ── Tables ───────────────────────────────────────────────
  const tableData = [
    { number: 1,  label: 'Table 1',  capacity: 2, floor: 'Main Hall'   },
    { number: 2,  label: 'Table 2',  capacity: 4, floor: 'Main Hall'   },
    { number: 3,  label: 'Table 3',  capacity: 4, floor: 'Main Hall'   },
    { number: 4,  label: 'Table 4',  capacity: 6, floor: 'Main Hall'   },
    { number: 5,  label: 'Table 5',  capacity: 2, floor: 'Terrace'     },
    { number: 6,  label: 'Table 6',  capacity: 4, floor: 'Terrace'     },
    { number: 7,  label: 'Table 7',  capacity: 8, floor: 'Private Room' },
    { number: 8,  label: 'Table 8',  capacity: 4, floor: 'Bar Area'    },
    { number: 9,  label: 'Table 9',  capacity: 2, floor: 'Bar Area'    },
    { number: 10, label: 'Table 10', capacity: 6, floor: 'Terrace'     },
  ];

  for (const t of tableData) {
    await prisma.table.create({ data: t });
  }

  // ── Categories ───────────────────────────────────────────
  const [appetizers, soups, mains, pasta, desserts, drinks] = await Promise.all([
    prisma.category.create({ data: { name: 'Appetizers',      nameAr: 'المقبلات',          nameFr: 'Entrées',              description: 'Start with our crafted starters',          sortOrder: 1 } }),
    prisma.category.create({ data: { name: 'Soups & Salads',  nameAr: 'الشوربات والسلطات', nameFr: 'Soupes & Salades',     description: 'Fresh, healthy, and full of flavor',        sortOrder: 2 } }),
    prisma.category.create({ data: { name: 'Main Course',     nameAr: 'الأطباق الرئيسية', nameFr: 'Plats Principaux',     description: 'Signature dishes with the finest ingredients', sortOrder: 3 } }),
    prisma.category.create({ data: { name: 'Pasta & Risotto', nameAr: 'المعكرونة والريزوتو', nameFr: 'Pâtes & Risotto',  description: 'Italian-inspired comfort food',             sortOrder: 4 } }),
    prisma.category.create({ data: { name: 'Desserts',        nameAr: 'الحلويات',          nameFr: 'Desserts',             description: 'Sweet endings to a perfect meal',           sortOrder: 5 } }),
    prisma.category.create({ data: { name: 'Beverages',       nameAr: 'المشروبات',         nameFr: 'Boissons',             description: 'Curated drink selection',                   sortOrder: 6 } }),
  ]);

  // ── Menu Items ───────────────────────────────────────────
  await prisma.menuItem.createMany({
    data: [
      // Appetizers
      { categoryId: appetizers.id, name: 'Bruschetta al Pomodoro',  nameAr: 'بروسكيتا الطماطم',     nameFr: 'Bruschetta à la Tomate',         description: 'Toasted bread with fresh tomatoes, basil, garlic, and extra virgin olive oil', price: 9.95,  calories: 180, preparationTime: 10, tags: ['vegetarian','vegan'],   allergens: ['gluten'],          isAvailable: true, isFeatured: false, sortOrder: 1 },
      { categoryId: appetizers.id, name: 'Burrata with Prosciutto', nameAr: 'بوراتا مع البروشوتو',  nameFr: 'Burrata au Prosciutto',           description: 'Creamy burrata with thin-sliced prosciutto, arugula, and balsamic glaze',      price: 18.95, calories: 420, preparationTime: 8,  tags: ['gluten-free'],          allergens: ['dairy'],           isAvailable: true, isFeatured: true,  sortOrder: 2 },
      { categoryId: appetizers.id, name: 'Calamari Fritti',         nameAr: 'كاليماري مقلي',         nameFr: 'Calamars Frits',                  description: 'Crispy fried squid rings with lemon aioli and marinara sauce',                  price: 14.95, calories: 380, preparationTime: 12, tags: [],                       allergens: ['gluten','seafood','eggs'], isAvailable: true, isFeatured: false, sortOrder: 3 },
      { categoryId: appetizers.id, name: 'Wild Mushroom Crostini',  nameAr: 'كروستيني الفطر البري',  nameFr: 'Crostini aux Champignons',        description: 'Sautéed wild mushrooms with thyme, goat cheese, and truffle oil on crostini',  price: 13.95, calories: 290, preparationTime: 10, tags: ['vegetarian'],            allergens: ['gluten','dairy'],  isAvailable: true, isFeatured: true,  sortOrder: 4 },
      // Soups & Salads
      { categoryId: soups.id,      name: 'French Onion Soup',       nameAr: 'شوربة البصل الفرنسية',  nameFr: "Soupe à l'Oignon Gratinée",       description: 'Slow-cooked onion soup topped with Gruyère and toasted baguette',               price: 11.95, calories: 320, preparationTime: 8,  tags: ['vegetarian'],            allergens: ['gluten','dairy'],  isAvailable: true, isFeatured: false, sortOrder: 1 },
      { categoryId: soups.id,      name: 'Caesar Salad',            nameAr: 'سلطة سيزار',            nameFr: 'Salade César',                    description: 'Romaine, house-made Caesar dressing, Parmesan shavings, croutons, anchovies',   price: 13.95, calories: 340, preparationTime: 8,  tags: [],                       allergens: ['gluten','dairy','fish','eggs'], isAvailable: true, isFeatured: true, sortOrder: 2 },
      { categoryId: soups.id,      name: 'Mediterranean Salad',     nameAr: 'سلطة متوسطية',          nameFr: 'Salade Méditerranéenne',           description: 'Mixed greens, cherry tomatoes, kalamata olives, feta, cucumber, lemon vinaigrette', price: 12.95, calories: 220, preparationTime: 8, tags: ['vegetarian','gluten-free'], allergens: ['dairy'], isAvailable: true, isFeatured: false, sortOrder: 3 },
      // Mains
      { categoryId: mains.id,      name: 'Grilled Atlantic Salmon', nameAr: 'سلمون أطلنطي مشوي',     nameFr: 'Saumon Atlantique Grillé',        description: 'Pan-seared salmon with lemon butter sauce, asparagus, and seasonal vegetables',  price: 32.95, calories: 520, preparationTime: 20, tags: ['gluten-free'],          allergens: ['fish','dairy'],    isAvailable: true, isFeatured: true,  sortOrder: 1 },
      { categoryId: mains.id,      name: 'Beef Tenderloin (8oz)',   nameAr: 'لحم بقري طري',          nameFr: 'Filet de Bœuf (225g)',            description: 'Prime beef tenderloin with red wine reduction, roasted garlic mash, haricot verts', price: 48.95, calories: 680, preparationTime: 25, tags: ['gluten-free'],          allergens: ['dairy'],           isAvailable: true, isFeatured: true,  sortOrder: 2 },
      { categoryId: mains.id,      name: 'Herb-Roasted Chicken',    nameAr: 'دجاج مشوي بالأعشاب',    nameFr: 'Poulet Rôti aux Herbes',          description: 'Free-range chicken with rosemary jus, truffle mash, and glazed root vegetables',  price: 28.95, calories: 580, preparationTime: 22, tags: ['gluten-free'],          allergens: ['dairy'],           isAvailable: true, isFeatured: false, sortOrder: 3 },
      { categoryId: mains.id,      name: 'Wild Mushroom Wellington', nameAr: 'ويلينغتون الفطر البري', nameFr: 'Wellington aux Champignons',      description: 'Portobello Wellington with puff pastry, spinach, and red wine sauce',            price: 26.95, calories: 490, preparationTime: 25, tags: ['vegetarian'],            allergens: ['gluten','dairy'],  isAvailable: true, isFeatured: false, sortOrder: 4 },
      { categoryId: mains.id,      name: 'Pan-Seared Duck Breast',  nameAr: 'صدر بط محمر',           nameFr: 'Magret de Canard Poêlé',          description: 'Crispy duck breast with cherry gastrique, roasted beets, and pommes sarladaises', price: 38.95, calories: 620, preparationTime: 25, tags: ['gluten-free'],          allergens: [],                  isAvailable: true, isFeatured: true,  sortOrder: 5 },
      // Pasta
      { categoryId: pasta.id,      name: 'Tagliatelle al Ragù',     nameAr: 'تالياتيلي مع الراغو',   nameFr: 'Tagliatelles au Ragù',            description: 'Slow-cooked beef and pork ragù with fresh egg tagliatelle and Parmigiano',       price: 22.95, calories: 620, preparationTime: 18, tags: [],                       allergens: ['gluten','dairy','eggs'], isAvailable: true, isFeatured: true, sortOrder: 1 },
      { categoryId: pasta.id,      name: 'Truffle Risotto',         nameAr: 'ريزوتو الكمأة',         nameFr: 'Risotto à la Truffe',             description: 'Carnaroli rice with black truffle, Parmesan, and mascarpone',                    price: 28.95, calories: 540, preparationTime: 22, tags: ['vegetarian','gluten-free'], allergens: ['dairy'], isAvailable: true, isFeatured: true, sortOrder: 2 },
      { categoryId: pasta.id,      name: 'Seafood Linguine',        nameAr: 'لينغويني بالمأكولات البحرية', nameFr: 'Linguine aux Fruits de Mer', description: 'Clams, mussels, shrimp, and squid in white wine and cherry tomato sauce',        price: 26.95, calories: 480, preparationTime: 20, tags: [],                       allergens: ['gluten','seafood'], isAvailable: true, isFeatured: false, sortOrder: 3 },
      // Desserts
      { categoryId: desserts.id,   name: 'Chocolate Fondant',       nameAr: 'كيك الشوكولاتة المنصهرة', nameFr: 'Fondant au Chocolat',           description: 'Warm dark chocolate lava cake with vanilla ice cream and raspberry coulis',       price: 12.95, calories: 520, preparationTime: 15, tags: ['vegetarian'],            allergens: ['gluten','dairy','eggs'], isAvailable: true, isFeatured: true, sortOrder: 1 },
      { categoryId: desserts.id,   name: 'Classic Tiramisu',        nameAr: 'تيراميسو كلاسيكي',      nameFr: 'Tiramisu Classique',              description: 'Espresso-soaked ladyfingers with mascarpone cream and cocoa',                    price: 10.95, calories: 440, preparationTime: 5,  tags: ['vegetarian'],            allergens: ['gluten','dairy','eggs'], isAvailable: true, isFeatured: true, sortOrder: 2 },
      { categoryId: desserts.id,   name: 'Crème Brûlée',           nameAr: 'كريم بروليه',           nameFr: 'Crème Brûlée',                   description: 'Classic vanilla custard with a perfectly caramelized sugar crust',               price: 9.95,  calories: 380, preparationTime: 5,  tags: ['vegetarian','gluten-free'], allergens: ['dairy','eggs'], isAvailable: true, isFeatured: false, sortOrder: 3 },
      // Beverages
      { categoryId: drinks.id,     name: 'Sparkling Water',         nameAr: 'مياه غازية',            nameFr: 'Eau Pétillante',                  description: '750ml San Pellegrino sparkling mineral water',                                   price: 4.95,  calories: 0,   preparationTime: 2,  tags: ['vegan','gluten-free'],   allergens: [],                  isAvailable: true, isFeatured: false, sortOrder: 1 },
      { categoryId: drinks.id,     name: 'Fresh Orange Juice',      nameAr: 'عصير برتقال طازج',       nameFr: "Jus d'Orange Frais",              description: 'Freshly squeezed orange juice',                                                  price: 5.95,  calories: 120,  preparationTime: 5,  tags: ['vegan','gluten-free'],   allergens: [],                  isAvailable: true, isFeatured: false, sortOrder: 2 },
      { categoryId: drinks.id,     name: 'Espresso',                nameAr: 'إسبريسو',               nameFr: 'Espresso',                        description: 'Double shot of house blend espresso',                                            price: 3.95,  calories: 5,   preparationTime: 3,  tags: ['vegan','gluten-free'],   allergens: [],                  isAvailable: true, isFeatured: false, sortOrder: 3 },
      { categoryId: drinks.id,     name: 'Cappuccino',              nameAr: 'كابتشينو',              nameFr: 'Cappuccino',                       description: 'Espresso with steamed milk foam',                                                price: 5.95,  calories: 120,  preparationTime: 5,  tags: ['vegetarian'],            allergens: ['dairy'],           isAvailable: true, isFeatured: true,  sortOrder: 4 },
      { categoryId: drinks.id,     name: 'House Red Wine (Glass)',  nameAr: 'نبيذ أحمر (كأس)',        nameFr: 'Vin Rouge Maison (Verre)',        description: 'Selected house red wine by the glass',                                           price: 9.95,  calories: 125,  preparationTime: 2,  tags: ['vegan','gluten-free'],   allergens: ['sulfites'],        isAvailable: true, isFeatured: false, sortOrder: 5 },
    ],
  });

  console.log('✅ Database seeded successfully!');
  console.log('');
  console.log('👤 Admin credentials:');
  console.log('   Email:    admin@lamaison.com');
  console.log('   Password: Admin@123');
  console.log('');
  console.log('📊 Created: 1 restaurant | 3 users | 10 tables | 6 categories | 22 menu items');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
