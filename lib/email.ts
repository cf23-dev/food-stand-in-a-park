// Transactional email via Resend. Degrades gracefully to console logging
// when RESEND_API_KEY is not configured (e.g. local dev without a key).

import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM || "Food Stand in a Park <onboarding@resend.dev>";
// Treat an empty value or a leftover .env.example placeholder as "not configured".
const resend = apiKey && !apiKey.startsWith("your-") ? new Resend(apiKey) : null;

interface SendArgs {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendArgs): Promise<void> {
  if (!resend) {
    console.log(`[email:dev] to=${to} subject="${subject}"`);
    return;
  }
  try {
    // The Resend SDK returns { data, error } rather than throwing on API errors.
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) {
      console.error(`sendEmail rejected (to=${to}):`, error);
    } else {
      console.log(`[email] sent to=${to} subject="${subject}"`);
    }
  } catch (err) {
    // Network-level failure — never let it break the request flow.
    console.error("sendEmail failed:", err);
  }
}

const wrap = (inner: string) => `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
    <div style="background:#15803d;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
      <h1 style="margin:0;font-size:18px">🥕 Food Stand in a Park</h1>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px">
      ${inner}
    </div>
  </div>`;

export function donorConfirmationEmail(args: {
  donorName: string;
  foodType: string;
  address: string;
}) {
  return wrap(`
    <p>Hi ${args.donorName},</p>
    <p>Thank you for your donation! We've received your pickup request and it's now
    <strong>open</strong> for a volunteer to claim.</p>
    <ul>
      <li><strong>Food type:</strong> ${args.foodType}</li>
      <li><strong>Pickup address:</strong> ${args.address}</li>
    </ul>
    <p>We'll email you again as soon as a volunteer accepts your pickup. 💚</p>
  `);
}

export function donorClaimedEmail(args: { donorName: string; volunteerName: string }) {
  return wrap(`
    <p>Hi ${args.donorName},</p>
    <p>Good news — <strong>${args.volunteerName}</strong> has accepted your donation
    pickup and will be in touch about timing.</p>
    <p>Thank you for helping your community get fed. 💚</p>
  `);
}

export function volunteerNotifyEmail(args: {
  foodType: string;
  address: string;
  url: string;
  milesAway: string;
}) {
  return wrap(`
    <p>A new pickup is available <strong>${args.milesAway}</strong> from you:</p>
    <ul>
      <li><strong>Food type:</strong> ${args.foodType}</li>
      <li><strong>Location:</strong> ${args.address}</li>
    </ul>
    <p><a href="${args.url}" style="display:inline-block;background:#15803d;color:#fff;
    padding:10px 18px;border-radius:8px;text-decoration:none">View &amp; claim pickup</a></p>
  `);
}

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#15803d;color:#fff;
   padding:10px 18px;border-radius:8px;text-decoration:none">${label}</a>`;

// Reminder ~2 hours before the pickup window. Wording adapts to recipient.
export function pickupReminderEmail(args: {
  role: "volunteer" | "donor";
  name?: string;
  foodType: string;
  address: string;
  windowText?: string;
}) {
  const intro =
    args.role === "volunteer"
      ? `This is a reminder that you have a pickup coming up in about 2 hours.`
      : `This is a reminder that a volunteer is scheduled to pick up your donation in about 2 hours.`;
  const action =
    args.role === "volunteer"
      ? `<p>Please head out in time, and thank you for volunteering! 💚</p>`
      : `<p>Please have your donation ready for pickup. Thank you for giving! 💚</p>`;
  return wrap(`
    <p>Hi${args.name ? ` ${args.name}` : ""},</p>
    <p>${intro}</p>
    <ul>
      <li><strong>Food type:</strong> ${args.foodType}</li>
      <li><strong>Address:</strong> ${args.address}</li>
      ${args.windowText ? `<li><strong>Pickup window:</strong> ${args.windowText}</li>` : ""}
    </ul>
    ${action}
  `);
}

// Sent to the donor after a pickup is completed, asking for feedback.
export function donorFeedbackRequestEmail(args: {
  donorName: string;
  foodType: string;
  url: string;
}) {
  return wrap(`
    <p>Hi ${args.donorName},</p>
    <p>Your <strong>${args.foodType}</strong> donation was picked up and delivered to a
    local food bank — thank you for keeping good food out of the trash! 🥕</p>
    <p>We'd love to hear how it went. It takes 30 seconds and helps us improve:</p>
    <p>${button(args.url, "Leave quick feedback")}</p>
  `);
}

// Internal notification to the nonprofit when feedback comes in.
export function adminFeedbackEmail(args: {
  rating: number;
  comment: string;
  donorEmail: string;
  foodType: string;
}) {
  return wrap(`
    <p><strong>New donor feedback received.</strong></p>
    <ul>
      <li><strong>Rating:</strong> ${"★".repeat(args.rating)}${"☆".repeat(5 - args.rating)} (${args.rating}/5)</li>
      <li><strong>Food type:</strong> ${args.foodType}</li>
      <li><strong>Donor:</strong> ${args.donorEmail}</li>
    </ul>
    ${args.comment ? `<p><strong>Comment:</strong><br>${args.comment}</p>` : "<p><em>No comment left.</em></p>"}
  `);
}
