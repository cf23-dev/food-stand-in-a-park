// Shared domain types. These mirror the Supabase schema in supabase/schema.sql.

export type UserRole = "donor" | "volunteer" | "admin";
export type PickupStatus = "open" | "claimed" | "completed" | "cancelled";

export interface Profile {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  approved: boolean;
  notify_radius_miles: number;
  created_at: string;
}

export interface FoodBank {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  website: string | null;
  hours: string | null;
  accepted_types: string[];
  created_at: string;
}

export interface PickupRequest {
  id: string;
  donor_name: string;
  donor_email: string;
  donor_phone: string | null;
  address: string;
  latitude: number;
  longitude: number;
  food_type: string;
  quantity: string | null;
  quantity_lbs: number | null;
  notes: string | null;
  earliest_pickup: string | null;
  latest_pickup: string | null;
  status: PickupStatus;
  suggested_food_bank_id: string | null;
  created_at: string;
}

export interface VolunteerClaim {
  id: string;
  volunteer_id: string;
  pickup_id: string;
  food_bank_id: string | null;
  delivery_photo_url: string | null;
  claimed_at: string;
  completed_at: string | null;
  reminder_sent_at: string | null;
}

export interface Feedback {
  id: string;
  pickup_id: string | null;
  donor_email: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  volunteer_id: string;
  pickup_id: string | null;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

// A pickup joined with its claim + suggested food bank, as used in the UI.
export interface PickupWithDetails extends PickupRequest {
  claim?: VolunteerClaim | null;
  suggested_food_bank?: FoodBank | null;
  distance_miles?: number;
}

export const FOOD_TYPES = [
  "Produce",
  "Canned Goods",
  "Dairy",
  "Bread & Bakery",
  "Frozen",
  "Prepared Meals",
  "Dry Goods",
  "Other",
] as const;
