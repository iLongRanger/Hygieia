// @ts-ignore - pdfmake/src/printer has no type declarations
import PdfPrinter from 'pdfmake/src/printer.js';
import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import { getDefaultBranding, getGlobalSettings } from './globalSettingsService';
import type { GlobalBranding } from '../types/branding';
import {
  extractFacilityTimezone,
  formatTimeLabel,
  formatWeekdayList,
  normalizeServiceSchedule,
} from './serviceScheduleService';

// Use standard PDF fonts (no font files needed)
const printer = new PdfPrinter({
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
});

const BASE_COLORS = {
  text: '#333333',
  lightText: '#666666',
  border: '#e0e0e0',
  headerBg: '#f5f5f5',
  white: '#ffffff',
};

function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(amount));
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatWholeHours(hours: number | string | null | undefined): string {
  const parsed = Number(hours);
  if (!Number.isFinite(parsed) || parsed <= 0) return '-';
  return `${Math.round(parsed)} hrs`;
}

function isZeroQuantityTask(task: string): boolean {
  return /\bx\s*0(?:\.0+)?\b/i.test(task.trim());
}

interface ProposalForPdf {
  proposalNumber: string;
  title: string;
  status: string;
  description?: string | null;
  subtotal: number | string;
  taxRate: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  validUntil?: string | Date | null;
  createdAt: string | Date;
  account: { name: string };
  facility?: { name: string; address?: any } | null;
  createdByUser: { fullName: string; email: string };
  proposalItems: Array<{
    itemType: string;
    description: string;
    quantity: number | string;
    unitPrice: number | string;
    totalPrice: number | string;
  }>;
  proposalServices: Array<{
    serviceName: string;
    serviceType: string;
    frequency: string;
    estimatedHours?: number | string | null;
    hourlyRate?: number | string | null;
    monthlyPrice: number | string;
    description?: string | null;
    includedTasks?: string[] | any;
  }>;
  pricingSnapshot?: any | null;
}

export async function generateProposalPdf(proposal: ProposalForPdf): Promise<Buffer> {
  let branding: GlobalBranding;
  try {
    branding = await getGlobalSettings();
  } catch {
    branding = getDefaultBranding();
  }

  const COLORS = {
    ...BASE_COLORS,
    primary: branding.themePrimaryColor,
    accent: branding.themeAccentColor,
  };

  const content: Content[] = [];

  // Company Header
  const headerStack: Content[] = [];
  if (branding.logoDataUrl) {
    headerStack.push({
      image: branding.logoDataUrl,
      fit: [120, 60],
      margin: [0, 0, 0, 8] as [number, number, number, number],
    });
  }

  headerStack.push(
    { text: branding.companyName, style: 'companyName' },
    ...(branding.companyAddress ? [{ text: branding.companyAddress, style: 'companyDetail' }] : []),
    ...(branding.companyPhone ? [{ text: branding.companyPhone, style: 'companyDetail' }] : []),
    ...(branding.companyEmail ? [{ text: branding.companyEmail, style: 'companyDetail' }] : []),
    ...(branding.companyWebsite ? [{ text: branding.companyWebsite, style: 'companyDetail' }] : [])
  );

  content.push({
    columns: [
      {
        stack: headerStack,
        width: '*',
      },
      {
        stack: [
          { text: 'PROPOSAL', style: 'proposalLabel' },
          { text: proposal.proposalNumber, style: 'proposalNumber' },
          { text: `Date: ${formatDate(proposal.createdAt)}`, style: 'proposalMeta' },
          {
            text: `Valid Until: ${formatDate(proposal.validUntil)}`,
            style: 'proposalMeta',
          },
        ],
        width: 200,
        alignment: 'right' as const,
      },
    ],
    margin: [0, 0, 0, 20] as [number, number, number, number],
  });

  // Divider
  content.push({
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: 515,
        y2: 0,
        lineWidth: 2,
        lineColor: COLORS.accent,
      },
    ],
    margin: [0, 0, 0, 20] as [number, number, number, number],
  });

  // Proposal Title
  content.push({
    text: proposal.title,
    style: 'proposalTitle',
    margin: [0, 0, 0, 15] as [number, number, number, number],
  });

  // Client Info
  const clientInfo: Content[] = [
    { text: 'Prepared For:', style: 'sectionLabel' },
    { text: proposal.account.name, style: 'clientName' },
  ];
  if (proposal.facility) {
    clientInfo.push({ text: proposal.facility.name, style: 'clientDetail' });
    if (proposal.facility.address) {
      const addr = proposal.facility.address;
      const addrParts = [addr.street, addr.city, addr.state, addr.zip]
        .filter(Boolean)
        .join(', ');
      if (addrParts) {
        clientInfo.push({ text: addrParts, style: 'clientDetail' });
      }
    }
  }
  content.push({
    stack: clientInfo,
    margin: [0, 0, 0, 20] as [number, number, number, number],
  });

  // Description
  if (proposal.description) {
    content.push({ text: 'Description', style: 'sectionHeader' });
    content.push({
      text: proposal.description,
      style: 'bodyText',
      margin: [0, 0, 0, 15] as [number, number, number, number],
    });
  }

  // Services & Areas
  if (proposal.proposalServices.length > 0) {
    content.push({ text: 'Services & Areas', style: 'sectionHeader' });

    for (const service of proposal.proposalServices) {
      // Parse description: first line is area info, remaining are "Frequency: task1, task2"
      const lines = service.description?.split('\n') || [];
      const areaInfo = lines[0] || '';
      const taskGroups: { label: string; tasks: string[] }[] = [];
      for (let i = 1; i < lines.length; i++) {
        const match = lines[i].match(/^(.+?):\s*(.+)$/);
        if (match) {
          const tasks = match[2]
            .split(',')
            .map((t) => t.trim())
            .filter((task) => task && !isZeroQuantityTask(task));
          if (tasks.length === 0) continue;
          taskGroups.push({
            label: match[1].trim(),
            tasks,
          });
        }
      }

      const areaStack: Content[] = [];

      // Area header row: name + price
      areaStack.push({
        columns: [
          { text: service.serviceName, bold: true, fontSize: 11, color: COLORS.primary },
          { text: formatCurrency(service.monthlyPrice) + '/month', alignment: 'right' as const, bold: true, fontSize: 11, color: COLORS.primary },
        ],
        margin: [0, 0, 0, 2] as [number, number, number, number],
      });

      // Area description (sq ft, floor type)
      if (areaInfo) {
        areaStack.push({
          text: areaInfo,
          fontSize: 9,
          color: COLORS.lightText,
          margin: [0, 0, 0, 4] as [number, number, number, number],
        });
      }

      // Hours breakdown if available
      if (service.estimatedHours && service.hourlyRate) {
        areaStack.push({
          text: `${formatWholeHours(service.estimatedHours)} @ ${formatCurrency(service.hourlyRate)}/hr`,
          fontSize: 8,
          color: COLORS.lightText,
          margin: [0, 0, 0, 4] as [number, number, number, number],
        });
      }

      // Tasks grouped by frequency
      for (const group of taskGroups) {
        areaStack.push({
          text: group.label.toUpperCase(),
          fontSize: 8,
          bold: true,
          color: COLORS.lightText,
          margin: [0, 4, 0, 2] as [number, number, number, number],
        });

        const taskItems: Content[] = group.tasks.map((task) => ({
          columns: [
            { text: '\u2022', width: 10, fontSize: 9, color: COLORS.accent },
            { text: task, fontSize: 9, color: COLORS.text },
          ],
          margin: [8, 0, 0, 1] as [number, number, number, number],
        }));
        areaStack.push(...taskItems);
      }

      content.push({
        stack: areaStack,
        margin: [0, 8, 0, 8] as [number, number, number, number],
      });

      // Divider between areas
      content.push({
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: COLORS.border }],
        margin: [0, 0, 0, 0] as [number, number, number, number],
      });
    }
  }

  // Estimated Time On Site
  if (proposal.pricingSnapshot?.operationalEstimate) {
    const estimate = proposal.pricingSnapshot.operationalEstimate;
    content.push({ text: 'Estimated Time On Site', style: 'sectionHeader' });
    content.push({
      columns: [
        {
          stack: [
            { text: 'Duration Per Visit', fontSize: 8, color: COLORS.lightText },
            {
              text: `${formatWholeHours(estimate.durationRangePerVisit?.minHours)} - ${formatWholeHours(estimate.durationRangePerVisit?.maxHours)}`,
              fontSize: 10,
              bold: true,
              color: COLORS.text,
            },
          ],
          width: '*',
        },
        {
          stack: [
            { text: 'Crew Size', fontSize: 8, color: COLORS.lightText },
            { text: `${estimate.recommendedCrewSize || 1} cleaners`, fontSize: 10, bold: true, color: COLORS.text },
          ],
          width: '*',
        },
        {
          stack: [
            { text: 'Labor Hours / Visit', fontSize: 8, color: COLORS.lightText },
            { text: formatWholeHours(estimate.hoursPerVisit), fontSize: 10, bold: true, color: COLORS.text },
          ],
          width: '*',
        },
      ],
      margin: [0, 5, 0, 12] as [number, number, number, number],
    });
  }

  // Services summary table
  if (proposal.proposalServices.length > 0) {
    const hasAnyHours = proposal.proposalServices.some(
      (service) => service.estimatedHours != null && Number(service.estimatedHours) > 0
    );
    const areasBody: TableCell[][] = [[
      { text: 'Service', style: 'tableHeader' },
      { text: 'Frequency', style: 'tableHeader' },
      ...(hasAnyHours ? [{ text: 'Hours', style: 'tableHeader', alignment: 'right' as const }] : []),
      { text: 'Monthly', style: 'tableHeader', alignment: 'right' as const },
    ]];

    let totalHours = 0;
    let totalMonthly = 0;

    for (const service of proposal.proposalServices) {
      const hours = service.estimatedHours ? Number(service.estimatedHours) : 0;
      totalHours += hours;
      totalMonthly += Number(service.monthlyPrice);

      areasBody.push([
        { text: service.serviceName, fontSize: 9 },
        { text: service.frequency.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), fontSize: 9 },
        ...(hasAnyHours ? [{ text: hours > 0 ? formatWholeHours(hours) : '-', alignment: 'right' as const, fontSize: 9 }] : []),
        { text: formatCurrency(service.monthlyPrice), alignment: 'right' as const, fontSize: 9 },
      ]);
    }

    // Total row
    areasBody.push([
      { text: 'Total', bold: true, fontSize: 9 },
      { text: '', fontSize: 9 },
      ...(hasAnyHours ? [{ text: totalHours > 0 ? formatWholeHours(totalHours) : '', alignment: 'right' as const, bold: true, fontSize: 9 }] : []),
      { text: formatCurrency(totalMonthly), alignment: 'right' as const, bold: true, fontSize: 9 },
    ]);

    content.push({
        table: {
          headerRows: 1,
          widths: hasAnyHours ? ['*', 100, 60, 90] : ['*', 130, 90],
          body: areasBody,
        },
      layout: {
        hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length - 1 || i === node.table.body.length ? 1 : 0.5),
        vLineWidth: () => 0,
        hLineColor: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length - 1 ? COLORS.accent : COLORS.border),
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 6,
        paddingBottom: () => 6,
        fillColor: (rowIndex: number) => (rowIndex === 0 ? COLORS.headerBg : null),
      },
      margin: [0, 5, 0, 15] as [number, number, number, number],
    });
  }

  // Line Items
  const visibleProposalItems = proposal.proposalItems.filter(
    (item) => Number(item.totalPrice || 0) > 0
  );
  if (visibleProposalItems.length > 0) {
    content.push({ text: 'Line Items', style: 'sectionHeader' });

    const itemsBody: TableCell[][] = [
      [
        { text: 'Description', style: 'tableHeader' },
        { text: 'Qty', style: 'tableHeader', alignment: 'right' as const },
        { text: 'Unit Price', style: 'tableHeader', alignment: 'right' as const },
        { text: 'Total', style: 'tableHeader', alignment: 'right' as const },
      ],
    ];

    for (const item of visibleProposalItems) {
      itemsBody.push([
        { text: item.description },
        { text: String(item.quantity), alignment: 'right' as const },
        { text: formatCurrency(item.unitPrice), alignment: 'right' as const },
        { text: formatCurrency(item.totalPrice), alignment: 'right' as const, bold: true },
      ]);
    }

    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 50, 90, 90],
        body: itemsBody,
      },
      layout: {
        hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5),
        vLineWidth: () => 0,
        hLineColor: (i: number) => (i === 0 || i === 1 ? COLORS.accent : COLORS.border),
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 6,
        paddingBottom: () => 6,
        fillColor: (rowIndex: number) => (rowIndex === 0 ? COLORS.headerBg : null),
      },
      margin: [0, 5, 0, 15] as [number, number, number, number],
    });
  }

  // Financial Summary
  content.push({
    columns: [
      { width: '*', text: '' },
      {
        width: 250,
        table: {
          widths: ['*', 100],
          body: [
            [
              { text: 'Monthly Subtotal', alignment: 'right' as const, color: COLORS.lightText },
              { text: formatCurrency(proposal.subtotal), alignment: 'right' as const },
            ],
            [
              {
                text: `Tax (${(Number(proposal.taxRate) * 100).toFixed(1)}%)`,
                alignment: 'right' as const,
                color: COLORS.lightText,
              },
              { text: formatCurrency(proposal.taxAmount), alignment: 'right' as const },
            ],
            [
              {
                text: 'Monthly Total',
                alignment: 'right' as const,
                bold: true,
                fontSize: 14,
              },
              {
                text: formatCurrency(proposal.totalAmount),
                alignment: 'right' as const,
                bold: true,
                fontSize: 14,
                color: COLORS.primary,
              },
            ],
            [
              { text: 'Annual Estimate', alignment: 'right' as const, color: COLORS.lightText },
              { text: formatCurrency(Number(proposal.totalAmount) * 12), alignment: 'right' as const, color: COLORS.lightText },
            ],
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === node.table.body.length - 1 ? 1 : 0),
          vLineWidth: () => 0,
          hLineColor: () => COLORS.accent,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
      },
    ],
    margin: [0, 10, 0, 25] as [number, number, number, number],
  });

  // Terms (aligned with public Review & Sign page)
  content.push({ text: 'Terms', style: 'sectionHeader' });
  content.push({
    ul: [
      `This proposal is valid until ${formatDate(proposal.validUntil)}.`,
      'All prices shown are monthly recurring charges unless otherwise noted.',
      'Acceptance of this proposal constitutes agreement to the services and pricing described herein.',
    ],
    margin: [0, 4, 0, 0] as [number, number, number, number],
    fontSize: 9,
    color: COLORS.text,
  });

  const docDefinition: TDocumentDefinitions = {
    content,
    defaultStyle: {
      font: 'Helvetica',
      fontSize: 10,
      color: COLORS.text,
    },
    styles: {
      companyName: {
        fontSize: 18,
        bold: true,
        color: COLORS.primary,
      },
      companyDetail: {
        fontSize: 9,
        color: COLORS.lightText,
        margin: [0, 1, 0, 0] as [number, number, number, number],
      },
      proposalLabel: {
        fontSize: 24,
        bold: true,
        color: COLORS.accent,
      },
      proposalNumber: {
        fontSize: 11,
        color: COLORS.lightText,
        margin: [0, 2, 0, 0] as [number, number, number, number],
      },
      proposalMeta: {
        fontSize: 9,
        color: COLORS.lightText,
        margin: [0, 2, 0, 0] as [number, number, number, number],
      },
      proposalTitle: {
        fontSize: 16,
        bold: true,
        color: COLORS.primary,
      },
      sectionLabel: {
        fontSize: 9,
        color: COLORS.lightText,
        margin: [0, 0, 0, 2] as [number, number, number, number],
      },
      clientName: {
        fontSize: 14,
        bold: true,
        color: COLORS.primary,
      },
      clientDetail: {
        fontSize: 10,
        color: COLORS.lightText,
        margin: [0, 1, 0, 0] as [number, number, number, number],
      },
      sectionHeader: {
        fontSize: 13,
        bold: true,
        color: COLORS.primary,
        margin: [0, 10, 0, 5] as [number, number, number, number],
      },
      bodyText: {
        fontSize: 10,
        color: COLORS.text,
        lineHeight: 1.4,
      },
      tableHeader: {
        fontSize: 9,
        bold: true,
        color: COLORS.primary,
      },
      termsText: {
        fontSize: 8,
        color: COLORS.lightText,
        lineHeight: 1.3,
      },
      signatureLabel: {
        fontSize: 8,
        color: COLORS.lightText,
      },
    },
    pageMargins: [40, 40, 40, 60] as [number, number, number, number],
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: `${branding.companyName} - ${proposal.proposalNumber}`,
          fontSize: 8,
          color: COLORS.lightText,
          margin: [40, 0, 0, 0] as [number, number, number, number],
        },
        {
          text: `Page ${currentPage} of ${pageCount}`,
          fontSize: 8,
          color: COLORS.lightText,
          alignment: 'right' as const,
          margin: [0, 0, 40, 0] as [number, number, number, number],
        },
      ],
    }),
  };

  return buildPdfBuffer(docDefinition);
}

function buildPdfBuffer(docDefinition: TDocumentDefinitions): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: Uint8Array[] = [];

      pdfDoc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================================
// Contract PDF
// ============================================================

interface ContractForPdf {
  contractNumber: string;
  title: string;
  status: string;
  startDate: string | Date;
  endDate?: string | Date | null;
  monthlyValue: number | string;
  totalValue?: number | string | null;
  billingCycle: string;
  paymentTerms: string;
  serviceFrequency?: string | null;
  serviceSchedule?: Record<string, unknown> | null;
  termsAndConditions?: string | null;
  specialInstructions?: string | null;
  signedByName?: string | null;
  signedByEmail?: string | null;
  signedDate?: string | Date | null;
  createdAt: string | Date;
  account: { name: string };
  facility?: { name: string; address?: any } | null;
  createdByUser: { fullName: string; email: string };
}

interface ResidentialQuoteForPdf {
  quoteNumber: string;
  title: string;
  status: string;
  createdAt: string | Date;
  preferredStartDate?: string | Date | null;
  totalAmount: number | string;
  estimatedHours?: number | string | null;
  notes?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  serviceType: string;
  frequency: string;
  account?: { name: string } | null;
  property?: {
    name: string;
    serviceAddress?: any;
    homeProfile?: any;
  } | null;
  homeAddress?: any;
  homeProfile?: any;
  addOns?: Array<{
    label: string;
    quantity: number;
    pricingType: 'flat' | 'per_unit';
    unitLabel?: string | null;
    unitPrice: number | string;
    lineTotal: number | string;
  }>;
  priceBreakdown?: {
    baseSubtotal?: number | string;
    recurringDiscount?: number | string;
    firstCleanSurcharge?: number | string;
    addOnTotal?: number | string;
    finalTotal?: number | string;
    guidance?: string[];
    manualReviewReasons?: string[];
  } | null;
}

function formatResidentialServiceType(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatYesNo(value: unknown): string {
  return value ? 'Yes' : 'No';
}

export async function generateResidentialQuotePdf(quote: ResidentialQuoteForPdf): Promise<Buffer> {
  let branding: GlobalBranding;
  try {
    branding = await getGlobalSettings();
  } catch {
    branding = getDefaultBranding();
  }

  const COLORS = {
    ...BASE_COLORS,
    primary: branding.themePrimaryColor,
    accent: branding.themeAccentColor,
  };

  const propertyAddress = quote.property?.serviceAddress ?? quote.homeAddress ?? null;
  const homeProfile = quote.property?.homeProfile ?? quote.homeProfile ?? null;
  const addressLine = propertyAddress
    ? [propertyAddress.street, propertyAddress.city, propertyAddress.state, propertyAddress.postalCode]
        .filter(Boolean)
        .join(', ')
    : null;

  const content: Content[] = [];

  const headerStack: Content[] = [];
  if (branding.logoDataUrl) {
    headerStack.push({
      image: branding.logoDataUrl,
      fit: [120, 60],
      margin: [0, 0, 0, 8] as [number, number, number, number],
    });
  }

  headerStack.push(
    { text: branding.companyName, style: 'companyName' },
    ...(branding.companyAddress ? [{ text: branding.companyAddress, style: 'companyDetail' }] : []),
    ...(branding.companyPhone ? [{ text: branding.companyPhone, style: 'companyDetail' }] : []),
    ...(branding.companyEmail ? [{ text: branding.companyEmail, style: 'companyDetail' }] : []),
    ...(branding.companyWebsite ? [{ text: branding.companyWebsite, style: 'companyDetail' }] : []),
  );

  content.push({
    columns: [
      { stack: headerStack, width: '*' },
      {
        stack: [
          { text: 'RESIDENTIAL QUOTE', style: 'proposalLabel' },
          { text: quote.quoteNumber, style: 'proposalNumber' },
          { text: `Date: ${formatDate(quote.createdAt)}`, style: 'proposalMeta' },
          ...(quote.preferredStartDate
            ? [{ text: `Preferred Start: ${formatDate(quote.preferredStartDate)}`, style: 'proposalMeta' }]
            : []),
        ],
        width: 220,
        alignment: 'right' as const,
      },
    ],
    margin: [0, 0, 0, 20] as [number, number, number, number],
  });

  content.push({
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: 515,
        y2: 0,
        lineWidth: 2,
        lineColor: COLORS.accent,
      },
    ],
    margin: [0, 0, 0, 20] as [number, number, number, number],
  });

  content.push({
    text: quote.title,
    style: 'proposalTitle',
    margin: [0, 0, 0, 15] as [number, number, number, number],
  });

  const clientInfo: Content[] = [
    { text: 'Prepared For:', style: 'sectionLabel' },
    { text: quote.customerName || quote.account?.name || 'Residential Client', style: 'clientName' },
  ];
  if (quote.property?.name) {
    clientInfo.push({ text: quote.property.name, style: 'clientDetail' });
  }
  if (addressLine) {
    clientInfo.push({ text: addressLine, style: 'clientDetail' });
  }
  if (quote.customerEmail) {
    clientInfo.push({ text: quote.customerEmail, style: 'clientDetail' });
  }
  if (quote.customerPhone) {
    clientInfo.push({ text: quote.customerPhone, style: 'clientDetail' });
  }
  content.push({
    stack: clientInfo,
    margin: [0, 0, 0, 16] as [number, number, number, number],
  });

  content.push({ text: 'Quote Summary', style: 'sectionHeader' });
  content.push({
    columns: [
      {
        stack: [
          { text: 'Service Location', fontSize: 8, color: COLORS.lightText },
          { text: quote.property?.name || 'Residential Property', fontSize: 10, bold: true },
          ...(addressLine ? [{ text: addressLine, fontSize: 9, color: COLORS.text }] : []),
        ],
        width: '*',
      },
      {
        stack: [
          { text: 'Preferred Start', fontSize: 8, color: COLORS.lightText },
          { text: quote.preferredStartDate ? formatDate(quote.preferredStartDate) : 'To Be Scheduled', fontSize: 10, bold: true },
        ],
        width: '*',
      },
      {
        stack: [
          { text: 'Quote Total', fontSize: 8, color: COLORS.lightText },
          { text: formatCurrency(quote.totalAmount), fontSize: 12, bold: true, color: COLORS.primary },
        ],
        width: '*',
      },
    ],
    margin: [0, 4, 0, 12] as [number, number, number, number],
  });

  content.push({ text: 'Service Overview', style: 'sectionHeader' });
  content.push({
    columns: [
      {
        stack: [
          { text: 'Cleaning Type', fontSize: 8, color: COLORS.lightText },
          { text: formatResidentialServiceType(quote.serviceType), fontSize: 10, bold: true },
        ],
        width: '*',
      },
      {
        stack: [
          { text: 'Frequency', fontSize: 8, color: COLORS.lightText },
          { text: formatResidentialServiceType(quote.frequency), fontSize: 10, bold: true },
        ],
        width: '*',
      },
      {
        stack: [
          { text: 'Estimated Hours', fontSize: 8, color: COLORS.lightText },
          { text: formatWholeHours(quote.estimatedHours), fontSize: 10, bold: true },
        ],
        width: '*',
      },
    ],
    margin: [0, 4, 0, 12] as [number, number, number, number],
  });

  if (homeProfile) {
    content.push({ text: 'Home Profile', style: 'sectionHeader' });
    content.push({
      columns: [
        {
          stack: [
            { text: 'Home Type', fontSize: 8, color: COLORS.lightText },
            { text: formatResidentialServiceType(String(homeProfile.homeType || '')), fontSize: 10, bold: true },
          ],
          width: '*',
        },
        {
          stack: [
            { text: 'Square Feet', fontSize: 8, color: COLORS.lightText },
            { text: Number(homeProfile.squareFeet || 0).toLocaleString(), fontSize: 10, bold: true },
          ],
          width: '*',
        },
        {
          stack: [
            { text: 'Bedrooms / Baths', fontSize: 8, color: COLORS.lightText },
            {
              text: `${homeProfile.bedrooms || 0} bd / ${(homeProfile.fullBathrooms || 0) + (homeProfile.halfBathrooms || 0) * 0.5} ba`,
              fontSize: 10,
              bold: true,
            },
          ],
          width: '*',
        },
      ],
      margin: [0, 4, 0, 12] as [number, number, number, number],
    });

    content.push({
      columns: [
        {
          stack: [
            { text: 'Condition', fontSize: 8, color: COLORS.lightText },
            { text: formatResidentialServiceType(String(homeProfile.condition || 'standard')), fontSize: 10, bold: true },
          ],
          width: '*',
        },
        {
          stack: [
            { text: 'Occupancy', fontSize: 8, color: COLORS.lightText },
            { text: formatResidentialServiceType(String(homeProfile.occupiedStatus || 'occupied')), fontSize: 10, bold: true },
          ],
          width: '*',
        },
        {
          stack: [
            { text: 'Pets in Home', fontSize: 8, color: COLORS.lightText },
            { text: formatYesNo(homeProfile.hasPets), fontSize: 10, bold: true },
          ],
          width: '*',
        },
      ],
      margin: [0, 0, 0, 12] as [number, number, number, number],
    });
  }

  const detailItems = [
    homeProfile?.parkingAccess
      ? `Parking / access: ${homeProfile.parkingAccess}`
      : null,
    homeProfile?.entryNotes
      ? `Entry notes: ${homeProfile.entryNotes}`
      : null,
    homeProfile?.specialInstructions
      ? `Special instructions: ${homeProfile.specialInstructions}`
      : null,
    homeProfile?.lastProfessionalCleaning
      ? `Last professional cleaning: ${homeProfile.lastProfessionalCleaning}`
      : null,
  ].filter(Boolean) as string[];

  if (detailItems.length > 0) {
    content.push({ text: 'Additional Details', style: 'sectionHeader' });
    content.push({
      ul: detailItems,
      margin: [0, 4, 0, 12] as [number, number, number, number],
      fontSize: 9,
      color: COLORS.text,
    });
  }

  if (quote.addOns && quote.addOns.length > 0) {
    content.push({ text: 'Add-Ons', style: 'sectionHeader' });
    const addOnBody: TableCell[][] = [[
      { text: 'Add-On', style: 'tableHeader' },
      { text: 'Qty', style: 'tableHeader', alignment: 'right' as const },
      { text: 'Price', style: 'tableHeader', alignment: 'right' as const },
      { text: 'Total', style: 'tableHeader', alignment: 'right' as const },
    ]];

    for (const addOn of quote.addOns) {
      addOnBody.push([
        { text: addOn.label, fontSize: 9 },
        { text: String(addOn.quantity || 1), alignment: 'right' as const, fontSize: 9 },
        {
          text:
            addOn.pricingType === 'per_unit' && addOn.unitLabel
              ? `${formatCurrency(addOn.unitPrice)}/${addOn.unitLabel}`
              : formatCurrency(addOn.unitPrice),
          alignment: 'right' as const,
          fontSize: 9,
        },
        { text: formatCurrency(addOn.lineTotal), alignment: 'right' as const, fontSize: 9 },
      ]);
    }

    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 50, 90, 90],
        body: addOnBody,
      },
      layout: {
        hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5),
        vLineWidth: () => 0,
        hLineColor: (i: number) => (i === 0 || i === 1 ? COLORS.accent : COLORS.border),
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 6,
        paddingBottom: () => 6,
        fillColor: (rowIndex: number) => (rowIndex === 0 ? COLORS.headerBg : null),
      },
      margin: [0, 5, 0, 15] as [number, number, number, number],
    });
  }

  content.push({ text: 'What Is Included', style: 'sectionHeader' });
  content.push({
    ul: [
      `Service type: ${formatResidentialServiceType(quote.serviceType)}`,
      `Visit cadence: ${formatResidentialServiceType(quote.frequency)}`,
      `Estimated on-site time: ${formatWholeHours(quote.estimatedHours)}`,
      ...(quote.addOns && quote.addOns.length > 0
        ? [`Selected add-ons: ${quote.addOns.map((addOn) => addOn.label).join(', ')}`]
        : ['Selected add-ons: none']),
    ],
    margin: [0, 4, 0, 12] as [number, number, number, number],
    fontSize: 9,
    color: COLORS.text,
  });

  content.push({
    columns: [
      { width: '*', text: '' },
      {
        width: 250,
        table: {
          widths: ['*', 100],
          body: [
            [
              { text: 'Service Subtotal', alignment: 'right' as const, color: COLORS.lightText },
              { text: formatCurrency(quote.priceBreakdown?.baseSubtotal ?? quote.totalAmount), alignment: 'right' as const },
            ],
            [
              { text: 'Recurring Discount', alignment: 'right' as const, color: COLORS.lightText },
              { text: formatCurrency(quote.priceBreakdown?.recurringDiscount ?? 0), alignment: 'right' as const },
            ],
            [
              { text: 'First Clean Surcharge', alignment: 'right' as const, color: COLORS.lightText },
              { text: formatCurrency(quote.priceBreakdown?.firstCleanSurcharge ?? 0), alignment: 'right' as const },
            ],
            [
              { text: 'Add-Ons', alignment: 'right' as const, color: COLORS.lightText },
              { text: formatCurrency(quote.priceBreakdown?.addOnTotal ?? 0), alignment: 'right' as const },
            ],
            [
              {
                text: 'Quote Total',
                alignment: 'right' as const,
                bold: true,
                fontSize: 14,
              },
              {
                text: formatCurrency(quote.totalAmount),
                alignment: 'right' as const,
                bold: true,
                fontSize: 14,
                color: COLORS.primary,
              },
            ],
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === node.table.body.length - 1 ? 1 : 0),
          vLineWidth: () => 0,
          hLineColor: () => COLORS.accent,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
      },
    ],
    margin: [0, 10, 0, 20] as [number, number, number, number],
  });

  if (quote.notes) {
    content.push({ text: 'Notes', style: 'sectionHeader' });
    content.push({
      text: quote.notes,
      style: 'bodyText',
      margin: [0, 0, 0, 12] as [number, number, number, number],
    });
  }

  if (quote.priceBreakdown?.guidance?.length) {
    content.push({ text: 'Guidance', style: 'sectionHeader' });
    content.push({
      ul: quote.priceBreakdown.guidance,
      margin: [0, 4, 0, 12] as [number, number, number, number],
      fontSize: 9,
      color: COLORS.text,
    });
  }

  content.push({ text: 'Terms', style: 'sectionHeader' });
  content.push({
    ul: [
      'This residential quote reflects the selected service scope, home profile, and add-ons.',
      'Scheduling is subject to final start-date confirmation and service availability.',
      'Acceptance of this quote constitutes agreement to the services and pricing described herein.',
    ],
    margin: [0, 4, 0, 0] as [number, number, number, number],
    fontSize: 9,
    color: COLORS.text,
  });

  const docDefinition: TDocumentDefinitions = {
    content,
    defaultStyle: {
      font: 'Helvetica',
      fontSize: 10,
      color: COLORS.text,
    },
    styles: {
      companyName: {
        fontSize: 18,
        bold: true,
        color: COLORS.primary,
      },
      companyDetail: {
        fontSize: 9,
        color: COLORS.lightText,
        margin: [0, 1, 0, 0] as [number, number, number, number],
      },
      proposalLabel: {
        fontSize: 24,
        bold: true,
        color: COLORS.accent,
      },
      proposalNumber: {
        fontSize: 11,
        color: COLORS.lightText,
        margin: [0, 2, 0, 0] as [number, number, number, number],
      },
      proposalMeta: {
        fontSize: 9,
        color: COLORS.lightText,
        margin: [0, 2, 0, 0] as [number, number, number, number],
      },
      proposalTitle: {
        fontSize: 16,
        bold: true,
        color: COLORS.primary,
      },
      sectionLabel: {
        fontSize: 9,
        color: COLORS.lightText,
        margin: [0, 0, 0, 2] as [number, number, number, number],
      },
      clientName: {
        fontSize: 14,
        bold: true,
        color: COLORS.primary,
      },
      clientDetail: {
        fontSize: 10,
        color: COLORS.lightText,
        margin: [0, 1, 0, 0] as [number, number, number, number],
      },
      sectionHeader: {
        fontSize: 13,
        bold: true,
        color: COLORS.primary,
        margin: [0, 10, 0, 5] as [number, number, number, number],
      },
      bodyText: {
        fontSize: 10,
        color: COLORS.text,
        lineHeight: 1.4,
      },
      tableHeader: {
        fontSize: 9,
        bold: true,
        color: COLORS.primary,
      },
    },
    pageMargins: [40, 40, 40, 60] as [number, number, number, number],
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: `${branding.companyName} - ${quote.quoteNumber}`,
          fontSize: 8,
          color: COLORS.lightText,
          margin: [40, 0, 0, 0] as [number, number, number, number],
        },
        {
          text: `Page ${currentPage} of ${pageCount}`,
          fontSize: 8,
          color: COLORS.lightText,
          alignment: 'right' as const,
          margin: [0, 0, 40, 0] as [number, number, number, number],
        },
      ],
    }),
  };

  return buildPdfBuffer(docDefinition);
}

export async function generateContractPdf(contract: ContractForPdf): Promise<Buffer> {
  let branding: GlobalBranding;
  try {
    branding = await getGlobalSettings();
  } catch {
    branding = getDefaultBranding();
  }

  const COLORS = {
    ...BASE_COLORS,
    primary: branding.themePrimaryColor,
    accent: branding.themeAccentColor,
  };

  const content: Content[] = [];

  // Company Header
  const headerStack: Content[] = [];
  if (branding.logoDataUrl) {
    headerStack.push({
      image: branding.logoDataUrl,
      fit: [120, 60],
      margin: [0, 0, 0, 8] as [number, number, number, number],
    });
  }

  headerStack.push(
    { text: branding.companyName, style: 'companyName' },
    ...(branding.companyAddress ? [{ text: branding.companyAddress, style: 'companyDetail' }] : []),
    ...(branding.companyPhone ? [{ text: branding.companyPhone, style: 'companyDetail' }] : []),
    ...(branding.companyEmail ? [{ text: branding.companyEmail, style: 'companyDetail' }] : []),
    ...(branding.companyWebsite ? [{ text: branding.companyWebsite, style: 'companyDetail' }] : [])
  );

  content.push({
    columns: [
      { stack: headerStack, width: '*' },
      {
        stack: [
          { text: 'SERVICE CONTRACT', style: 'proposalLabel' },
          { text: contract.contractNumber, style: 'proposalNumber' },
          { text: `Date: ${formatDate(contract.createdAt)}`, style: 'proposalMeta' },
          { text: `Status: ${contract.status.replace('_', ' ').toUpperCase()}`, style: 'proposalMeta' },
        ],
        width: 220,
        alignment: 'right' as const,
      },
    ],
    margin: [0, 0, 0, 20] as [number, number, number, number],
  });

  // Divider
  content.push({
    canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: COLORS.accent }],
    margin: [0, 0, 0, 20] as [number, number, number, number],
  });

  // Contract Title
  content.push({
    text: contract.title,
    style: 'proposalTitle',
    margin: [0, 0, 0, 15] as [number, number, number, number],
  });

  // Client Info
  const clientInfo: Content[] = [
    { text: 'Client:', style: 'sectionLabel' },
    { text: contract.account.name, style: 'clientName' },
  ];
  if (contract.facility) {
    clientInfo.push({ text: contract.facility.name, style: 'clientDetail' });
    if (contract.facility.address) {
      const addr = contract.facility.address;
      const addrParts = [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ');
      if (addrParts) clientInfo.push({ text: addrParts, style: 'clientDetail' });
    }
  }
  content.push({ stack: clientInfo, margin: [0, 0, 0, 20] as [number, number, number, number] });

  // Service Terms Table
  content.push({ text: 'Service Terms', style: 'sectionHeader' });

  const termsBody: any[][] = [
    [
      { text: 'Start Date', style: 'tableHeader' },
      { text: formatDate(contract.startDate) },
    ],
    [
      { text: 'End Date', style: 'tableHeader' },
      { text: formatDate(contract.endDate) },
    ],
  ];

  if (contract.serviceFrequency) {
    termsBody.push([
      { text: 'Service Frequency', style: 'tableHeader' },
      { text: contract.serviceFrequency.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) },
    ]);
  }

  const normalizedSchedule = normalizeServiceSchedule(
    contract.serviceSchedule,
    contract.serviceFrequency
  );
  if (normalizedSchedule) {
    termsBody.push([
      { text: 'Scheduled Days', style: 'tableHeader' },
      { text: formatWeekdayList(normalizedSchedule.days) },
    ]);
    termsBody.push([
      { text: 'Allowed Window', style: 'tableHeader' },
      {
        text:
          `${formatTimeLabel(normalizedSchedule.allowedWindowStart)} to ` +
          `${formatTimeLabel(normalizedSchedule.allowedWindowEnd)}`,
      },
    ]);
    termsBody.push([
      { text: 'Timezone / Anchor', style: 'tableHeader' },
      {
        text:
          `${extractFacilityTimezone(contract.facility?.address) || 'Facility timezone'} ` +
          '(start day anchor)',
      },
    ]);
  }

  content.push({
    table: {
      headerRows: 0,
      widths: [150, '*'],
      body: termsBody,
    },
    layout: {
      hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length ? 1 : 0.5),
      vLineWidth: () => 0,
      hLineColor: () => COLORS.border,
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
    margin: [0, 5, 0, 15] as [number, number, number, number],
  });

  // Financial Terms
  content.push({ text: 'Financial Terms', style: 'sectionHeader' });

  const financialBody: any[][] = [
    [
      { text: 'Monthly Value', style: 'tableHeader' },
      { text: formatCurrency(contract.monthlyValue), bold: true, color: COLORS.primary },
    ],
    [
      { text: 'Billing Cycle', style: 'tableHeader' },
      { text: contract.billingCycle.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) },
    ],
    [
      { text: 'Payment Terms', style: 'tableHeader' },
      { text: contract.paymentTerms },
    ],
  ];

  if (contract.totalValue) {
    financialBody.push([
      { text: 'Total Contract Value', style: 'tableHeader' },
      { text: formatCurrency(contract.totalValue), bold: true },
    ]);
  }

  content.push({
    table: {
      headerRows: 0,
      widths: [150, '*'],
      body: financialBody,
    },
    layout: {
      hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length ? 1 : 0.5),
      vLineWidth: () => 0,
      hLineColor: () => COLORS.border,
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
    margin: [0, 5, 0, 15] as [number, number, number, number],
  });

  // Terms & Conditions (start on new page)
  if (contract.termsAndConditions) {
    content.push({ text: 'Terms & Conditions', style: 'sectionHeader', pageBreak: 'before' as const });

    // Parse section headings (## N. TITLE format) for formatted rendering
    const tcText = contract.termsAndConditions as string;
    if (tcText.includes('## ')) {
      const parts = tcText.split(/^(?=## )/m);
      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;

        const headingMatch = trimmed.match(/^## (.+)/);
        if (headingMatch) {
          const heading = headingMatch[1];
          const body = trimmed.slice(headingMatch[0].length).trim();
          content.push({
            text: heading,
            fontSize: 11,
            bold: true,
            color: COLORS.primary,
            margin: [0, 8, 0, 4] as [number, number, number, number],
          });
          if (body) {
            content.push({
              text: body,
              style: 'bodyText',
              margin: [0, 0, 0, 6] as [number, number, number, number],
            });
          }
        } else {
          content.push({
            text: trimmed,
            style: 'bodyText',
            margin: [0, 0, 0, 6] as [number, number, number, number],
          });
        }
      }
      content.push({ text: '', margin: [0, 0, 0, 9] as [number, number, number, number] });
    } else {
      // Backward compatible: no section markers, render as single block
      content.push({
        text: tcText,
        style: 'bodyText',
        margin: [0, 0, 0, 15] as [number, number, number, number],
      });
    }
  }

  // Special Instructions
  if (contract.specialInstructions) {
    content.push({ text: 'Special Instructions', style: 'sectionHeader' });
    content.push({
      text: contract.specialInstructions,
      style: 'bodyText',
      margin: [0, 0, 0, 15] as [number, number, number, number],
    });
  }

  // Signature Block
  const sigLine = { type: 'line' as const, x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: COLORS.border };

  const clientSigStack: Content[] = [
    { canvas: [sigLine] },
    { text: 'Client Signature', style: 'signatureLabel', margin: [0, 5, 0, 0] as [number, number, number, number] },
  ];

  if (contract.signedByName) {
    clientSigStack.push(
      { text: contract.signedByName, fontSize: 10, margin: [0, 4, 0, 0] as [number, number, number, number] },
      { text: `Signed: ${formatDate(contract.signedDate)}`, style: 'signatureLabel' },
    );
  } else {
    clientSigStack.push(
      { text: '\n', fontSize: 6 },
      { canvas: [sigLine] },
      { text: 'Printed Name', style: 'signatureLabel', margin: [0, 5, 0, 0] as [number, number, number, number] },
      { text: '\n', fontSize: 6 },
      { canvas: [sigLine] },
      { text: 'Date', style: 'signatureLabel', margin: [0, 5, 0, 0] as [number, number, number, number] },
    );
  }

  content.push({
    columns: [
      { stack: clientSigStack, width: '*' },
      {
        stack: [
          { canvas: [sigLine] },
          { text: 'Company Representative', style: 'signatureLabel', margin: [0, 5, 0, 0] as [number, number, number, number] },
          { text: '\n', fontSize: 6 },
          { canvas: [sigLine] },
          { text: 'Printed Name', style: 'signatureLabel', margin: [0, 5, 0, 0] as [number, number, number, number] },
          { text: '\n', fontSize: 6 },
          { canvas: [sigLine] },
          { text: 'Date', style: 'signatureLabel', margin: [0, 5, 0, 0] as [number, number, number, number] },
        ],
        width: '*',
      },
    ],
    margin: [0, 30, 0, 0] as [number, number, number, number],
  });

  const docDefinition: TDocumentDefinitions = {
    content,
    defaultStyle: {
      font: 'Helvetica',
      fontSize: 10,
      color: COLORS.text,
    },
    styles: {
      companyName: { fontSize: 18, bold: true, color: COLORS.primary },
      companyDetail: { fontSize: 9, color: COLORS.lightText, margin: [0, 1, 0, 0] as [number, number, number, number] },
      proposalLabel: { fontSize: 22, bold: true, color: COLORS.accent },
      proposalNumber: { fontSize: 11, color: COLORS.lightText, margin: [0, 2, 0, 0] as [number, number, number, number] },
      proposalMeta: { fontSize: 9, color: COLORS.lightText, margin: [0, 2, 0, 0] as [number, number, number, number] },
      proposalTitle: { fontSize: 16, bold: true, color: COLORS.primary },
      sectionLabel: { fontSize: 9, color: COLORS.lightText, margin: [0, 0, 0, 2] as [number, number, number, number] },
      clientName: { fontSize: 14, bold: true, color: COLORS.primary },
      clientDetail: { fontSize: 10, color: COLORS.lightText, margin: [0, 1, 0, 0] as [number, number, number, number] },
      sectionHeader: { fontSize: 13, bold: true, color: COLORS.primary, margin: [0, 10, 0, 5] as [number, number, number, number] },
      bodyText: { fontSize: 10, color: COLORS.text, lineHeight: 1.4 },
      tableHeader: { fontSize: 9, bold: true, color: COLORS.primary },
      signatureLabel: { fontSize: 8, color: COLORS.lightText },
    },
    pageMargins: [40, 40, 40, 60] as [number, number, number, number],
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: `${branding.companyName} - ${contract.contractNumber}`,
          fontSize: 8,
          color: COLORS.lightText,
          margin: [40, 0, 0, 0] as [number, number, number, number],
        },
        {
          text: `Page ${currentPage} of ${pageCount}`,
          fontSize: 8,
          color: COLORS.lightText,
          alignment: 'right' as const,
          margin: [0, 0, 40, 0] as [number, number, number, number],
        },
      ],
    }),
  };

  return buildPdfBuffer(docDefinition);
}
