import { z } from "zod";

// Donor pickup request submission (public form).
export const pickupRequestSchema = z
  .object({
    donor_name: z.string().min(1, "Name is required").max(120),
    donor_email: z.string().email("Enter a valid email"),
    donor_phone: z.string().max(40).optional().or(z.literal("")),
    address: z.string().min(5, "Enter a full pickup address").max(300),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    food_type: z.string().min(1, "Select a food type"),
    quantity: z.string().max(120).optional().or(z.literal("")),
    quantity_lbs: z.coerce.number().nonnegative().optional(),
    notes: z.string().max(1000).optional().or(z.literal("")),
    earliest_pickup: z.string().optional().or(z.literal("")),
    latest_pickup: z.string().optional().or(z.literal("")),
  })
  .refine(
    (d) =>
      !d.earliest_pickup ||
      !d.latest_pickup ||
      new Date(d.latest_pickup) >= new Date(d.earliest_pickup),
    { message: "Latest pickup must be after earliest pickup", path: ["latest_pickup"] }
  );

export type PickupRequestInput = z.infer<typeof pickupRequestSchema>;

export const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email(),
  password: z.string().min(8, "Use at least 8 characters"),
  address: z.string().max(300).optional().or(z.literal("")),
});

export const feedbackSchema = z.object({
  pickup_id: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(2000).optional().or(z.literal("")),
});

export const foodBankSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(5),
  // Optional — when omitted, the API geocodes the address to fill these in.
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  phone: z.string().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  hours: z.string().optional().or(z.literal("")),
  accepted_types: z.array(z.string()).default([]),
});
