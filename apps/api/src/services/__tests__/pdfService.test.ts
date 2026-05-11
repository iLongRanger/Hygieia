import { formatProposalPdfFrequencyLabel, generateContractPdf, generateProposalPdf } from '../pdfService';
import { getGlobalSettings } from '../globalSettingsService';

jest.mock('../globalSettingsService', () => ({
  getGlobalSettings: jest.fn(),
  getDefaultBranding: jest.fn(() => ({
    companyName: 'Hygieia',
    companyEmail: 'hello@example.com',
    companyPhone: null,
    companyWebsite: null,
    companyAddress: null,
    companyTimezone: 'UTC',
    taxRate: 0,
    logoDataUrl: null,
    themePrimaryColor: '#0f172a',
    themeAccentColor: '#0ea5e9',
    themeBackgroundColor: '#ffffff',
    themeTextColor: '#111827',
  })),
}));

describe('pdfService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getGlobalSettings as jest.Mock).mockResolvedValue({
      companyName: 'Hygieia',
      companyEmail: 'hello@example.com',
      companyPhone: null,
      companyWebsite: null,
      companyAddress: null,
      companyTimezone: 'UTC',
      taxRate: 0,
      logoDataUrl: null,
      themePrimaryColor: '#0f172a',
      themeAccentColor: '#0ea5e9',
      themeBackgroundColor: '#ffffff',
      themeTextColor: '#111827',
    });
  });

  it('generates proposal PDFs with service blocks', async () => {
    const pdf = await generateProposalPdf({
      proposalNumber: 'PROP-001',
      title: 'Monthly Cleaning Proposal',
      status: 'draft',
      description: 'Recurring cleaning scope.',
      subtotal: 1000,
      taxRate: 0.05,
      taxAmount: 50,
      totalAmount: 1050,
      validUntil: '2026-06-01',
      createdAt: '2026-05-01',
      account: { name: 'Acme Corp' },
      facility: {
        name: 'Main Office',
        address: { street: '123 Main St', city: 'Vancouver', state: 'BC' },
      },
      createdByUser: { fullName: 'Admin User', email: 'admin@example.com' },
      proposalItems: [],
      proposalServices: [
        {
          serviceName: 'Lobby',
          serviceType: 'commercial',
          frequency: 'weekly',
          estimatedHours: 2,
          hourlyRate: 50,
          monthlyPrice: 1000,
          description: '500 sqft - VCT\nDaily: Empty trash, Mop floors\nWeekly: Dust fixtures',
        },
      ],
      pricingSnapshot: {
        operationalEstimate: {
          durationRangePerVisit: { minHours: 1.5, maxHours: 2.5 },
          recommendedCrewSize: 2,
          hoursPerVisit: 4,
        },
      },
    });

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it('formats proposal schedule frequencies using proposal engine labels', () => {
    expect(formatProposalPdfFrequencyLabel('2x_week')).toBe('2x Week');
    expect(formatProposalPdfFrequencyLabel('weekly')).toBe('Weekly');
    expect(formatProposalPdfFrequencyLabel('custom_frequency')).toBe('Custom Frequency');
  });

  it('generates contract PDFs with kept-together service and terms blocks', async () => {
    const pdf = await generateContractPdf({
      contractNumber: 'CONT-001',
      title: 'Cleaning Service Contract',
      status: 'draft',
      startDate: '2026-05-01',
      endDate: null,
      monthlyValue: 1200,
      totalValue: null,
      billingCycle: 'monthly',
      paymentTerms: 'Net 30',
      serviceFrequency: '2x_week',
      serviceSchedule: {
        days: ['monday', 'thursday'],
        allowedWindowStart: '18:00',
        allowedWindowEnd: '22:00',
      },
      equipmentProvidedBy: 'company',
      chemicalsProvidedBy: 'company',
      sdsRequired: true,
      storageAllowedOnSite: false,
      termsAndConditions: '## 1. TERMS\nServices will be provided as agreed.',
      specialInstructions: 'Use fragrance-free products.',
      createdAt: '2026-05-01',
      account: { name: 'Acme Corp' },
      facility: {
        name: 'Main Office',
        address: { street: '123 Main St', city: 'Vancouver', state: 'BC' },
      },
      proposal: {
        proposalServices: [
          {
            serviceName: 'Lobby',
            frequency: '2x_week',
            description: '500 sqft - VCT\nDaily: Empty trash\nWeekly: Dust fixtures',
            includedTasks: [],
          },
        ],
      },
      createdByUser: { fullName: 'Admin User', email: 'admin@example.com' },
    });

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(1000);
  });
});
