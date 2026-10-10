import { z } from "zod";

export const foodStandInterestSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120),
  age: z.number().int().min(1, "Enter your age.").max(120),
  phone: z.string().trim().min(7, "Enter a phone number.").max(40),
  state_zip: z.string().trim().min(3, "Enter your state and ZIP code.").max(120),
  referral: z.string().trim().max(2000),
  receive_updates: z.boolean(),
});

export type FoodStandInterest = z.infer<typeof foodStandInterestSchema>;

// User input must remain plain text inside the notification email.
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]!));

export function foodStandInterestEmail(input: FoodStandInterest, email: string) {
  const fields = [
    ["Name", input.name], ["Email", email], ["Age", String(input.age)],
    ["Phone", input.phone], ["State & ZIP code", input.state_zip],
    ["How they heard about the opportunity", input.referral || "Not provided"],
    ["Wants volunteer opportunity and event updates", input.receive_updates ? "Yes" : "No"],
  ];
  return `<h1>New food stand interest</h1>${fields.map(([label, value]) =>
    `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>`
  ).join("")}`;
}
