export function buildBrevoPayload(input: { mode: "sandbox" | "live"; senderEmail: string; recipient: string; subject: string; text: string; html: string }) {
  return {
    sender: { name: "Tee-Time", email: input.senderEmail },
    to: [{ email: input.recipient, name: "Restaurant" }],
    subject: input.subject,
    textContent: input.text,
    htmlContent: input.html,
    tags: ["tee-time", input.mode],
    headers: input.mode === "sandbox" ? { "X-Sib-Sandbox": "drop" } : undefined,
  };
}
