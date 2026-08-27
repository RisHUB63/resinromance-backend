import type { Genre } from "@prisma/client";

const GENRE_ALIASES: Record<string, Genre> = {
  men: "MALE",
  man: "MALE",
  male: "MALE",
  women: "FEMALE",
  woman: "FEMALE",
  female: "FEMALE",
  gift: "GIFT",
  gifts: "GIFT",
};

/** Accepts the public-facing values (men/women/gift) and the raw enum values, case-insensitively. */
export function parseGenre(value: string | null): Genre | undefined | null {
  if (!value) return undefined;
  const normalized = GENRE_ALIASES[value.trim().toLowerCase()];
  return normalized ?? null;
}
