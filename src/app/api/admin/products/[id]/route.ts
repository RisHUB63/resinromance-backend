import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthPayload, unauthorized, forbidden } from "@/lib/auth";
import { productUpdateSchema } from "@/lib/validation";
import { productInclude, serializeProduct } from "@/lib/product";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = getAuthPayload(request);
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return forbidden();

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = productUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { name, slug, description, price, categoryId, images, discountPercent } = parsed.data;

  const existing = await db.product.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  let genre = existing.genre;
  if (categoryId) {
    const category = await db.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return NextResponse.json({ error: "categoryId does not reference an existing category" }, { status: 422 });
    }
    genre = category.genre;
  }

  try {
    const product = await db.$transaction(async (tx) => {
      if (images) {
        await tx.productImage.deleteMany({ where: { productId: params.id } });
      }

      if (discountPercent !== undefined) {
        if (discountPercent > 0) {
          await tx.productDiscount.upsert({
            where: { productId: params.id },
            create: { productId: params.id, discountPercent, isActive: true },
            update: { discountPercent, isActive: true },
          });
        } else {
          await tx.productDiscount.deleteMany({ where: { productId: params.id } });
        }
      }

      return tx.product.update({
        where: { id: params.id },
        data: {
          name,
          slug,
          description,
          price,
          categoryId,
          genre,
          images: images ? { create: images.map((imageUrl, index) => ({ imageUrl, sortOrder: index })) } : undefined,
        },
        include: productInclude,
      });
    });

    return NextResponse.json({ product: serializeProduct(product) });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
      if (err.code === "P2002") {
        return NextResponse.json({ error: "A product with this slug already exists" }, { status: 409 });
      }
    }
    console.error("Product update failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = getAuthPayload(request);
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return forbidden();

  try {
    await db.product.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    console.error("Product deletion failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
