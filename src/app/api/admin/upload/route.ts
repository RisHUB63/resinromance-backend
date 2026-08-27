import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getAuthPayload, unauthorized, forbidden } from "@/lib/auth";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export async function POST(request: Request) {
  const auth = getAuthPayload(request);
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return forbidden();

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("BLOB_READ_WRITE_TOKEN is not configured");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "A 'file' field is required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "File must be JPEG, PNG, WEBP, or AVIF" }, { status: 422 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File must be 5MB or smaller" }, { status: 422 });
  }

  const blob = await put(`products/${Date.now()}-${file.name}`, file, {
    access: "public",
    contentType: file.type,
  });

  return NextResponse.json({ url: blob.url }, { status: 201 });
}
