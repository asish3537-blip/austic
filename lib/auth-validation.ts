import { z } from "zod";

export const passwordSchema = z.string()
  .min(12, "Use at least 12 characters.")
  .max(72, "Use 72 characters or fewer.")
  .refine((value) => new TextEncoder().encode(value).length <= 72, "Use 72 bytes or fewer.")
  .regex(/[a-z]/, "Add a lowercase letter.")
  .regex(/[A-Z]/, "Add an uppercase letter.")
  .regex(/[0-9]/, "Add a number.");

export const registrationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(24),
  otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code sent to your phone."),
  role: z.enum(["CUSTOMER", "MOTHER", "DELIVERY_AGENT"]),
  addressLine1: z.string().trim().min(3).max(160),
  locality: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  pinCode: z.string().trim().regex(/^[0-9A-Za-z -]{4,12}$/),
  kitchenName: z.string().trim().max(120).optional(),
  cuisine: z.string().trim().max(80).optional(),
  vehicleType: z.string().trim().max(40).optional(),
}).refine((value) => value.role !== "MOTHER" || Boolean(value.kitchenName && value.kitchenName.length >= 2), {
  message: "Add your kitchen name.",
  path: ["kitchenName"],
}).refine((value) => value.role !== "MOTHER" || Boolean(value.cuisine && value.cuisine.length >= 2), {
  message: "Add your main cuisine.",
  path: ["cuisine"],
}).refine((value) => value.role !== "DELIVERY_AGENT" || Boolean(value.vehicleType && value.vehicleType.length >= 2), {
  message: "Choose or enter a vehicle type.",
  path: ["vehicleType"],
});

export const loginSchema = z.object({
  phone: z.string().trim().min(7).max(24),
  otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code sent to your phone."),
});

export const otpRequestSchema = z.object({
  phone: z.string().trim().min(7).max(24),
  purpose: z.enum(["signup", "login"]),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  password: passwordSchema,
});

export const emailSchema = z.object({ email: z.string().trim().email().max(254) });
