import { describe, it, expect } from '@jest/globals';
import {
  buildContractRenewalReminderHtmlWithBranding,
  buildContractRenewalReminderSubject,
} from '../contractRenewalReminder';

const branding = {
  companyName: 'Hygieia',
  companyEmail: 'ops@hygieia.test',
  companyPhone: '555-0100',
  companyWebsite: 'https://hygieia.test',
  companyAddress: '123 Main St',
  logoDataUrl: null,
  themePrimaryColor: '#0f172a',
  themeAccentColor: '#f59e0b',
  themeBackgroundColor: '#f5f5f5',
  themeTextColor: '#111827',
};

describe('contractRenewalReminder template', () => {
  it('buildContractRenewalReminderHtmlWithBranding should include expiry details', () => {
    const html = buildContractRenewalReminderHtmlWithBranding(
      {
        contractNumber: 'CONT-010',
        title: 'Campus Cleaning',
        accountName: 'Nova HQ',
        endDate: '2026-03-31',
        daysUntilExpiry: 20,
      },
      branding
    );

    expect(html).toContain('Contract Expiring Soon');
    expect(html).toContain('CONT-010');
    expect(html).toContain('Campus Cleaning');
    expect(html).toContain('Nova HQ');
    expect(html).toContain('2026-03-31');
    expect(html).toContain('20');
    expect(html).toContain('background-color: #0f172a;');
  });

  it('buildContractRenewalReminderHtmlWithBranding should include logo when provided', () => {
    const html = buildContractRenewalReminderHtmlWithBranding(
      {
        contractNumber: 'CONT-010',
        title: 'Campus Cleaning',
        accountName: 'Nova HQ',
        endDate: '2026-03-31',
        daysUntilExpiry: 20,
      },
      {
        ...branding,
        logoDataUrl: 'data:image/png;base64,renewal-logo',
      }
    );

    expect(html).toContain('img src="data:image/png;base64,renewal-logo"');
    expect(html).toContain('alt="Hygieia logo"');
  });

  it('buildContractRenewalReminderSubject should format subject', () => {
    expect(buildContractRenewalReminderSubject('CONT-010', 20)).toBe(
      'Contract CONT-010 expires in 20 days'
    );
  });
});
