import { describe, it, expect } from '@jest/globals';
import {
  buildContractTerminatedHtmlWithBranding,
  buildContractTerminatedSubject,
} from '../contractTerminated';

const branding = {
  companyName: 'Hygieia',
  companyEmail: 'ops@hygieia.test',
  companyPhone: '555-0100',
  companyWebsite: 'https://hygieia.test',
  companyAddress: '123 Main St',
  logoDataUrl: null,
  themePrimaryColor: '#1f2937',
  themeAccentColor: '#ef4444',
  themeBackgroundColor: '#f5f5f5',
  themeTextColor: '#111827',
};

describe('contractTerminated template', () => {
  it('buildContractTerminatedHtmlWithBranding should include termination details', () => {
    const html = buildContractTerminatedHtmlWithBranding(
      {
        contractNumber: 'CONT-999',
        title: 'Legacy Contract',
        accountName: 'Acme Corp',
        terminatedAt: '2026-02-11',
        terminationReason: 'Client request',
      },
      branding
    );

    expect(html).toContain('Contract Terminated');
    expect(html).toContain('CONT-999');
    expect(html).toContain('Legacy Contract');
    expect(html).toContain('Acme Corp');
    expect(html).toContain('2026-02-11');
    expect(html).toContain('Client request');
    expect(html).toContain('background-color: #991b1b;');
  });

  it('buildContractTerminatedHtmlWithBranding should include logo when provided', () => {
    const html = buildContractTerminatedHtmlWithBranding(
      {
        contractNumber: 'CONT-999',
        title: 'Legacy Contract',
        accountName: 'Acme Corp',
        terminatedAt: '2026-02-11',
        terminationReason: 'Client request',
      },
      {
        ...branding,
        logoDataUrl: 'data:image/png;base64,terminated-logo',
      }
    );

    expect(html).toContain('img src="data:image/png;base64,terminated-logo"');
    expect(html).toContain('alt="Hygieia logo"');
  });

  it('buildContractTerminatedSubject should format subject', () => {
    expect(buildContractTerminatedSubject('CONT-999')).toBe(
      'Contract CONT-999 has been terminated'
    );
  });
});
