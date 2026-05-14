/**
 * Stand-alone SMTP smoke test. Verifies the configured SMTP server accepts
 * the configured credentials, and optionally sends one real test message.
 *
 * Usage:
 *   tsx scripts/test-smtp.ts                # verify connection + auth only
 *   tsx scripts/test-smtp.ts you@example    # also send a test message to that address
 *
 * Reads from .env (project root). Override per-invocation with env vars on
 * the command line, e.g.:
 *
 *   SMTP_USER=other@example.com SMTP_PASS='different' tsx scripts/test-smtp.ts
 *
 * Prints the full SMTP conversation (logger: true, debug: true) so any
 * 535 / 530 / 550 response from the server is visible verbatim. Use this
 * any time email sending in the app misbehaves to confirm whether SMTP
 * itself is OK or the app's env is stale.
 */

import { config as loadDotenv } from "dotenv";
import nodemailer from "nodemailer";

loadDotenv();

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT ?? "587");
const secure = (process.env.SMTP_SECURE ?? "false").toLowerCase() === "true";
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.EMAIL_FROM ?? process.env.MAIL_FROM ?? user;
const senderName = process.env.EMAIL_SENDER_NAME ?? "SMTP test";

const to = process.argv[2];

if (!host || !user || !pass) {
  console.error("✗ Missing SMTP_HOST / SMTP_USER / SMTP_PASS in .env or shell env");
  process.exit(1);
}

console.log("─── SMTP config ─────────────────────────────────");
console.log(`  host:   ${host}`);
console.log(`  port:   ${port}`);
console.log(`  secure: ${secure}`);
console.log(`  user:   ${user}`);
console.log(`  pass:   ${JSON.stringify(pass).slice(0, 3)}…${JSON.stringify(pass).slice(-3)}  (${pass.length} chars)`);
console.log(`  from:   ${from}`);
console.log(to ? `  to:     ${to}` : `  to:     (verify only - pass an address as the first arg to send a message)`);
console.log("─────────────────────────────────────────────────");

const transport = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
  logger: true,
  debug: true
});

async function main() {
  console.log("\n▸ verifying connection + auth …");
  await transport.verify();
  console.log("✓ connection + auth OK");

  if (!to) return;

  console.log(`\n▸ sending test message → ${to} …`);
  const info = await transport.sendMail({
    from: `"${senderName}" <${from}>`,
    to,
    subject: `[smtp-test] from ${user} at ${new Date().toISOString()}`,
    text:
      `If you see this, scripts/test-smtp.ts can send mail via this SMTP server.\n\n` +
      `host = ${host}:${port} (secure=${secure})\n` +
      `user = ${user}\n` +
      `from = ${from}\n` +
      `time = ${new Date().toISOString()}\n`
  });
  console.log(`✓ sent. messageId = ${info.messageId}`);
}

main()
  .catch((err) => {
    console.error("\n✗ FAILED");
    console.error(err?.message ?? err);
    process.exit(1);
  })
  .finally(() => {
    transport.close();
  });
