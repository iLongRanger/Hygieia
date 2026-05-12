import {
  buildContractSignedHtmlWithBranding,
  buildContractSignedSubject,
} from '../contractSigned';

describe('contractSigned template', () => {
  it('builds a formatted win-style signed contract email', () => {
    const html = buildContractSignedHtmlWithBranding(
      {
        contractNumber: 'CONT-202605-0001',
        title: 'Janitorial Services',
        accountName: 'Acme Corp',
        signedByName: 'Jane Client',
        signedByEmail: 'jane@example.com',
        monthlyValue: '$2,500.00',
        signedAt: 'May 12, 2026, 9:15 AM',
      },
      {
        companyName: 'Hygieia',
        companyEmail: 'ops@example.com',
        companyPhone: null,
        companyWebsite: null,
        companyAddress: null,
        companyTimezone: 'UTC',
        taxRate: 0,
        logoDataUrl: null,
        themePrimaryColor: '#0f172a',
        themeAccentColor: '#16a34a',
        themeBackgroundColor: '#ffffff',
        themeTextColor: '#111827',
      }
    );

    expect(html).toContain('Client Signed. Time to Activate.');
    expect(html).toContain('New Signed Contract');
    expect(html).toContain('CONT-202605-0001');
    expect(html).toContain('Acme Corp');
    expect(html).toContain('$2,500.00');
    expect(html).toContain('Next step: review the signed contract');
  });

  it('builds a clear signed contract subject', () => {
    expect(buildContractSignedSubject('CONT-202605-0001', 'Acme Corp')).toBe(
      'Contract signed: CONT-202605-0001 for Acme Corp'
    );
  });
});
