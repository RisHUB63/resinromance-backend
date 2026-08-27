import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { parseGenre } from "@/lib/genre";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = parseGenre(searchParams.get("genre"));
  const limitParam = searchParams.get("limit");

  if (genre === null) {
    return NextResponse.json({ error: "Invalid genre" }, { status: 422 });
  }

  const where: Prisma.CategoryWhereInput = {};
  if (genre) where.genre = genre;

  const limit = limitParam ? Math.min(50, Math.max(1, Number(limitParam))) : undefined;

  const categories = await db.category.findMany({
    where,
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    take: limit,
  });

  return NextResponse.json({ categories });
}
