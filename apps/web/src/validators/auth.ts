import { z } from "zod";

export const registerSchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.string().email(),
  ),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().trim().min(7).max(20).nullish(),
  inviteCode: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().min(1).max(16).nullish(),
  ),
});

export const loginSchema = z
  .object({
    email: z.string().optional(),
    phone: z.string().optional(),
    identifier: z.string().optional(),
    password: z.string().min(1, "Password is required"),
  })
  .refine((data) => Boolean(data.email || data.phone || data.identifier), {
    message: "Phone number or email is required",
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
