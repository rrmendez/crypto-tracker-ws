export const MAIL_PROVIDER_NAMES = {
  SENDGRID: 'sendgrid',
} as const;

export type MailProviderName =
  (typeof MAIL_PROVIDER_NAMES)[keyof typeof MAIL_PROVIDER_NAMES];
