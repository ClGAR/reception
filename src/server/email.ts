// Email delivery. Without RESEND_API_KEY (default) this is a DRY RUN: nothing leaves the machine,
// the message is printed to the server console so a developer can follow links locally.
export async function sendEmail(msg: { to: string; subject: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.info(`[email:dry-run] to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
    return { delivered: false as const, mode: "dry-run" as const };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: msg.to, subject: msg.subject, text: msg.text }),
  });
  if (!res.ok) throw new Error(`Resend failed: ${res.status}`);
  return { delivered: true as const, mode: "resend" as const };
}
