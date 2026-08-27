import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { signAuthToken } from "@/lib/jwt";
import { signupSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not configured");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { fullName, email, phone, password } = parsed.data;

  try {
    const existing = await db.user.findFirst({
      where: { OR: [{ email }, { phone }] },
      select: { email: true, phone: true },
    });
    if (existing) {
      const field = existing.email === email ? "email" : "phone";
      return NextResponse.json(
        { error: `An account with this ${field} already exists` },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await db.user.create({
      data: { fullName, email, phone, passwordHash },
      select: { id: true, fullName: true, email: true, phone: true, role: true, createdAt: true },
    });

    const token = signAuthToken({ userId: user.id, role: user.role });

    return NextResponse.json({ user, token }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "An account with this email or phone already exists" }, { status: 409 });
    }
    console.error("Signup failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
