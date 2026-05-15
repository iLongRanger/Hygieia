// @ts-expect-error - pdfmake/src/printer has no type declarations
import PdfPrinter from 'pdfmake/src/printer.js';
import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import { getDefaultBranding, getGlobalSettings } from './globalSettingsService';
import type { GlobalBranding } from '../types/branding';

type PdfNumeric = number | string | { toString(): string };

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
};

interface AddressLike {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  postalCode?: string;
}

function asAddressLike(value: unknown): AddressLike | null {
  if (!value || typeof value !== 'object') return null;
  return value as AddressLike;
}

function formatCurrency(amount: PdfNumeric): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
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

export interface InvoiceItemForPdf {
  description: string;
  quantity: PdfNumeric;
  unitPrice: PdfNumeric;
  totalPrice: PdfNumeric;
}

export interface InvoiceForPdf {
  invoiceNumber: string;
  issueDate: string | Date;
  dueDate: string | Date;
  periodStart: string | Date | null;
  periodEnd: string | Date | null;
  notes: string | null;
  paymentInstructions: string | null;
  subtotal: PdfNumeric;
  taxRate: PdfNumeric;
  taxAmount: PdfNumeric;
  totalAmount: PdfNumeric;
  amountPaid: PdfNumeric;
  balanceDue: PdfNumeric;
  account: { name: string; billingAddress: unknown };
  facility: { name: string; address: unknown } | null;
  items: InvoiceItemForPdf[];
}

export async function generateInvoicePdf(invoice: InvoiceForPdf): Promise<Buffer> {
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
  );

  const metaStack: Content[] = [
    { text: 'INVOICE', style: 'docLabel' },
    { text: invoice.invoiceNumber, style: 'docNumber' },
    { text: `Issued: ${formatDate(invoice.issueDate)}`, style: 'docMeta' },
    { text: `Due: ${formatDate(invoice.dueDate)}`, style: 'docMeta' },
  ];

  content.push({
    columns: [
      { stack: headerStack, width: '*' },
      { stack: metaStack, width: 200, alignment: 'right' as const },
    ],
    margin: [0, 0, 0, 20] as [number, number, number, number],
  });

  content.push({
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: COLORS.accent }],
    margin: [0, 0, 0, 20] as [number, number, number, number],
  });

  const billTo: Content[] = [
    { text: 'Bill To:', style: 'sectionLabel' },
    { text: invoice.account.name, style: 'clientName' },
  ];
  const billingAddr = asAddressLike(invoice.account.billingAddress);
  if (billingAddr) {
    const line = [billingAddr.street, billingAddr.city, billingAddr.state, billingAddr.zip ?? billingAddr.postalCode]
      .filter(Boolean)
      .join(', ');
    if (line) billTo.push({ text: line, style: 'clientDetail' });
  }
  if (invoice.facility) {
    billTo.push({ text: `Service Location: ${invoice.facility.name}`, style: 'clientDetail' });
  }

  const periodInfo: Content[] = [];
  if (invoice.periodStart && invoice.periodEnd) {
    periodInfo.push(
      { text: 'Service Period:', style: 'sectionLabel' },
      {
        text: `${formatDate(invoice.periodStart)} - ${formatDate(invoice.periodEnd)}`,
        style: 'clientDetail',
      },
    );
  }

  content.push({
    columns: [
      { stack: billTo, width: '*' },
      { stack: periodInfo, width: 220, alignment: 'right' as const },
    ],
    margin: [0, 0, 0, 20] as [number, number, number, number],
  });

  const itemsBody: TableCell[][] = [
    [
      { text: 'Description', style: 'tableHeader' },
      { text: 'Qty', style: 'tableHeader', alignment: 'right' as const },
      { text: 'Unit', style: 'tableHeader', alignment: 'right' as const },
      { text: 'Amount', style: 'tableHeader', alignment: 'right' as const },
    ],
  ];
  for (const item of invoice.items) {
    itemsBody.push([
      { text: item.description, fontSize: 9 },
      { text: String(item.quantity), fontSize: 9, alignment: 'right' as const },
      { text: formatCurrency(item.unitPrice), fontSize: 9, alignment: 'right' as const },
      { text: formatCurrency(item.totalPrice), fontSize: 9, alignment: 'right' as const, bold: true },
    ]);
  }

  content.push({
    table: { headerRows: 1, widths: ['*', 50, 70, 80], body: itemsBody },
    layout: {
      hLineColor: () => COLORS.border,
      vLineColor: () => COLORS.border,
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
    margin: [0, 0, 0, 15] as [number, number, number, number],
  });

  const totalsBody: TableCell[][] = [
    [
      { text: 'Subtotal', alignment: 'right' as const },
      { text: formatCurrency(invoice.subtotal), alignment: 'right' as const },
    ],
    [
      { text: `Tax (${(Number(invoice.taxRate) * 100).toFixed(2)}%)`, alignment: 'right' as const },
      { text: formatCurrency(invoice.taxAmount), alignment: 'right' as const },
    ],
    [
      { text: 'Total', alignment: 'right' as const, bold: true, fontSize: 11, color: COLORS.primary },
      {
        text: formatCurrency(invoice.totalAmount),
        alignment: 'right' as const,
        bold: true,
        fontSize: 11,
        color: COLORS.primary,
      },
    ],
  ];
  if (Number(invoice.amountPaid) > 0) {
    totalsBody.push(
      [
        { text: 'Amount Paid', alignment: 'right' as const },
        { text: formatCurrency(invoice.amountPaid), alignment: 'right' as const },
      ],
      [
        { text: 'Balance Due', alignment: 'right' as const, bold: true, fontSize: 11, color: COLORS.accent },
        {
          text: formatCurrency(invoice.balanceDue),
          alignment: 'right' as const,
          bold: true,
          fontSize: 11,
          color: COLORS.accent,
        },
      ],
    );
  }
  content.push({
    columns: [
      { text: '', width: '*' },
      {
        table: { widths: [120, 100], body: totalsBody },
        layout: 'noBorders',
        width: 'auto',
      },
    ],
    margin: [0, 0, 0, 20] as [number, number, number, number],
  });

  if (invoice.paymentInstructions) {
    content.push({ text: 'Payment Instructions', style: 'sectionHeader' });
    content.push({
      text: invoice.paymentInstructions,
      style: 'bodyText',
      margin: [0, 0, 0, 10] as [number, number, number, number],
    });
  }

  if (invoice.notes) {
    content.push({ text: 'Notes', style: 'sectionHeader' });
    content.push({ text: invoice.notes, style: 'bodyText' });
  }

  const docDefinition: TDocumentDefinitions = {
    content,
    defaultStyle: { font: 'Helvetica', fontSize: 10, color: COLORS.text },
    styles: {
      companyName: { fontSize: 18, bold: true, color: COLORS.primary },
      companyDetail: { fontSize: 9, color: COLORS.lightText, margin: [0, 1, 0, 0] as [number, number, number, number] },
      docLabel: { fontSize: 22, bold: true, color: COLORS.accent },
      docNumber: { fontSize: 11, color: COLORS.lightText, margin: [0, 2, 0, 0] as [number, number, number, number] },
      docMeta: { fontSize: 9, color: COLORS.lightText, margin: [0, 2, 0, 0] as [number, number, number, number] },
      sectionLabel: { fontSize: 9, color: COLORS.lightText, margin: [0, 0, 0, 2] as [number, number, number, number] },
      clientName: { fontSize: 14, bold: true, color: COLORS.primary },
      clientDetail: { fontSize: 10, color: COLORS.lightText, margin: [0, 1, 0, 0] as [number, number, number, number] },
      sectionHeader: { fontSize: 13, bold: true, color: COLORS.primary, margin: [0, 10, 0, 5] as [number, number, number, number] },
      bodyText: { fontSize: 10, color: COLORS.text, lineHeight: 1.4 },
      tableHeader: { fontSize: 9, bold: true, color: COLORS.primary },
    },
    pageMargins: [40, 40, 40, 60] as [number, number, number, number],
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: `${branding.companyName} - ${invoice.invoiceNumber}`,
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
