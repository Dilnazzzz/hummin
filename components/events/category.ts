import type { Category } from "@/lib/db/schema";

export const CATEGORY_LABEL: Record<Category, string> = {
  wellness: "Wellness",
  food: "Food and drink",
  art: "Art and making",
  music: "Music",
  community: "Community",
  fitness: "Fitness",
  learning: "Learning",
};

/** Tailwind classes for the category tint (bg + ink text). */
export const CATEGORY_TINT: Record<Category, string> = {
  wellness: "bg-cat-wellness text-cat-wellness-ink",
  food: "bg-cat-food text-cat-food-ink",
  art: "bg-cat-art text-cat-art-ink",
  music: "bg-cat-music text-cat-music-ink",
  community: "bg-cat-community text-cat-community-ink",
  fitness: "bg-cat-fitness text-cat-fitness-ink",
  learning: "bg-cat-learning text-cat-learning-ink",
};

/** Hex pairs for places Tailwind classes can't reach (map pins). */
export const CATEGORY_HEX: Record<Category, { bg: string; ink: string }> = {
  wellness: { bg: "#DCEBDF", ink: "#1E3A28" },
  food: { bg: "#FBE3D4", ink: "#6B2E12" },
  art: { bg: "#E3E0FB", ink: "#2E2870" },
  music: { bg: "#D8EAF8", ink: "#123E62" },
  community: { bg: "#F6E9C6", ink: "#5A4205" },
  fitness: { bg: "#E0F0F4", ink: "#0F4452" },
  learning: { bg: "#F3E1EC", ink: "#5E1F45" },
};
