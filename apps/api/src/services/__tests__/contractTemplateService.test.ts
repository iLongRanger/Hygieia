import { generateContractTerms } from '../contractTemplateService';
import { getGlobalSettings } from '../globalSettingsService';

jest.mock('../globalSettingsService', () => ({
  getGlobalSettings: jest.fn(),
  getDefaultBranding: jest.fn(() => ({
    companyName: 'Hygieia',
    companyEmail: 'hello@example.com',
    companyPhone: '555-0100',
    companyWebsite: null,
    companyAddress: '123 Business Rd',
    companyTimezone: 'UTC',
    taxRate: 0,
    logoDataUrl: null,
    themePrimaryColor: '#0f172a',
    themeAccentColor: '#0ea5e9',
    themeBackgroundColor: '#ffffff',
    themeTextColor: '#111827',
  })),
}));

describe('contractTemplateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getGlobalSettings as jest.Mock).mockResolvedValue({
      companyName: 'Hygieia',
      companyEmail: 'hello@example.com',
      companyPhone: '555-0100',
      companyWebsite: null,
      companyAddress: '123 Business Rd',
      companyTimezone: 'UTC',
      taxRate: 0,
      logoDataUrl: null,
      themePrimaryColor: '#0f172a',
      themeAccentColor: '#0ea5e9',
      themeBackgroundColor: '#ffffff',
      themeTextColor: '#111827',
    });
  });

  it('uses service-aware agreement titles and safe payment wording', async () => {
    const terms = await generateContractTerms({
      serviceCategory: 'residential',
      accountName: 'Smith Family',
      facilityName: 'Smith Home',
      facilityAddress: '123 Home St',
      startDate: '2026-05-01',
      monthlyValue: 400,
      billingCycle: 'monthly',
      paymentTerms: 'Due on receipt',
    });

    expect(terms).toContain('Residential Cleaning Services Agreement');
    expect(terms).toContain('are due on receipt of the invoice ("Due on receipt")');
    expect(terms).not.toContain('within due on receipt days');
  });

  it('adds hardened worker safety, scope, privacy, and supplies clauses', async () => {
    const terms = await generateContractTerms({
      serviceCategory: 'commercial',
      proposalType: 'specialized',
      accountName: 'Acme Corp',
      facilityName: 'Main Office',
      facilityAddress: '123 Main St',
      startDate: '2026-05-01',
      monthlyValue: 1200,
      equipmentProvidedBy: 'mixed',
      chemicalsProvidedBy: 'client',
      approvedChemicalNotes: 'Use fragrance-free products.',
      restrictedChemicalNotes: 'No bleach.',
      equipmentNotes: 'Client provides vacuum.',
      requiresSpecialEquipment: true,
      specialEquipmentNotes: 'Floor buffer required.',
      sdsRequired: true,
      storageAllowedOnSite: true,
    });

    expect(terms).toContain('Specialized Cleaning Services Agreement');
    expect(terms).toContain('excluded unless agreed in writing');
    expect(terms).toContain('right to refuse unsafe work');
    expect(terms).toContain('SUPPLIES, EQUIPMENT, CHEMICALS, AND SDS');
    expect(terms).toContain('Approved chemical requirements: Use fragrance-free products.');
    expect(terms).toContain('Restricted chemicals or methods: No bleach.');
    expect(terms).toContain('PHOTOS, RECORDS, AND PRIVACY');
    expect(terms).toContain('SUBCONTRACTORS AND WORKER PROTECTION');
  });
});
