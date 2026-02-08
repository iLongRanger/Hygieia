export const companyConfig = {
  get name() {
    return process.env.COMPANY_NAME || 'Hygieia Cleaning Services';
  },
  get address() {
    return process.env.COMPANY_ADDRESS || '';
  },
  get phone() {
    return process.env.COMPANY_PHONE || '';
  },
  get email() {
    return process.env.COMPANY_EMAIL || '';
  },
  get website() {
    return process.env.COMPANY_WEBSITE || '';
  },
  get logoPath() {
    return process.env.COMPANY_LOGO_PATH || '';
  },
};
