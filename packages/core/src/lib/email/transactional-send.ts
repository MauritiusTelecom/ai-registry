import { sendEmail, type SendEmailInput } from "../email";

/**
 * Non-blocking transactional send. Never throws; failures are logged.
 * API routes stay 200/202 even if SMTP is down.
 */
export function sendTransactionalEmail(context: string, input: SendEmailInput): void {
  void sendEmail(input).catch((err) => {
    console.error(`email.transactional_failed.${context}`, err);
  });
}

export function sendTransactionalEmailAll(
  context: string,
  recipients: string[],
  build: (to: string) => SendEmailInput
): void {
  for (const to of recipients) {
    sendTransactionalEmail(context, build(to));
  }
}
