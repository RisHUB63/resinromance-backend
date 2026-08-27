import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productInclude, serializeProduct } from "@/lib/product";

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const product = await db.product.findUnique({
    where: { slug: params.slug },
    include: productInclude,
  });

  if (!product || product.status === 0) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ product: serializeProduct(product) });
}
