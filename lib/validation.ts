import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.string().trim().email("Invalid email address").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200)
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const paperCreateSchema = z.object({
  title: z.string().trim().min(3).max(500),
  abstract: z.string().trim().min(20),
  publication_year: z.number().int().min(1950).max(2100),
  venue: z.string().trim().max(255).optional().nullable(),
  doi: z.string().trim().max(255).optional().nullable(),
  url: z.string().trim().url().max(500).optional().nullable(),
  category_id: z.number().int().positive().optional().nullable(),
  authors: z
    .array(z.object({ name: z.string().trim().min(1), affiliation: z.string().trim().optional() }))
    .min(1, "At least one author is required"),
});

export const paperUpdateSchema = paperCreateSchema.partial();

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(300),
  mode: z.enum(["keyword", "semantic", "hybrid"]).default("hybrid"),
  category: z.coerce.number().int().positive().optional(),
  year: z.coerce.number().int().optional(),
  author: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const interactionSchema = z.object({
  paperId: z.number().int().positive(),
  type: z.enum(["VIEW", "LIKE", "SAVE"]),
});

export const idParamSchema = z.coerce.number().int().positive();
