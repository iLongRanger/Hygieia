import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = process.cwd();
const outputPath = path.join(root, 'docs', 'specialized-job-pricing-engine-manual.pdf');
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
  blue: '#0369a1',
  blueLight: '#e0f2fe',
  slateLight: '#f8fafc',
  border: '#d1d5db',
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

function callout(title, body, fillColor = colors.slateLight) {
  return {
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: title, bold: true, color: colors.blue, margin: [0, 0, 0, 4] },
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
        { text: 'Hygieia Specialized Job Pricing Engine Manual', color: colors.muted, fontSize: 8 },
        { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', color: colors.muted, fontSize: 8 },
      ],
      margin: [44, 0, 44, 0],
    };
  },
  styles: {
    h1: { fontSize: 24, bold: true, color: colors.blue, margin: [0, 0, 0, 10] },
    h2: { fontSize: 16, bold: true, color: colors.blue, margin: [0, 18, 0, 6] },
    h3: { fontSize: 12, bold: true, color: colors.ink, margin: [0, 12, 0, 4] },
    body: { fontSize: 10, margin: [0, 2, 0, 7] },
    code: { fontSize: 9, font: 'Helvetica', color: '#111827', background: '#f8fafc' },
    tableHeader: { bold: true, fillColor: colors.blueLight, color: colors.ink, fontSize: 9 },
    tableCell: { fontSize: 9 },
  },
  content: [
    {
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            { text: 'Hygieia', fontSize: 11, bold: true, color: colors.blue },
            h1('Specialized Job Pricing Engine Manual'),
            { text: 'A practical guide for one-time and specialized job catalog pricing, proposal use, discount limits, examples, and scheduling rules.', fontSize: 11, color: colors.muted },
          ],
          fillColor: '#f0f9ff',
          margin: [14, 14, 14, 14],
        }]],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 16],
    },
    h2('Purpose'),
    p('The specialized job pricing engine is used for one-time work that does not fit recurring commercial or residential pricing. It creates reusable job standards so proposals can be built faster and more consistently.'),
    bullets([
      'Window cleaning',
      'Carpet cleaning',
      'Pressure washing',
      'Post-construction cleanup',
      'Floor work',
      'Move-out specialty work',
      'Custom one-time requests',
    ]),
    callout('Plain-language client explanation', 'This is a one-time specialized service, so it is priced from the requested job type, quantity, minimum service charge, and selected add-ons. The schedule is confirmed before work begins so the correct team, time, and equipment can be assigned.'),

    h2('Key Terms'),
    exampleTable([
      ['Specialized job', 'Interior Window Cleaning', 'Reusable one-time service standard.'],
      ['Service type', 'window_cleaning', 'Groups similar catalog items.'],
      ['Unit type', 'per_window', 'Controls how quantity is measured.'],
      ['Base rate', '$8.00', 'Standard price per unit.'],
      ['Default quantity', '20', 'Starting quantity when selected in a proposal.'],
      ['Minimum charge', '$150', 'Protects small jobs from being underpriced.'],
      ['Max discount', '10%', 'Controls pricing exceptions.'],
      ['Requires schedule', 'Yes', 'One-time work needs date and time before dispatch.'],
    ]),

    h2('Pricing Flow'),
    code('1. Admin selects a specialized job from the catalog\n2. Proposal title and line item populate from the selected job\n3. Quantity defaults from the catalog item\n4. Unit price comes from base rate\n5. Subtotal is quantity x base rate\n6. Minimum charge is enforced if needed\n7. Add-ons are added when applicable\n8. Discount is checked against max discount percent\n9. Scheduled date and time are required\n10. Accepted proposal can generate the one-time job'),

    h2('Step 1: Create the Catalog Item'),
    p('Every specialized job should be named clearly enough for admins and clients to understand.'),
    exampleTable([
      ['Good name', 'Interior Window Cleaning', 'Clear client-facing service.'],
      ['Good name', 'Post-Construction Final Clean', 'Specific service expectation.'],
      ['Avoid', 'Special clean', 'Too vague for proposal reuse.'],
      ['Avoid', 'Misc work', 'Does not explain scope.'],
    ]),

    h2('Step 2: Set Service Type'),
    p('Service type groups similar specialized jobs together for cleaner catalog organization and reporting.'),
    code('window_cleaning\ncarpet_cleaning\npressure_washing\npost_construction\nfloor_care\nappliance_cleaning\ncustom'),

    h2('Step 3: Pick the Unit Type'),
    exampleTable([
      ['fixed', 'One flat price', 'Useful when scope is always similar.'],
      ['per_window', 'Price per window', 'Best for window cleaning.'],
      ['per_sqft', 'Price per square foot', 'Best for pressure washing or post-construction.'],
      ['per_room', 'Price per room', 'Best for carpet cleaning.'],
      ['per_hour', 'Price per labor hour', 'Best for uncertain custom work.'],
      ['per_item', 'Price per item', 'Best for appliance or furniture work.'],
    ]),

    h2('Step 4: Set Base Rate and Default Quantity'),
    p('Base rate is the standard unit price. Default quantity is what the proposal starts with.'),
    code('Interior Window Cleaning\nUnit type: per_window\nBase rate: $8.00\nDefault quantity: 20\nDefault proposal subtotal: 20 x $8.00 = $160'),

    h2('Step 5: Set Minimum Charge'),
    p('Minimum charge protects small jobs from losing money after travel, setup, admin, and scheduling are considered.'),
    code('Window cleaning base rate: $8.00/window\nQuantity: 8 windows\nCalculated subtotal: 8 x $8.00 = $64\nMinimum charge: $150\nClient price: $150'),

    h2('Step 6: Set Max Discount Percent'),
    p('Max discount protects standardized pricing and creates accountability for exceptions.'),
    code('Catalog price: $400\nMax discount: 10%\nMaximum allowed discount: $40\nLowest standard price: $360'),

    h2('Step 7: Add-Ons'),
    p('Add-ons keep the base service clean and make extras visible on the proposal.'),
    exampleTable([
      ['Window screens', '$3 per screen', 'Extra window scope.'],
      ['Track cleaning', '$4 per track', 'Detail work often missed in base price.'],
      ['Carpet stain treatment', '$20 per room', 'Optional carpet add-on.'],
      ['Pet odor treatment', '$35 per room', 'Higher product and time cost.'],
      ['Heavy dust detail', '$250 fixed', 'Common post-construction add-on.'],
    ]),

    h2('Step 8: Scheduling Requirement'),
    p('Specialized jobs should usually require schedule details before proposal submission or acceptance.'),
    bullets(['Scheduled date', 'Scheduled start time', 'Scheduled end time']),

    h2('Full Worked Example: Interior Window Cleaning'),
    code('Catalog setup:\nName: Interior Window Cleaning\nCode: interior_window_cleaning\nService type: window_cleaning\nUnit type: per_window\nBase rate: $8.00\nDefault quantity: 20\nMinimum charge: $150\nMax discount: 10%\nRequires schedule: Yes'),
    code('Client request:\nWindows: 28\nScreen cleaning: 20 screens x $3\nTrack cleaning: 28 tracks x $4'),
    code('Base window cleaning: 28 x $8 = $224\nScreen cleaning: 20 x $3 = $60\nTrack cleaning: 28 x $4 = $112\nSubtotal: $396\nMinimum charge: $150\nFinal price: $396'),
    code('Max discount: 10%\nMaximum discount: $396 x 10% = $39.60\nLowest standard price: $356.40'),

    h2('Full Worked Example: Carpet Cleaning'),
    code('Catalog setup:\nName: Carpet Cleaning\nCode: carpet_cleaning\nService type: carpet_cleaning\nUnit type: per_room\nBase rate: $45\nDefault quantity: 3\nMinimum charge: $175\nMax discount: 10%\nRequires schedule: Yes'),
    code('Client request:\nRooms: 4\nStain treatment: 2 rooms x $20\nPet odor treatment: 1 room x $35'),
    code('Base carpet cleaning: 4 x $45 = $180\nStain treatment: 2 x $20 = $40\nPet odor treatment: 1 x $35 = $35\nSubtotal: $255\nMinimum charge: $175\nFinal price: $255'),

    h2('Full Worked Example: Post-Construction Cleanup'),
    code('Catalog setup:\nName: Post-Construction Final Clean\nCode: post_construction_final_clean\nService type: post_construction\nUnit type: per_sqft\nBase rate: $0.35\nDefault quantity: 2,000 sqft\nMinimum charge: $750\nMax discount: 5%\nRequires schedule: Yes'),
    code('Client request:\nArea: 3,200 sqft\nWindow sticker removal: $150\nHeavy dust detail: $250'),
    code('Base post-construction clean: 3,200 x $0.35 = $1,120\nAdd-ons: $150 + $250 = $400\nSubtotal: $1,520\nMinimum charge: $750\nFinal price: $1,520'),
    callout('Estimator note', 'Post-construction work should usually be reviewed before sending because dust level, debris, access, and contractor cleanup quality vary heavily.', colors.warningLight),

    h2('Practical Starting Template'),
    exampleTable([
      ['Interior Window Cleaning', '$8/window, $150 minimum', 'Good reusable standard.'],
      ['Carpet Cleaning', '$45/room, $175 minimum', 'Simple room-based pricing.'],
      ['Pressure Washing', '$0.25/sqft, $250 minimum', 'Works for driveways and patios.'],
      ['Post-Construction Final Clean', '$0.35/sqft, $750 minimum', 'Higher review-risk service.'],
      ['Floor Strip and Wax', '$0.60/sqft, $500 minimum', 'Equipment-heavy specialty work.'],
    ]),

    h2('Common Mistakes'),
    bullets([
      'Using a fixed price when the job should be priced per unit.',
      'Forgetting minimum charge for small one-time jobs.',
      'Setting max discount too high.',
      'Using vague catalog names.',
      'Not requiring schedule for work that needs dispatch.',
      'Forgetting add-ons like screens, tracks, stain treatment, or heavy dust detail.',
      'Pricing post-construction work without review.',
      'Using specialized jobs for recurring work that should be commercial or residential.',
    ]),

    h2('Final Review Checklist'),
    bullets([
      'Catalog item matches the requested job.',
      'Service type is correct.',
      'Unit type matches how the work is measured.',
      'Quantity is correct.',
      'Base rate is current.',
      'Minimum charge is enforced.',
      'Add-ons are selected and priced correctly.',
      'Discount does not exceed max discount.',
      'Schedule date and time are set.',
      'Proposal title is clear.',
      'Accepted proposal can generate the one-time job.',
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
