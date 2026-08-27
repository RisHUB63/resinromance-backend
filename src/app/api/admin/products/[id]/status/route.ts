import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthPayload, unauthorized, forbidden } from "@/lib/auth";
import { productStatusSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = getAuthPayload(request);
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return forbidden();

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = productStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const product = await db.product.update({
      where: { id: params.id },
      data: { status: parsed.data.status },
      select: { id: true, name: true, status: true },
    });
    return NextResponse.json({ product });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    console.error("Product status update failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
