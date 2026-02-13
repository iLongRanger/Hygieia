import { describe, it, expect } from '@jest/globals';
import {
  buildContractActivatedHtmlWithBranding,
  buildContractActivatedSubject,
} from '../contractActivated';

const branding = {
  companyName: 'Hygieia',
  companyEmail: 'ops@hygieia.test',
  companyPhone: '555-0100',
  companyWebsite: 'https://hygieia.test',
  companyAddress: '123 Main St',
  logoDataUrl: null,
  themePrimaryColor: '#123456',
  themeAccentColor: '#abcdef',
  themeBackgroundColor: '#f5f5f5',
  themeTextColor: '#222222',
};

describe('contractActivated template', () => {
  it('buildContractActivatedHtmlWithBranding should include contract details and branding', () => {
    const html = buildContractActivatedHtmlWithBranding(
      {
        contractNumber: 'CONT-001',
        title: 'Office Cleaning',
        accountName: 'Acme Corp',
        monthlyValue: '$1,200.00',
        startDate: '2026-02-10',
        activatedAt: '2026-02-11',
      },
      branding
    );

    expect(html).toContain('Contract Activated');
    expect(html).toContain('CONT-001');
    expect(html).toContain('Office Cleaning');
    expect(html).toContain('Acme Corp');
    expect(html).toContain('$1,200.00');
    expect(html).toContain('background-color: #123456;');
    expect(html).toContain('Hygieia');
  });

  it('buildContractActivatedHtmlWithBranding should render logo block when logo is provided', () => {
    const html = buildContractActivatedHtmlWithBranding(
      {
        contractNumber: 'CONT-001',
        title: 'Office Cleaning',
        accountName: 'Acme Corp',
        monthlyValue: '$1,200.00',
        startDate: '2026-02-10',
        activatedAt: '2026-02-11',
      },
      {
        ...branding,
        logoDataUrl: 'data:image/png;base64,abc123',
      }
    );

    expect(html).toContain('img src="data:image/png;base64,abc123"');
    expect(html).toContain('alt="Hygieia logo"');
  });

  it('buildContractActivatedSubject should format subject', () => {
    expect(buildContractActivatedSubject('CONT-001')).toBe(
      'Contract CONT-001 has been activated'
    );
  });
});
