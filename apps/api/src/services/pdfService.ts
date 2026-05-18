// @ts-expect-error - pdfmake/src/printer has no type declarations
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

type PdfNumeric = number | string | { toString(): string };

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

interface AddressLike {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  postalCode?: string | null;
}

function asAddressLike(value: unknown): AddressLike | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as AddressLike;
}

interface PdfTableNode {
  table: {
    body: TableCell[][];
  };
}

function keepTogether(
  stack: Content[],
  margin?: [number, number, number, number]
): Content {
  return {
    stack,
    ...(margin ? { margin } : {}),
    unbreakable: true,
  } as Content;
}

interface ProposalOperationalEstimate {
  durationRangePerVisit?: {
    minHours?: PdfNumeric | null;
    maxHours?: PdfNumeric | null;
  } | null;
  recommendedCrewSize?: number | null;
  hoursPerVisit?: PdfNumeric | null;
}

interface ProposalPricingSnapshot {
  operationalEstimate?: ProposalOperationalEstimate | null;
}

interface ResidentialHomeProfile {
  homeType?: string | null;
  squareFeet?: PdfNumeric | null;
  bedrooms?: number | null;
  fullBathrooms?: number | null;
  halfBathrooms?: number | null;
  condition?: string | null;
  occupiedStatus?: string | null;
  hasPets?: boolean | null;
  parkingAccess?: string | null;
  entryNotes?: string | null;
  specialInstructions?: string | null;
  lastProfessionalCleaning?: string | null;
}

interface QuotationPricingMeta {
  quantity?: number;
  unitType?: string | null;
  unitPrice?: PdfNumeric | null;
  discountPercent?: number | null;
  addOns?: {
    name: string;
    quantity: number;
    total: PdfNumeric;
  }[];
}

function getResidentialVisitPrice(pricingMeta: unknown): number | null {
  if (!pricingMeta || typeof pricingMeta !== 'object' || Array.isArray(pricingMeta)) {
    return null;
  }
  const value = (pricingMeta as { visitPrice?: unknown }).visitPrice;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function getBillingUnitLabel(pricingMeta: unknown): string {
  if (!pricingMeta || typeof pricingMeta !== 'object' || Array.isArray(pricingMeta)) {
    return '/month';
  }
  return (pricingMeta as { billingMode?: unknown }).billingMode === 'one_time' ? ' one-time' : '/month';
}

function formatCurrency(amount: PdfNumeric): string {
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

function formatWholeHours(hours: PdfNumeric | null | undefined): string {
  const parsed = Number(hours);
  if (!Number.isFinite(parsed) || parsed <= 0) return '-';
  return `${Math.round(parsed)} hrs`;
}

function formatEstimatedTimeOnSite(hours: PdfNumeric | null | undefined): string {
  const parsed = Number(hours);
  if (!Number.isFinite(parsed) || parsed <= 0) return 'To be confirmed';

  const totalMinutes = Math.max(1, Math.round(parsed * 60));
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (wholeHours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${wholeHours} hr${wholeHours === 1 ? '' : 's'}`;
  }

  return `${wholeHours} hr${wholeHours === 1 ? '' : 's'} ${minutes} min`;
}

const PROPOSAL_FREQUENCY_LABELS: Record<string, string> = {
  '1x_week': '1x Week',
  '2x_week': '2x Week',
  '3x_week': '3x Week',
  '4x_week': '4x Week',
  '5x_week': '5x Week',
  '7x_week': '7x Week',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
  one_time: 'One-Time',
};

export function formatProposalPdfFrequencyLabel(value: string | null | undefined): string {
  const rawValue = (value ?? '').trim();
  if (!rawValue) return 'N/A';

  const normalized = rawValue.toLowerCase();
  return PROPOSAL_FREQUENCY_LABELS[normalized] ?? rawValue.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function getScheduleFrequency(serviceSchedule: unknown): string | null {
  if (!serviceSchedule || typeof serviceSchedule !== 'object') return null;

  const frequency = (serviceSchedule as { frequency?: unknown }).frequency;
  return typeof frequency === 'string' ? frequency : null;
}

function isZeroQuantityTask(task: string): boolean {
  return /\bx\s*0(?:\.0+)?\b/i.test(task.trim());
}

interface ProposalForPdf {
  proposalNumber: string;
  title: string;
  status: string;
  description?: string | null;
  subtotal: PdfNumeric;
  taxRate: PdfNumeric;
  taxAmount: PdfNumeric;
  totalAmount: PdfNumeric;
  validUntil?: string | Date | null;
  createdAt: string | Date;
  serviceFrequency?: string | null;
  serviceSchedule?: unknown;
  account: { name: string };
  facility?: { name: string; address?: unknown } | null;
  createdByUser?: { fullName: string; email: string } | null;
  proposalItems: {
    itemType: string;
    description: string;
    quantity: PdfNumeric;
    unitPrice: PdfNumeric;
    totalPrice: PdfNumeric;
  }[];
  proposalServices: {
    serviceName: string;
    serviceType: string;
    frequency: string;
    estimatedHours?: PdfNumeric | null;
    hourlyRate?: PdfNumeric | null;
    monthlyPrice: PdfNumeric;
    description?: string | null;
    includedTasks?: unknown;
    pricingMeta?: unknown;
  }[];
  pricingSnapshot?: unknown;
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
      const addr = asAddressLike(proposal.facility.address);
      if (addr) {
        const addrParts = [addr.street, addr.city, addr.state, addr.zip]
          .filter(Boolean)
          .join(', ');
        if (addrParts) {
          clientInfo.push({ text: addrParts, style: 'clientDetail' });
        }
      }
    }
  }
  content.push({
    stack: clientInfo,
    margin: [0, 0, 0, 20] as [number, number, number, number],
  });

  // Description
  if (proposal.description) {
    content.push(keepTogether([
      { text: 'Description', style: 'sectionHeader' },
      {
        text: proposal.description,
        style: 'bodyText',
      },
    ], [0, 0, 0, 15] as [number, number, number, number]));
  }

  // Services & Areas
  if (proposal.proposalServices.length > 0) {
    content.push({ text: 'Services & Areas', style: 'sectionHeader' });

    for (const service of proposal.proposalServices) {
      // Parse description: first line is area info, remaining are "Frequency: task1, task2"
      const lines = service.description?.split('\n') ?? [];
      const areaInfo = lines[0] ?? '';
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
      const visitPrice = getResidentialVisitPrice(service.pricingMeta);
      areaStack.push({
        columns: [
          { text: service.serviceName, bold: true, fontSize: 11, color: COLORS.primary },
          {
            stack: [
              { text: formatCurrency(service.monthlyPrice) + getBillingUnitLabel(service.pricingMeta), alignment: 'right' as const, bold: true, fontSize: 11, color: COLORS.primary },
              ...(visitPrice != null
                ? [{ text: `${formatCurrency(visitPrice)} per visit`, alignment: 'right' as const, fontSize: 8, color: COLORS.lightText }]
                : []),
            ],
          },
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

      // Keep each area and its assigned task groups together when possible so
      // a task block does not split awkwardly across pages in the client PDF.
      content.push(keepTogether([
        ...areaStack,
        // Divider between areas
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: COLORS.border }],
          margin: [0, 0, 0, 0] as [number, number, number, number],
        },
      ], [0, 8, 0, 8] as [number, number, number, number]));
    }
  }

  const proposalPricingSnapshot =
    proposal.pricingSnapshot && typeof proposal.pricingSnapshot === 'object' && !Array.isArray(proposal.pricingSnapshot)
      ? proposal.pricingSnapshot as ProposalPricingSnapshot
      : null;

  // Estimated Time On Site
  if (proposalPricingSnapshot?.operationalEstimate) {
    const estimate = proposalPricingSnapshot.operationalEstimate;
    content.push(keepTogether([
      { text: 'Estimated Time On Site', style: 'sectionHeader' },
      {
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
              { text: `${estimate.recommendedCrewSize ?? 1} cleaners`, fontSize: 10, bold: true, color: COLORS.text },
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
      },
    ]));
  }

  const pricingSummaryStack: Content[] = [];

  // Services summary table
  if (proposal.proposalServices.length > 0) {
    const proposalFrequency = proposal.serviceFrequency ?? getScheduleFrequency(proposal.serviceSchedule);
    const hasAnyHours = proposal.proposalServices.some(
      (service) => service.estimatedHours != null && Number(service.estimatedHours) > 0
    );
    const hasVisitRates = proposal.proposalServices.some((service) => getResidentialVisitPrice(service.pricingMeta) != null);
    const areasBody: TableCell[][] = [[
      { text: 'Service', style: 'tableHeader' },
      { text: 'Frequency', style: 'tableHeader' },
      ...(hasAnyHours ? [{ text: 'Hours', style: 'tableHeader', alignment: 'right' as const }] : []),
      ...(hasVisitRates ? [{ text: 'Visit Rate', style: 'tableHeader', alignment: 'right' as const }] : []),
      { text: 'Amount', style: 'tableHeader', alignment: 'right' as const },
    ]];

    let totalHours = 0;
    let totalMonthly = 0;

    for (const service of proposal.proposalServices) {
      const hours = service.estimatedHours ? Number(service.estimatedHours) : 0;
      const visitPrice = getResidentialVisitPrice(service.pricingMeta);
      totalHours += hours;
      totalMonthly += Number(service.monthlyPrice);

      areasBody.push([
        { text: service.serviceName, fontSize: 9 },
        { text: formatProposalPdfFrequencyLabel(proposalFrequency ?? service.frequency), fontSize: 9 },
        ...(hasAnyHours ? [{ text: hours > 0 ? formatWholeHours(hours) : '-', alignment: 'right' as const, fontSize: 9 }] : []),
        ...(hasVisitRates ? [{ text: visitPrice != null ? `${formatCurrency(visitPrice)}/visit` : '-', alignment: 'right' as const, fontSize: 9 }] : []),
        { text: formatCurrency(service.monthlyPrice), alignment: 'right' as const, fontSize: 9 },
      ]);
    }

    // Total row
    areasBody.push([
      { text: 'Total', bold: true, fontSize: 9 },
      { text: '', fontSize: 9 },
      ...(hasAnyHours ? [{ text: totalHours > 0 ? formatWholeHours(totalHours) : '', alignment: 'right' as const, bold: true, fontSize: 9 }] : []),
      ...(hasVisitRates ? [{ text: '', fontSize: 9 }] : []),
      { text: formatCurrency(totalMonthly), alignment: 'right' as const, bold: true, fontSize: 9 },
    ]);

    pricingSummaryStack.push({
      table: {
        headerRows: 1,
        dontBreakRows: true,
        keepWithHeaderRows: 1,
        widths: hasAnyHours
          ? (hasVisitRates ? ['*', 90, 50, 75, 80] : ['*', 100, 60, 90])
          : (hasVisitRates ? ['*', 100, 75, 80] : ['*', 130, 90]),
        body: areasBody,
      },
      layout: {
        hLineWidth: (i: number, node: PdfTableNode) => (i === 0 || i === 1 || i === node.table.body.length - 1 || i === node.table.body.length ? 1 : 0.5),
        vLineWidth: () => 0,
        hLineColor: (i: number, node: PdfTableNode) => (i === 0 || i === 1 || i === node.table.body.length - 1 ? COLORS.accent : COLORS.border),
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
    (item) => Number(item.totalPrice ?? 0) > 0
  );
  if (visibleProposalItems.length > 0) {
    pricingSummaryStack.push({ text: 'Line Items', style: 'sectionHeader' });

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

    pricingSummaryStack.push({
      table: {
        headerRows: 1,
        dontBreakRows: true,
        keepWithHeaderRows: 1,
        widths: ['*', 50, 90, 90],
        body: itemsBody,
      },
      layout: {
        hLineWidth: (i: number, node: PdfTableNode) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5),
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
  pricingSummaryStack.push({
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
          hLineWidth: (i: number, node: PdfTableNode) => (i === node.table.body.length - 1 ? 1 : 0),
          vLineWidth: () => 0,
          hLineColor: () => COLORS.accent,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
      },
    ],
    margin: [0, 10, 0, 25] as [number, number, number, number],
  });

  // Keep the pricing rows and final total together. This prevents the PDF
  // preview from showing services on one page and the total alone on the next.
  if (pricingSummaryStack.length > 0) {
    content.push(keepTogether(pricingSummaryStack));
  }

  // Terms (aligned with public Review & Sign page)
  content.push(keepTogether([
    { text: 'Terms', style: 'sectionHeader' },
    {
      ul: [
        `This proposal is valid until ${formatDate(proposal.validUntil)}.`,
        'All prices shown are monthly recurring charges unless otherwise noted.',
        'Acceptance of this proposal constitutes agreement to the services and pricing described herein.',
      ],
      margin: [0, 4, 0, 0] as [number, number, number, number],
      fontSize: 9,
      color: COLORS.text,
    },
  ]));

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
  monthlyValue: PdfNumeric;
  totalValue?: PdfNumeric | null;
  billingCycle: string;
  paymentTerms: string;
  serviceFrequency?: string | null;
  serviceSchedule?: unknown;
  termsAndConditions?: string | null;
  specialInstructions?: string | null;
  equipmentProvidedBy?: string | null;
  chemicalsProvidedBy?: string | null;
  approvedChemicalNotes?: string | null;
  restrictedChemicalNotes?: string | null;
  equipmentNotes?: string | null;
  requiresSpecialEquipment?: boolean | null;
  specialEquipmentNotes?: string | null;
  sdsRequired?: boolean | null;
  storageAllowedOnSite?: boolean | null;
  signedByName?: string | null;
  signedByEmail?: string | null;
  signedDate?: string | Date | null;
  createdAt: string | Date;
  account: { name: string };
  facility?: { name: string; address?: unknown } | null;
  proposal?: {
    proposalServices?: {
      serviceName: string;
      frequency?: string | null;
      description?: string | null;
      includedTasks?: unknown;
    }[] | null;
  } | null;
  createdByUser?: { fullName: string; email: string } | null;
}

function parseServiceTaskGroups(
  description?: string | null,
  includedTasks?: unknown
): { areaInfo: string; groups: { label: string; tasks: string[] }[] } {
  const explicitTasks = (Array.isArray(includedTasks) ? includedTasks : [])
    .filter((task): task is string => typeof task === 'string')
    .map((task) => task.trim())
    .filter((task) => task && !isZeroQuantityTask(task));

  if (explicitTasks.length > 0) {
    return {
      areaInfo: description?.split('\n')[0]?.trim() ?? '',
      groups: [{ label: 'Included Tasks', tasks: explicitTasks }],
    };
  }

  const lines = description?.split('\n') ?? [];
  const groups: { label: string; tasks: string[] }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const match = lines[i].match(/^(.+?):\s*(.+)$/);
    if (!match) continue;

    const tasks = match[2]
      .split(',')
      .map((task) => task.trim())
      .filter((task) => task && !isZeroQuantityTask(task));

    if (tasks.length > 0) {
      groups.push({
        label: match[1].trim(),
        tasks,
      });
    }
  }

  return {
    areaInfo: lines[0]?.trim() ?? '',
    groups,
  };
}

function formatProviderLabel(value: string | null | undefined): string {
  switch ((value ?? '').toLowerCase()) {
    case 'client':
      return 'Client';
    case 'mixed':
      return 'Mixed';
    case 'company':
    default:
      return 'Company';
  }
}

interface ResidentialQuoteForPdf {
  quoteNumber: string;
  title: string;
  status: string;
  createdAt: string | Date;
  preferredStartDate?: string | Date | null;
  totalAmount: PdfNumeric;
  estimatedHours?: PdfNumeric | null;
  notes?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  serviceType: string;
  frequency: string;
  account?: { name: string } | null;
  property?: {
    name: string;
    serviceAddress?: unknown;
    homeProfile?: unknown;
  } | null;
  homeAddress?: unknown;
  homeProfile?: unknown;
  addOns?: {
    label: string;
    quantity: number;
    pricingType: string;
    unitLabel?: string | null;
    unitPrice: PdfNumeric;
    lineTotal: PdfNumeric;
  }[];
  priceBreakdown?: unknown;
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

  const propertyAddress = asAddressLike(quote.property?.serviceAddress ?? quote.homeAddress ?? null);
  const homeProfile = (quote.property?.homeProfile ?? quote.homeProfile ?? null) as ResidentialHomeProfile | null;
  const priceBreakdown =
    quote.priceBreakdown && typeof quote.priceBreakdown === 'object' && !Array.isArray(quote.priceBreakdown)
      ? quote.priceBreakdown as {
          baseSubtotal?: PdfNumeric;
          recurringDiscount?: PdfNumeric;
          firstCleanSurcharge?: PdfNumeric;
          addOnTotal?: PdfNumeric;
          estimatedHours?: PdfNumeric;
          guidance?: string[];
        }
      : null;
  const estimatedTimeOnSite = formatEstimatedTimeOnSite(
    quote.estimatedHours ?? priceBreakdown?.estimatedHours
  );
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
    { text: quote.customerName ?? quote.account?.name ?? 'Residential Client', style: 'clientName' },
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
          { text: quote.property?.name ?? 'Residential Property', fontSize: 10, bold: true },
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
          { text: 'Estimated Time On Site', fontSize: 8, color: COLORS.lightText },
          { text: estimatedTimeOnSite, fontSize: 10, bold: true },
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
            { text: formatResidentialServiceType(String(homeProfile.homeType ?? '')), fontSize: 10, bold: true },
          ],
          width: '*',
        },
        {
          stack: [
            { text: 'Square Feet', fontSize: 8, color: COLORS.lightText },
            { text: Number(homeProfile.squareFeet ?? 0).toLocaleString(), fontSize: 10, bold: true },
          ],
          width: '*',
        },
        {
          stack: [
            { text: 'Bedrooms / Baths', fontSize: 8, color: COLORS.lightText },
            {
              text: `${homeProfile.bedrooms ?? 0} bd / ${((homeProfile.fullBathrooms ?? 0) + (homeProfile.halfBathrooms ?? 0) * 0.5)} ba`,
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
            { text: formatResidentialServiceType(String(homeProfile.condition ?? 'standard')), fontSize: 10, bold: true },
          ],
          width: '*',
        },
        {
          stack: [
            { text: 'Occupancy', fontSize: 8, color: COLORS.lightText },
            { text: formatResidentialServiceType(String(homeProfile.occupiedStatus ?? 'occupied')), fontSize: 10, bold: true },
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
        { text: String(addOn.quantity ?? 1), alignment: 'right' as const, fontSize: 9 },
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
        hLineWidth: (i: number, node: PdfTableNode) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5),
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
      `Estimated time on site: ${estimatedTimeOnSite}`,
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
              { text: formatCurrency(priceBreakdown?.baseSubtotal ?? quote.totalAmount), alignment: 'right' as const },
            ],
            [
              { text: 'Recurring Discount', alignment: 'right' as const, color: COLORS.lightText },
              { text: formatCurrency(priceBreakdown?.recurringDiscount ?? 0), alignment: 'right' as const },
            ],
            [
              { text: 'First Clean Surcharge', alignment: 'right' as const, color: COLORS.lightText },
              { text: formatCurrency(priceBreakdown?.firstCleanSurcharge ?? 0), alignment: 'right' as const },
            ],
            [
              { text: 'Add-Ons', alignment: 'right' as const, color: COLORS.lightText },
              { text: formatCurrency(priceBreakdown?.addOnTotal ?? 0), alignment: 'right' as const },
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
          hLineWidth: (i: number, node: PdfTableNode) => (i === node.table.body.length - 1 ? 1 : 0),
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

  if (priceBreakdown?.guidance?.length) {
    content.push({ text: 'Guidance', style: 'sectionHeader' });
    content.push({
      ul: priceBreakdown.guidance,
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
      const addr = asAddressLike(contract.facility.address);
      if (addr) {
        const addrParts = [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ');
        if (addrParts) clientInfo.push({ text: addrParts, style: 'clientDetail' });
      }
    }
  }
  content.push({ stack: clientInfo, margin: [0, 0, 0, 20] as [number, number, number, number] });

  const termsBody: TableCell[][] = [
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
          `${extractFacilityTimezone(contract.facility?.address) ?? 'Facility timezone'} ` +
          '(start day anchor)',
      },
    ]);
  }

  content.push(keepTogether([
    { text: 'Service Terms', style: 'sectionHeader' },
    {
      table: {
        headerRows: 0,
        widths: [150, '*'],
        body: termsBody,
      },
      layout: {
        hLineWidth: (i: number, node: PdfTableNode) => (i === 0 || i === node.table.body.length ? 1 : 0.5),
        vLineWidth: () => 0,
        hLineColor: () => COLORS.border,
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 6,
        paddingBottom: () => 6,
      },
      margin: [0, 5, 0, 15] as [number, number, number, number],
    },
  ]));

  const contractServices = contract.proposal?.proposalServices ?? [];
  if (contractServices.length > 0) {
    content.push({ text: 'Service Scope', style: 'sectionHeader' });

    for (const service of contractServices) {
      const { areaInfo, groups } = parseServiceTaskGroups(
        service.description,
        service.includedTasks
      );
      const serviceStack: Content[] = [
        {
          columns: [
            { text: service.serviceName, bold: true, fontSize: 11, color: COLORS.primary },
            ...(service.frequency
              ? [
                  {
                    text: service.frequency
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (c: string) => c.toUpperCase()),
                    alignment: 'right' as const,
                    fontSize: 9,
                    color: COLORS.lightText,
                  },
                ]
              : []),
          ],
          margin: [0, 0, 0, 3] as [number, number, number, number],
        },
      ];

      if (areaInfo) {
        serviceStack.push({
          text: areaInfo,
          fontSize: 9,
          color: COLORS.lightText,
          margin: [0, 0, 0, 4] as [number, number, number, number],
        });
      }

      if (groups.length > 0) {
        for (const group of groups) {
          serviceStack.push({
            text: group.label.toUpperCase(),
            fontSize: 8,
            bold: true,
            color: COLORS.lightText,
            margin: [0, 4, 0, 2] as [number, number, number, number],
          });
          serviceStack.push(
            ...group.tasks.map((task) => ({
              columns: [
                { text: '\u2022', width: 10, fontSize: 9, color: COLORS.accent },
                { text: task, fontSize: 9, color: COLORS.text },
              ],
              margin: [8, 0, 0, 1] as [number, number, number, number],
            }))
          );
        }
      } else if (service.description) {
        serviceStack.push({
          text: service.description,
          style: 'bodyText',
          margin: [0, 0, 0, 4] as [number, number, number, number],
        });
      }

      content.push(keepTogether([{
        stack: serviceStack,
        margin: [0, 6, 0, 8] as [number, number, number, number],
      }]));
    }
  }

  const financialBody: TableCell[][] = [
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

  content.push(keepTogether([
    { text: 'Financial Terms', style: 'sectionHeader' },
    {
      table: {
        headerRows: 0,
        widths: [150, '*'],
        body: financialBody,
      },
      layout: {
        hLineWidth: (i: number, node: PdfTableNode) => (i === 0 || i === node.table.body.length ? 1 : 0.5),
        vLineWidth: () => 0,
        hLineColor: () => COLORS.border,
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 6,
        paddingBottom: () => 6,
      },
      margin: [0, 5, 0, 15] as [number, number, number, number],
    },
  ]));

  const suppliesBody: TableCell[][] = [
    [
      { text: 'Equipment Provided By', style: 'tableHeader' },
      { text: formatProviderLabel(contract.equipmentProvidedBy) },
    ],
    [
      { text: 'Chemicals Provided By', style: 'tableHeader' },
      { text: formatProviderLabel(contract.chemicalsProvidedBy) },
    ],
    [
      { text: 'SDS Required', style: 'tableHeader' },
      { text: contract.sdsRequired === false ? 'No' : 'Yes' },
    ],
    [
      { text: 'On-Site Storage', style: 'tableHeader' },
      { text: contract.storageAllowedOnSite ? 'Allowed' : 'Not allowed unless approved' },
    ],
  ];

  if (contract.approvedChemicalNotes) {
    suppliesBody.push([
      { text: 'Approved Chemicals', style: 'tableHeader' },
      { text: contract.approvedChemicalNotes },
    ]);
  }

  if (contract.restrictedChemicalNotes) {
    suppliesBody.push([
      { text: 'Restricted Chemicals', style: 'tableHeader' },
      { text: contract.restrictedChemicalNotes },
    ]);
  }

  if (contract.equipmentNotes) {
    suppliesBody.push([
      { text: 'Equipment Notes', style: 'tableHeader' },
      { text: contract.equipmentNotes },
    ]);
  }

  if (contract.requiresSpecialEquipment || contract.specialEquipmentNotes) {
    suppliesBody.push([
      { text: 'Special Equipment', style: 'tableHeader' },
      { text: contract.specialEquipmentNotes || 'Required' },
    ]);
  }

  content.push(keepTogether([
    { text: 'Supplies, Equipment & Chemicals', style: 'sectionHeader' },
    {
      table: {
        headerRows: 0,
        widths: [150, '*'],
        body: suppliesBody,
      },
      layout: {
        hLineWidth: (i: number, node: PdfTableNode) => (i === 0 || i === node.table.body.length ? 1 : 0.5),
        vLineWidth: () => 0,
        hLineColor: () => COLORS.border,
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 6,
        paddingBottom: () => 6,
      },
      margin: [0, 5, 0, 15] as [number, number, number, number],
    },
  ]));

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
          const sectionStack: Content[] = [{
            text: heading,
            fontSize: 11,
            bold: true,
            color: COLORS.primary,
            margin: [0, 8, 0, 4] as [number, number, number, number],
          }];
          if (body) {
            sectionStack.push({
              text: body,
              style: 'bodyText',
              margin: [0, 0, 0, 6] as [number, number, number, number],
            });
          }
          content.push(keepTogether(sectionStack));
        } else {
          content.push(keepTogether([{
            text: trimmed,
            style: 'bodyText',
            margin: [0, 0, 0, 6] as [number, number, number, number],
          }]));
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
    content.push(keepTogether([
      { text: 'Special Instructions', style: 'sectionHeader' },
      {
        text: contract.specialInstructions,
        style: 'bodyText',
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
    ]));
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

  content.push(keepTogether([{
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
  }]));

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

// ============================================================
// Quotation PDF
// ============================================================

interface QuotationForPdf {
  quotationNumber: string;
  title: string;
  status: string;
  description?: string | null;
  subtotal: PdfNumeric;
  taxRate: PdfNumeric;
  taxAmount: PdfNumeric;
  totalAmount: PdfNumeric;
  validUntil?: string | Date | null;
  scheduledDate?: string | Date | null;
  scheduledStartTime?: string | Date | null;
  scheduledEndTime?: string | Date | null;
  termsAndConditions?: string | null;
  signatureName?: string | null;
  signatureDate?: string | Date | null;
  createdAt: string | Date;
  account: { name: string };
  facility?: { name: string; address?: unknown } | null;
  createdByUser?: { fullName: string; email: string } | null;
  services: {
    serviceName: string;
    description?: string | null;
    price: PdfNumeric;
    includedTasks?: unknown;
    pricingMeta?: unknown;
    sortOrder?: number;
  }[];
}

function formatQuotationTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function generateQuotationPdf(quotation: QuotationForPdf): Promise<Buffer> {
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

  const metaStack: Content[] = [
    { text: 'QUOTATION', style: 'proposalLabel' },
    { text: quotation.quotationNumber, style: 'proposalNumber' },
    { text: `Date: ${formatDate(quotation.createdAt)}`, style: 'proposalMeta' },
  ];
  if (quotation.validUntil) {
    metaStack.push({ text: `Valid Until: ${formatDate(quotation.validUntil)}`, style: 'proposalMeta' });
  }
  if (quotation.scheduledDate) {
    const timeRange = [
      formatQuotationTime(quotation.scheduledStartTime),
      formatQuotationTime(quotation.scheduledEndTime),
    ].filter(Boolean).join(' - ');
    metaStack.push({
      text: `Scheduled: ${formatDate(quotation.scheduledDate)}${timeRange ? ` ${timeRange}` : ''}`,
      style: 'proposalMeta',
    });
  }

  content.push({
    columns: [
      { stack: headerStack, width: '*' },
      { stack: metaStack, width: 200, alignment: 'right' as const },
    ],
    margin: [0, 0, 0, 20] as [number, number, number, number],
  });

  // Divider
  content.push({
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: COLORS.accent }],
    margin: [0, 0, 0, 20] as [number, number, number, number],
  });

  // Title
  content.push({
    text: quotation.title,
    style: 'proposalTitle',
    margin: [0, 0, 0, 15] as [number, number, number, number],
  });

  // Client Info
  const clientInfo: Content[] = [
    { text: 'Prepared For:', style: 'sectionLabel' },
    { text: quotation.account.name, style: 'clientName' },
  ];
  if (quotation.facility) {
    clientInfo.push({ text: quotation.facility.name, style: 'clientDetail' });
    if (quotation.facility.address) {
      const addr = asAddressLike(quotation.facility.address);
      if (addr) {
        const addrParts = [addr.street, addr.city, addr.state, addr.zip ?? addr.postalCode]
          .filter(Boolean)
          .join(', ');
        if (addrParts) {
          clientInfo.push({ text: addrParts, style: 'clientDetail' });
        }
      }
    }
  }
  content.push({
    stack: clientInfo,
    margin: [0, 0, 0, 20] as [number, number, number, number],
  });

  // Description
  if (quotation.description) {
    content.push({ text: 'Description', style: 'sectionHeader' });
    content.push({
      text: quotation.description,
      style: 'bodyText',
      margin: [0, 0, 0, 15] as [number, number, number, number],
    });
  }

  // Services Table
  if (quotation.services.length > 0) {
    content.push({ text: 'Services', style: 'sectionHeader' });

    const servicesBody: TableCell[][] = [
      [
        { text: 'Service', style: 'tableHeader' },
        { text: 'Details', style: 'tableHeader' },
        { text: 'Amount', style: 'tableHeader', alignment: 'right' as const },
      ],
    ];

    for (const service of quotation.services) {
      const details: string[] = [];
      if (service.description) details.push(service.description);

      const meta =
        service.pricingMeta && typeof service.pricingMeta === 'object' && !Array.isArray(service.pricingMeta)
          ? service.pricingMeta as QuotationPricingMeta
          : null;
      if (meta) {
        if (typeof meta.quantity === 'number' && meta.unitType) {
          const unitLabel = meta.unitType === 'per_window' ? 'window' : meta.unitType === 'per_sqft' ? 'sqft' : meta.unitType === 'fixed' ? 'service' : meta.unitType.replace(/_/g, ' ');
          details.push(`${meta.quantity} ${unitLabel}${typeof meta.unitPrice === 'number' ? ` @ ${formatCurrency(meta.unitPrice)}/${unitLabel}` : ''}`);
        }
        if (typeof meta.discountPercent === 'number' && meta.discountPercent > 0) {
          details.push(`${meta.discountPercent.toFixed(2)}% discount applied`);
        }
        if (Array.isArray(meta.addOns)) {
          for (const addOn of meta.addOns) {
            details.push(`Add-on: ${addOn.name} x${addOn.quantity} (${formatCurrency(addOn.total)})`);
          }
        }
      }

      const tasks = Array.isArray(service.includedTasks) ? service.includedTasks : [];

      servicesBody.push([
        {
          stack: [
            { text: service.serviceName, bold: true, fontSize: 10 },
            ...(tasks.length > 0
              ? tasks.map((task: string) => ({
                  text: `\u2022 ${task}`,
                  fontSize: 8,
                  color: COLORS.lightText,
                  margin: [4, 1, 0, 0] as [number, number, number, number],
                }))
              : []),
          ],
        },
        { text: details.join('\n'), fontSize: 9, color: COLORS.lightText },
        { text: formatCurrency(service.price), alignment: 'right' as const, bold: true, fontSize: 10 },
      ]);
    }

    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 160, 90],
        body: servicesBody,
      },
      layout: {
        hLineWidth: (i: number, node: PdfTableNode) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5),
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
  const summaryRows: TableCell[][] = [
    [
      { text: 'Subtotal', alignment: 'right' as const, color: COLORS.lightText },
      { text: formatCurrency(quotation.subtotal), alignment: 'right' as const },
    ],
  ];

  if (Number(quotation.taxRate) > 0) {
    summaryRows.push([
      {
        text: `Tax (${(Number(quotation.taxRate) * 100).toFixed(1)}%)`,
        alignment: 'right' as const,
        color: COLORS.lightText,
      },
      { text: formatCurrency(quotation.taxAmount), alignment: 'right' as const },
    ]);
  }

  summaryRows.push([
    { text: 'Total', alignment: 'right' as const, bold: true, fontSize: 14 },
    {
      text: formatCurrency(quotation.totalAmount),
      alignment: 'right' as const,
      bold: true,
      fontSize: 14,
      color: COLORS.primary,
    },
  ]);

  content.push({
    columns: [
      { width: '*', text: '' },
      {
        width: 250,
        table: {
          widths: ['*', 100],
          body: summaryRows,
        },
        layout: {
          hLineWidth: (i: number, node: PdfTableNode) => (i === node.table.body.length - 1 ? 1 : 0),
          vLineWidth: () => 0,
          hLineColor: () => COLORS.accent,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
      },
    ],
    margin: [0, 10, 0, 25] as [number, number, number, number],
  });

  // Terms & Conditions
  if (quotation.termsAndConditions) {
    content.push({ text: 'Terms & Conditions', style: 'sectionHeader' });
    content.push({
      text: quotation.termsAndConditions,
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

  if (quotation.signatureName) {
    clientSigStack.push(
      { text: quotation.signatureName, fontSize: 10, margin: [0, 4, 0, 0] as [number, number, number, number] },
      { text: `Signed: ${formatDate(quotation.signatureDate)}`, style: 'signatureLabel' },
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
          text: `${branding.companyName} - ${quotation.quotationNumber}`,
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
