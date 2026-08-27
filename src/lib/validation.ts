import { z } from "zod";

const phoneRegex = /^\+?[0-9]{7,15}$/;

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
    email: z.string().trim().toLowerCase().email("Invalid email address"),
    phone: z.string().trim().regex(phoneRegex, "Invalid phone number"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or phone number is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const genreEnum = z.enum(["MALE", "FEMALE", "GIFT"]);

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  slug: z.string().trim().toLowerCase().regex(slugRegex, "Slug must be lowercase letters, numbers, and hyphens"),
  genre: genreEnum,
  imageUrl: z.string().trim().url("Invalid image URL").optional(),
  displayOrder: z.number().int().optional(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

export const productCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  slug: z.string().trim().toLowerCase().regex(slugRegex, "Slug must be lowercase letters, numbers, and hyphens"),
  description: z.string().trim().min(1, "Description is required"),
  price: z.number().positive("Price must be greater than 0"),
  categoryId: z.string().min(1, "categoryId is required"),
  images: z.array(z.string().trim().url("Invalid image URL")).min(1, "At least one image is required").max(4, "At most 4 images allowed"),
  discountPercent: z.number().min(0).max(100).optional(),
});

export const productUpdateSchema = productCreateSchema.partial();

export const productStatusSchema = z.object({
  status: z.union([z.literal(0), z.literal(1), z.literal(2)], {
    errorMap: () => ({ message: "status must be 0 (inactive), 1 (active), or 2 (out of stock)" }),
  }),
});
