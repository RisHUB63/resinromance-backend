import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthPayload, unauthorized, forbidden } from "@/lib/auth";
import { productCreateSchema } from "@/lib/validation";
import { productInclude, serializeProduct } from "@/lib/product";
import { parseGenre } from "@/lib/genre";

export async function GET(request: Request) {
  const auth = getAuthPayload(request);
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return forbidden();

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const statusParam = searchParams.get("status");
  const genre = parseGenre(searchParams.get("genre"));
  const categoryId = searchParams.get("categoryId");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20") || 20));

  if (genre === null) {
    return NextResponse.json({ error: "Invalid genre" }, { status: 422 });
  }

  const where: Prisma.ProductWhereInput = {};
  if (name) where.name = { contains: name, mode: "insensitive" };
  if (statusParam !== null && statusParam !== "") {
    const status = Number(statusParam);
    if (![0, 1, 2].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 422 });
    }
    where.status = status;
  }
  if (genre) where.genre = genre;
  if (categoryId) where.categoryId = categoryId;

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
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

export async function POST(request: Request) {
  const auth = getAuthPayload(request);
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return forbidden();

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = productCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { name, slug, description, price, categoryId, images, discountPercent } = parsed.data;

  const category = await db.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    return NextResponse.json({ error: "categoryId does not reference an existing category" }, { status: 422 });
  }

  try {
    const product = await db.product.create({
      data: {
        name,
        slug,
        description,
        price,
        categoryId,
        genre: category.genre,
        images: {
          create: images.map((imageUrl, index) => ({ imageUrl, sortOrder: index })),
        },
        discount:
          discountPercent && discountPercent > 0
            ? { create: { discountPercent, isActive: true } }
            : undefined,
      },
      include: productInclude,
    });

    return NextResponse.json({ product: serializeProduct(product) }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "A product with this slug already exists" }, { status: 409 });
    }
    console.error("Product creation failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
