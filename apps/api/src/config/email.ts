export const emailConfig = {
  get resendApiKey() {
    return process.env.RESEND_API_KEY || '';
  },
  get from() {
    return process.env.EMAIL_FROM || 'onboarding@resend.dev';
  },
};

export function isEmailConfigured(): boolean {
  return !!emailConfig.resendApiKey;
}
