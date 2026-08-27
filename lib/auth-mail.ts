import "server-only";

import { Resend } from "resend";

// This mirrors the sendViaResend logic in the shared @andershauch/mail package
// (D:\Projects\SMTP PLugin\mail-package). It is vendored here rather than
// imported because that package isn't published to a registry yet — Vercel's
// build can't reach a sibling folder on this machine. Once it's published to
// GitHub Packages, this file can be replaced by an import from it; the
// function shapes below were kept close to that package on purpose.

export type NeonAuthLinkType = "sign-in" | "email-verification" | "forget-password";

function requireEnv(name: "RESEND_API_KEY" | "AUTH_MAIL_FROM_NAME" | "AUTH_MAIL_FROM_ADDRESS") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required to send authentication email.`);
  return value;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function layout(fromName: string, bodyHtml: string) {
  return `<div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
    <p style="font-size: 14px; letter-spacing: 0.04em; text-transform: uppercase; color: #6b7280;">${escapeHtml(fromName)}</p>
    ${bodyHtml}
    <p style="font-size: 13px; color: #6b7280; margin-top: 32px;">Har du ikke selv bedt om denne mail, kan du roligt ignorere den.</p>
  </div>`;
}

function subjectForLink(linkType: NeonAuthLinkType) {
  switch (linkType) {
    case "forget-password": return "Nulstil din adgangskode";
    case "email-verification": return "Bekræft din e-mailadresse";
    case "sign-in": return "Dit sikre login-link";
  }
}

function introForLink(linkType: NeonAuthLinkType) {
  switch (linkType) {
    case "forget-password": return "Du (eller en administrator) har bedt om at nulstille adgangskoden til din Tee-Time-konto. Klik herunder for at vælge en ny adgangskode.";
    case "email-verification": return "Bekræft din e-mailadresse for at aktivere din Tee-Time-konto.";
    case "sign-in": return "Brug linket herunder for at logge ind på Tee-Time.";
  }
}

let client: Resend | undefined;
function getClient() {
  client ??= new Resend(requireEnv("RESEND_API_KEY"));
  return client;
}

/** Sent when Neon Auth fires a `send.magic_link` webhook event (password reset, email verification, or magic-link sign-in). */
export async function sendAuthLinkEmail(input: { to: string; linkType: NeonAuthLinkType; linkUrl: string }) {
  const fromName = requireEnv("AUTH_MAIL_FROM_NAME");
  const fromAddress = requireEnv("AUTH_MAIL_FROM_ADDRESS");
  const subject = subjectForLink(input.linkType);
  const html = layout(fromName, `
    <h1 style="font-size: 20px;">${escapeHtml(subject)}</h1>
    <p>${escapeHtml(introForLink(input.linkType))}</p>
    <p style="margin: 24px 0;"><a href="${escapeHtml(input.linkUrl)}" style="display: inline-block; background: #14532d; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px;">Fortsæt</a></p>
    <p style="font-size: 13px; color: #6b7280;">Virker knappen ikke? Kopiér dette link:<br />${escapeHtml(input.linkUrl)}</p>
  `);
  const { error } = await getClient().emails.send({ from: `${fromName} <${fromAddress}>`, to: input.to, subject, html });
  if (error) throw new Error(`auth_mail_send_failed: ${error.message}`);
}

/** Sent when Neon Auth fires a `send.otp` webhook event. */
export async function sendAuthOtpEmail(input: { to: string; otpCode: string }) {
  const fromName = requireEnv("AUTH_MAIL_FROM_NAME");
  const fromAddress = requireEnv("AUTH_MAIL_FROM_ADDRESS");
  const subject = "Din bekræftelseskode";
  const html = layout(fromName, `
    <h1 style="font-size: 20px;">${escapeHtml(subject)}</h1>
    <p style="font-size: 32px; letter-spacing: 0.3em; background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center;">${escapeHtml(input.otpCode)}</p>
    <p>Koden udløber om kort tid.</p>
  `);
  const { error } = await getClient().emails.send({ from: `${fromName} <${fromAddress}>`, to: input.to, subject, html });
  if (error) throw new Error(`auth_mail_send_failed: ${error.message}`);
}
