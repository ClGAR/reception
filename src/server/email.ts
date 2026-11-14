import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Email delivery. Without RESEND_API_KEY + EMAIL_FROM (default) this is a DRY RUN: nothing leaves the
// machine, the message is printed to the server console so a developer can follow links locally.
// EMAIL_CAPTURE_FILE (tests only) appends every message as a JSON line so E2E tests can read links.
export async function sendEmail(msg: EmailMessage) {
  capture(msg);
  // Never deliver to reserved/fictional domains, even when a provider is configured.
  if (/@(example\.(com|org|net)|[^@]*\.test|[^@]*\.example|[^@]*\.invalid)$/i.test(msg.to)) {
    console.info(`[email:dry-run] fictional address, not sent: subject="${msg.subject}"`);
    return { delivered: false as const, mode: "dry-run" as const };
  }
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.info(`[email:dry-run] to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
    return { delivered: false as const, mode: "dry-run" as const };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html }),
  });
  if (!res.ok) throw new Error(`Resend failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return { delivered: true as const, mode: "resend" as const };
}

function capture(msg: EmailMessage) {
  const file = process.env.EMAIL_CAPTURE_FILE;
  if (!file) return;
  try {
    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, JSON.stringify({ at: new Date().toISOString(), to: msg.to, subject: msg.subject, text: msg.text }) + "\n");
  } catch (e) {
    console.warn("[email:capture] failed", e);
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * One plain, readable layout for every email: big text, one blue button, details as a short list.
 * Returns both the text and HTML versions.
 */
export function emailLayout(opts: {
  heading: string;
  intro: string;
  details?: [string, string][];
  button?: { label: string; url: string };
  footer?: string;
}) {
  const lines = [
    opts.heading,
    "",
    opts.intro,
    ...(opts.details?.length ? ["", ...opts.details.map(([k, v]) => `${k}: ${v}`)] : []),
    ...(opts.button ? ["", `${opts.button.label}: ${opts.button.url}`] : []),
    ...(opts.footer ? ["", opts.footer] : []),
  ];
  const rows = (opts.details ?? [])
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#536471;font-size:15px;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;color:#0f1419;font-size:15px">${esc(v)}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html><body style="margin:0;background:#f5f7fa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e6eaee;border-radius:16px">
<tr><td style="padding:28px 28px 8px"><div style="display:inline-block;background:#4d6bfe;color:#fff;font-weight:600;font-size:13px;border-radius:8px;padding:5px 9px">Reception</div></td></tr>
<tr><td style="padding:12px 28px 0"><h1 style="margin:0;font-size:24px;line-height:1.25;color:#0f1419">${esc(opts.heading)}</h1></td></tr>
<tr><td style="padding:12px 28px 0;font-size:16px;line-height:1.55;color:#2f3a45">${esc(opts.intro)}</td></tr>
${rows ? `<tr><td style="padding:16px 28px 0"><table role="presentation" cellpadding="0" cellspacing="0">${rows}</table></td></tr>` : ""}
${opts.button ? `<tr><td style="padding:24px 28px 0"><a href="${esc(opts.button.url)}" style="display:inline-block;background:#3555f0;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;border-radius:10px;padding:13px 22px">${esc(opts.button.label)}</a></td></tr>` : ""}
<tr><td style="padding:24px 28px 28px;font-size:13px;line-height:1.5;color:#536471">${esc(opts.footer ?? "Sent by Reception.")}</td></tr>
</table></td></tr></table></body></html>`;
  return { text: lines.join("\n"), html };
}
