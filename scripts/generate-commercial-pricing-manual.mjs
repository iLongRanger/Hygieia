import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = process.cwd();
const outputPath = path.join(root, 'docs', 'commercial-pricing-engine-manual.pdf');
const apiRequire = createRequire(path.join(root, 'apps', 'api', 'package.json'));
const PdfPrinter = apiRequire('pdfmake/src/printer.js');

const printer = new PdfPrinter({
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
});

const colors = {
  ink: '#1f2937',
  muted: '#64748b',
  teal: '#0f766e',
  tealLight: '#ccfbf1',
  blueLight: '#eff6ff',
  border: '#d1d5db',
  warning: '#92400e',
  warningLight: '#fef3c7',
};

function h1(text) {
  return { text, style: 'h1' };
}

function h2(text) {
  return { text, style: 'h2' };
}

function h3(text) {
  return { text, style: 'h3' };
}

function p(text) {
  return { text, style: 'body' };
}

function bullets(items) {
  return {
    ul: items.map((item) => ({ text: item, margin: [0, 2, 0, 2] })),
    style: 'body',
    margin: [0, 4, 0, 10],
  };
}

function code(text) {
  return {
    text,
    style: 'code',
    margin: [0, 6, 0, 12],
  };
}

function callout(title, body, fillColor = colors.blueLight) {
  return {
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: title, bold: true, color: colors.teal, margin: [0, 0, 0, 4] },
          { text: body, style: 'body', margin: [0, 0, 0, 0] },
        ],
        fillColor,
        border: [false, false, false, false],
        margin: [10, 8, 10, 8],
      }]],
    },
    layout: 'noBorders',
    margin: [0, 6, 0, 12],
  };
}

function exampleTable(rows) {
  return {
    table: {
      headerRows: 1,
      widths: ['*', '*', '*'],
      body: [
        [
          { text: 'Input', style: 'tableHeader' },
          { text: 'Value', style: 'tableHeader' },
          { text: 'Why it matters', style: 'tableHeader' },
        ],
        ...rows.map((row) => row.map((cell) => ({ text: cell, style: 'tableCell' }))),
      ],
    },
    layout: {
      hLineColor: () => colors.border,
      vLineColor: () => colors.border,
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 5,
      paddingBottom: () => 5,
    },
    margin: [0, 6, 0, 14],
  };
}

const docDefinition = {
  pageSize: 'LETTER',
  pageMargins: [44, 48, 44, 54],
  defaultStyle: {
    font: 'Helvetica',
    color: colors.ink,
    fontSize: 10,
    lineHeight: 1.25,
  },
  footer(currentPage, pageCount) {
    return {
      columns: [
        { text: 'Hygieia Commercial Pricing Engine Manual', color: colors.muted, fontSize: 8 },
        { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', color: colors.muted, fontSize: 8 },
      ],
      margin: [44, 0, 44, 0],
    };
  },
  styles: {
    h1: { fontSize: 24, bold: true, color: colors.teal, margin: [0, 0, 0, 10] },
    h2: { fontSize: 16, bold: true, color: colors.teal, margin: [0, 18, 0, 6] },
    h3: { fontSize: 12, bold: true, color: colors.ink, margin: [0, 12, 0, 4] },
    body: { fontSize: 10, margin: [0, 2, 0, 7] },
    code: {
      fontSize: 9,
      font: 'Helvetica',
      color: '#111827',
      background: '#f8fafc',
    },
    tableHeader: { bold: true, fillColor: colors.tealLight, color: colors.ink, fontSize: 9 },
    tableCell: { fontSize: 9 },
  },
  content: [
    {
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            { text: 'Hygieia', fontSize: 11, bold: true, color: colors.teal },
            h1('Commercial Pricing Engine Manual'),
            { text: 'A practical guide for setting commercial cleaning prices with examples, formulas, and explanation notes for users and clients.', fontSize: 11, color: colors.muted },
          ],
          fillColor: '#f0fdfa',
          margin: [14, 14, 14, 14],
        }]],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 16],
    },
    h2('Purpose'),
    p('The commercial pricing engine helps users turn cleaning scope, labor assumptions, operating costs, and margin rules into an explainable client price. It is designed to make pricing consistent, defensible, and easier to explain.'),
    bullets([
      'Estimate how much labor is needed.',
      'Calculate the real loaded labor cost after burden.',
      'Add operating costs like insurance, admin, travel, equipment, and supplies.',
      'Apply margin rules so the final price is profitable.',
    ]),
    callout('Plain-language client explanation', 'Your price is based on facility size, cleaning frequency, expected labor hours, supplies, equipment, travel, insurance, supervision, and the level of detail required. This helps ensure the job is staffed correctly and priced sustainably.'),

    h2('Key Pricing Terms'),
    exampleTable([
      ['Labor cost per hour', '$20.00/hr', 'The direct wage or labor cost before burden.'],
      ['Labor burden', '25%', 'Payroll taxes, workers compensation, benefits, paid time off, and related labor overhead.'],
      ['Loaded labor cost', '$25.00/hr', 'The true labor cost after burden is added.'],
      ['Client hourly rate', '$35.00/hr', 'The hourly rate charged to the client for detailed hourly pricing.'],
      ['Target profit margin', '25%', 'The desired profit percentage after service costs.'],
    ]),
    code('Loaded labor cost = labor cost per hour x (1 + labor burden)\n$20.00 x 1.25 = $25.00/hr'),
    code('Client price = cost / (1 - target profit margin)\n$100.00 / 0.75 = $133.33'),

    h2('Pricing Methods'),
    h3('Fast Estimate, Per Square Foot'),
    p('Use this method when the account is a standard recurring commercial cleaning job and square footage is a reliable pricing anchor.'),
    bullets(['Offices', 'Retail stores', 'Warehouses', 'Standard recurring janitorial work']),
    code('Square feet: 18,000\nBase rate: $0.10 per sq ft\nBase monthly price: 18,000 x $0.10 = $1,800'),
    h3('Detailed Estimate, Hourly'),
    p('Use this method when pricing needs to be more operationally defensible based on expected labor hours.'),
    bullets(['Medical spaces', 'High fixture density spaces', 'Irregular scope', 'Heavy traffic buildings']),
    code('Monthly labor hours: 90\nClient hourly rate: $35.00\nHourly price: 90 x $35.00 = $3,150'),

    h2('Step 1: Commercial Setup'),
    p('This step sets the pricing method and main pricing guardrails.'),
    exampleTable([
      ['Base rate per sq ft', '$0.10 to $0.15', 'Creates quick recurring estimates.'],
      ['Hourly client rate', '$35 to $45', 'Used for detailed labor-heavy jobs.'],
      ['Minimum monthly charge', '$250 to $450', 'Protects small accounts from being underpriced.'],
    ]),

    h2('Step 2: Labor Assumptions'),
    p('Labor assumptions are the foundation of the engine. If labor is wrong, the final price will be wrong.'),
    code('Labor cost per hour: $20.00\nLabor burden: 25%\nLoaded labor cost: $20.00 x 1.25 = $25.00/hr\nTarget margin: 25%\nTarget client hourly rate: $25.00 / 0.75 = $33.33/hr'),
    code('If client hourly rate is $35.00:\nGross margin dollars = $35.00 - $25.00 = $10.00/hr\nGross margin percentage = $10.00 / $35.00 = 28.6%'),
    callout('How to use it', 'Set labor cost to the actual wage or direct worker cost. Set burden to real employer cost, usually 20% to 30% for employees. Do not use burden to force the client price.'),

    h2('Step 3: Productivity by Building Type'),
    p('Productivity tells the engine how many square feet can be cleaned per labor hour.'),
    exampleTable([
      ['Office', '2,500 sq ft/hr', 'Good default for normal office cleaning.'],
      ['Medical', '1,500 sq ft/hr', 'Lower because detail and sanitization are higher.'],
      ['Warehouse', '3,500 sq ft/hr', 'Higher because open floor space is usually faster.'],
      ['Retail', '2,400 sq ft/hr', 'Slightly lower because traffic and appearance matter.'],
    ]),
    code('Building size: 18,000 sq ft\nOffice productivity: 2,500 sq ft/hr\nLabor hours per visit: 18,000 / 2,500 = 7.2 hours'),

    h2('Step 4: Operating Cost Stack'),
    p('Operating costs sit on top of loaded labor. These prevent hidden business costs from silently reducing profit.'),
    exampleTable([
      ['Insurance', '8%', 'Accounts for insurance and risk cost.'],
      ['Admin overhead', '12%', 'Covers scheduling, management, billing, and office work.'],
      ['Travel per visit', '$15', 'Covers route time, fuel, parking, and vehicle cost.'],
      ['Equipment', '5%', 'Covers vacuums, machines, carts, tools, repair, and replacement.'],
      ['Supplies', '4%', 'Covers chemicals, liners, consumables, and included paper goods.'],
    ]),
    code('Labor hours per visit: 4\nLabor cost per hour: $20\nLabor burden: 25%\nLoaded labor: 4 x $20 x 1.25 = $100\n\nInsurance: $100 x 8% = $8\nAdmin overhead: $100 x 12% = $12\nEquipment: $100 x 5% = $5\nSupplies: $100 x 4% = $4\nTravel: $15\n\nTotal cost per visit: $100 + $44 = $144'),
    code('Monthly visits: 21.67\nMonthly cost before profit: $144 x 21.67 = $3,120.48\nClient monthly price at 25% margin: $3,120.48 / 0.75 = $4,160.64'),

    h2('Step 5: Margin Rules'),
    p('Margin turns cost into the client-facing price. A 25% margin means 25% of the final price remains after costs, not that 25% is added to cost.'),
    exampleTable([
      ['20%', 'Competitive', 'Useful for aggressive bids, but leaves less room for drift.'],
      ['25%', 'Standard', 'Healthy default for recurring commercial work.'],
      ['30%+', 'Premium', 'Useful for high-risk, complex, or demanding accounts.'],
    ]),
    code('Monthly cost before profit: $3,120.48\nTarget profit margin: 25%\nClient monthly price: $3,120.48 / 0.75 = $4,160.64\nProfit dollars: $1,040.16'),

    h2('Step 6: Adjustments'),
    p('Adjustments tune the price for site difficulty. They should be used when the site is easier or harder than a normal account.'),
    exampleTable([
      ['Floor type multiplier', 'VCT 1.10, carpet 1.00', 'Some floors need more labor, equipment, or skill.'],
      ['Condition multiplier', 'Standard 1.00, hard 1.30', 'Neglected buildings take longer.'],
      ['Traffic multiplier', 'Low 1.00, high 1.20', 'High-traffic spaces need more touchpoint cleaning and correction.'],
    ]),

    h2('Full Worked Example'),
    code('Scenario:\nClient: Standard office\nSquare feet: 18,000\nFrequency: 5x per week\nMonthly visits: 21.67\nProductivity: 2,500 sq ft/hr\nLabor cost: $20/hr\nLabor burden: 25%\nInsurance: 8%\nAdmin: 12%\nEquipment: 5%\nSupplies: 4%\nTravel: $15/visit\nTarget margin: 25%'),
    code('Labor:\nHours per visit: 18,000 / 2,500 = 7.2\nBase labor: 7.2 x $20 = $144\nBurden: $144 x 25% = $36\nLoaded labor: $180'),
    code('Operating costs:\nInsurance: $14.40\nAdmin: $21.60\nEquipment: $9.00\nSupplies: $7.20\nTravel: $15.00\nTotal add-ons: $67.20\nTotal cost per visit: $247.20'),
    code('Monthly cost before profit: $247.20 x 21.67 = $5,357.42\nClient price with 25% margin: $5,357.42 / 0.75 = $7,143.23/month'),
    code('Sanity check:\nMonthly labor hours: 7.2 x 21.67 = 156.02\nEffective client hourly rate: $7,143.23 / 156.02 = $45.78/hr'),
    callout('Estimator note', 'If the effective hourly rate feels high or low for the market, review productivity, frequency, scope, supply responsibility, travel, and target margin before sending the proposal.', colors.warningLight),

    h2('Practical Starting Template'),
    exampleTable([
      ['Base rate per sq ft', '$0.10 to $0.15', 'Good starting range for standard commercial.'],
      ['Hourly client rate', '$35 to $45', 'Use higher rates for complex or premium service.'],
      ['Labor cost per hour', '$18 to $24', 'Use actual worker wage or contractor cost.'],
      ['Labor burden', '20% to 30%', 'Use real employer burden for employees.'],
      ['Insurance', '8%', 'Default risk cost.'],
      ['Admin overhead', '12%', 'Default management overhead.'],
      ['Travel', '$15/visit', 'Adjust by route distance and parking.'],
      ['Equipment', '5%', 'Default equipment allowance.'],
      ['Supplies', '4%', 'Default supply allowance.'],
      ['Target margin', '25%', 'Healthy standard recurring target.'],
      ['Subcontractor split', '60%', 'Only payout logic, not company profit.'],
    ]),

    h2('Common Mistakes'),
    bullets([
      'Setting labor burden to zero for employees.',
      'Forgetting travel cost for small accounts.',
      'Using office productivity for medical or high-detail buildings.',
      'Setting target margin too low.',
      'Ignoring minimum monthly charge.',
      'Treating subcontractor payout as profit.',
      'Sending the price without reviewing the effective hourly rate.',
    ]),

    h2('Final Review Checklist'),
    bullets([
      'Square footage is correct.',
      'Frequency is correct.',
      'Building type productivity is realistic.',
      'Labor cost matches actual wage or contractor cost.',
      'Labor burden reflects real payroll cost.',
      'Travel is included.',
      'Supplies are included if Hygieia provides them.',
      'Target margin is acceptable.',
      'Minimum charge protects small jobs.',
      'Final monthly price makes sense for the market.',
    ]),
  ],
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

const pdfDoc = printer.createPdfKitDocument(docDefinition);
const stream = fs.createWriteStream(outputPath);
pdfDoc.pipe(stream);
pdfDoc.end();

stream.on('finish', () => {
  console.log(`Generated ${path.relative(root, outputPath)}`);
});
