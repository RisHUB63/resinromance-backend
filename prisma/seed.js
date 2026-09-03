// Seeds one admin user and the category set the frontend nav expects.
// Run with: npm run prisma:seed  (or `node prisma/seed.js`)
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const db = new PrismaClient();

const ADMIN_EMAIL = "admin@resinromance.com";
const ADMIN_PHONE = "+910000000000";
const ADMIN_PASSWORD = "Admin@12345";

// Mirrors resinromance-frontend/lib/data/categories.ts. Kept in sync by hand
// since the two repos don't share code; slugs are genre-prefixed here to
// stay globally unique (Category.genre is single-valued) — the frontend
// never sees this prefix, it keeps using its own unprefixed URL slugs.
const CATEGORIES = [
  { slug: "bracelets", name: "Bracelets", segments: ["men", "women"] },
  { slug: "necklaces", name: "Necklaces", segments: ["men", "women"] },
  { slug: "earrings", name: "Earrings", segments: ["men", "women"] },
  { slug: "rings", name: "Rings", segments: ["men", "women"] },
  { slug: "anklets", name: "Anklets", segments: ["women"] },
  { slug: "nose-rings", name: "Nose Rings", segments: ["women"] },
  { slug: "hair-pins", name: "Hair Pins", segments: ["women"] },
  { slug: "keychains", name: "Keychains", segments: ["gift"] },
  { slug: "paperweights", name: "Paperweights", segments: ["gift"] },
  { slug: "home-decor", name: "Home Decor", segments: ["gift"] },
  { slug: "stationery", name: "Stationery", segments: ["gift"] },
  { slug: "watches", name: "Watch Accents", segments: ["gift", "men"] },
];

const GENRE_BY_SEGMENT = { men: "MALE", women: "FEMALE", gift: "GIFT" };

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await db.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      fullName: "Store Admin",
      email: ADMIN_EMAIL,
      phone: ADMIN_PHONE,
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`Admin user ready: ${admin.email}`);

  let displayOrder = 0;
  for (const category of CATEGORIES) {
    for (const segment of category.segments) {
      const genre = GENRE_BY_SEGMENT[segment];
      const slug = `${segment}-${category.slug}`;
      await db.category.upsert({
        where: { slug },
        update: { name: category.name, genre, displayOrder },
        create: { name: category.name, slug, genre, displayOrder },
      });
      displayOrder += 1;
    }
  }
  console.log("Categories seeded.");

  console.log("\nSeed complete.");
  console.log(`Admin login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
