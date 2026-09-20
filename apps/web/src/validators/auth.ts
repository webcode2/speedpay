import { z } from "zod";

export const registerSchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.string().email(),
  ),
  password: z.string().min(12, "Password must be at least 12 characters"),
  phone: z.string().trim().min(7).max(20).nullish(),
});

export const loginSchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.string().email(),
  ),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.string().email(),
  ),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(12, "Password must be at least 12 characters"),
});
