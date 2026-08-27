import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { productInclude, serializeProduct } from "@/lib/product";
import { parseGenre } from "@/lib/genre";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = parseGenre(searchParams.get("genre"));

  if (genre === null) {
    return NextResponse.json({ error: "Invalid genre" }, { status: 422 });
  }

  const where: Prisma.ProductWhereInput = { status: 1, rating: { gt: 4 } };
  if (genre) where.genre = genre;

  const items = await db.product.findMany({
    where,
    orderBy: [{ rating: "desc" }, { soldCount: "desc" }],
    take: 8,
    include: productInclude,
  });

  return NextResponse.json({ items: items.map(serializeProduct) });
}
