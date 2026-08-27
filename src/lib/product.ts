import type { Category, Product, ProductDiscount, ProductImage } from "@prisma/client";

type ProductWithRelations = Product & {
  images: ProductImage[];
  discount: ProductDiscount | null;
  category: Category;
};

export function serializeProduct(product: ProductWithRelations) {
  const now = new Date();
  const discount = product.discount;
  const isDiscountActive =
    !!discount &&
    discount.isActive &&
    (!discount.startsAt || discount.startsAt <= now) &&
    (!discount.endsAt || discount.endsAt >= now);

  const price = Number(product.price);
  const discountPercent = isDiscountActive ? Number(discount!.discountPercent) : 0;
  const effectivePrice = isDiscountActive
    ? Number((price * (1 - discountPercent / 100)).toFixed(2))
    : price;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    status: product.status,
    rating: Number(product.rating),
    reviewCount: product.reviewCount,
    soldCount: product.soldCount,
    price,
    effectivePrice,
    discountPercent,
    genre: product.genre,
    category: {
      id: product.category.id,
      name: product.category.name,
      slug: product.category.slug,
    },
    images: product.images
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((img) => ({ id: img.id, imageUrl: img.imageUrl, sortOrder: img.sortOrder })),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export const productInclude = {
  images: true,
  discount: true,
  category: true,
} as const;
