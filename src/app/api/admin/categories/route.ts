import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthPayload, unauthorized, forbidden } from "@/lib/auth";
import { categoryCreateSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const auth = getAuthPayload(request);
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return forbidden();

  const categories = await db.category.findMany({
    orderBy: [{ genre: "asc" }, { displayOrder: "asc" }],
  });

  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const auth = getAuthPayload(request);
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return forbidden();

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = categoryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const category = await db.category.create({ data: parsed.data });
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "A category with this slug already exists" }, { status: 409 });
    }
    console.error("Category creation failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
