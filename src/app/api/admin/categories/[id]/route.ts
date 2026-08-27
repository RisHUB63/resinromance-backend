import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthPayload, unauthorized, forbidden } from "@/lib/auth";
import { categoryUpdateSchema } from "@/lib/validation";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = getAuthPayload(request);
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return forbidden();

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = categoryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const category = await db.category.update({ where: { id: params.id }, data: parsed.data });
    return NextResponse.json({ category });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
      if (err.code === "P2002") {
        return NextResponse.json({ error: "A category with this slug already exists" }, { status: 409 });
      }
    }
    console.error("Category update failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = getAuthPayload(request);
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return forbidden();

  try {
    await db.category.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
      if (err.code === "P2003") {
        return NextResponse.json(
          { error: "Cannot delete a category that still has products" },
          { status: 409 }
        );
      }
    }
    console.error("Category deletion failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
