export interface EmailProvider {
  name: string;
  sendEmail(
    to: string,
    subject: string,
    text: string,
    html?: string,
  ): Promise<boolean>;
  sendWelcomeEmail?(to: string, name: string): Promise<boolean>;
  sendPasswordResetEmail?(
    to: string,
    token: string,
    frontendUrl: string,
  ): Promise<boolean>;
  sendSecondFactorRecoveryEmail?(
    to: string,
    token: string,
    frontendUrl: string,
  ): Promise<boolean>;
}

export const EMAIL_PROVIDER = 'EMAIL_PROVIDER';
