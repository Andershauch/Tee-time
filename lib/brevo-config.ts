export type BrevoDeliveryMode = "disabled" | "sandbox" | "live";

export function getBrevoDeliveryMode(): BrevoDeliveryMode {
  const value = process.env.BREVO_DELIVERY_MODE?.trim().toLowerCase();
  if (value === "sandbox" || value === "live") return value;
  // A missing or misspelled setting must never turn into a live delivery.
  return "disabled";
}

export function configuredBrevoRecipient(mode = getBrevoDeliveryMode()) {
  const value = mode === "sandbox"
    ? process.env.BREVO_SANDBOX_RECIPIENT
    : process.env.RESTAURANT_NOTIFICATION_EMAIL;
  return value?.trim().toLowerCase() || null;
}
