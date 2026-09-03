import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { productInclude, serializeProduct } from "@/lib/product";
import { parseGenre } from "@/lib/genre";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = parseGenre(searchParams.get("genre"));
  const categorySlug = searchParams.get("category");
  const sort = searchParams.get("sort");
  const idsParam = searchParams.get("ids");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "20") || 20));

  if (genre === null) {
    return NextResponse.json({ error: "Invalid genre" }, { status: 422 });
  }

  // Batched lookup by id, used to resolve cart/wishlist lines. Bypasses the
  // status filter so a product stays resolvable even if it's later marked
  // inactive/out of stock — mirrors the old mock store's selectProductById.
  if (idsParam) {
    const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
    const items = ids.length
      ? await db.product.findMany({ where: { id: { in: ids } }, include: productInclude })
      : [];
    return NextResponse.json({ items: items.map(serializeProduct) });
  }

  const where: Prisma.ProductWhereInput = { status: 1 };
  if (genre) where.genre = genre;
  if (categorySlug) where.category = { slug: categorySlug };

  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
  if (sort === "price_asc") orderBy = { price: "asc" };
  else if (sort === "price_desc") orderBy = { price: "desc" };
  else if (sort === "top_rated") orderBy = { rating: "desc" };
  else if (sort === "featured") orderBy = { soldCount: "desc" };

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: productInclude,
    }),
    db.product.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map(serializeProduct),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}
