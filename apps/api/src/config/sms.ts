export const smsConfig = {
  get twilioAccountSid() {
    return process.env.TWILIO_ACCOUNT_SID || '';
  },
  get twilioAuthToken() {
    return process.env.TWILIO_AUTH_TOKEN || '';
  },
  get twilioFromNumber() {
    return process.env.TWILIO_FROM_NUMBER || '';
  },
};

export function isSmsConfigured(): boolean {
  return (
    !!smsConfig.twilioAccountSid &&
    !!smsConfig.twilioAuthToken &&
    !!smsConfig.twilioFromNumber
  );
}

