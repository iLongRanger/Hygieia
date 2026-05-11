import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = process.cwd();
const outputPath = path.join(root, 'docs', 'residential-pricing-engine-manual.pdf');
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
  green: '#047857',
  greenLight: '#d1fae5',
  cream: '#fff7ed',
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

function callout(title, body, fillColor = colors.cream) {
  return {
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: title, bold: true, color: colors.green, margin: [0, 0, 0, 4] },
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
        { text: 'Hygieia Residential Pricing Engine Manual', color: colors.muted, fontSize: 8 },
        { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', color: colors.muted, fontSize: 8 },
      ],
      margin: [44, 0, 44, 0],
    };
  },
  styles: {
    h1: { fontSize: 24, bold: true, color: colors.green, margin: [0, 0, 0, 10] },
    h2: { fontSize: 16, bold: true, color: colors.green, margin: [0, 18, 0, 6] },
    h3: { fontSize: 12, bold: true, color: colors.ink, margin: [0, 12, 0, 4] },
    body: { fontSize: 10, margin: [0, 2, 0, 7] },
    code: { fontSize: 9, font: 'Helvetica', color: '#111827', background: '#f8fafc' },
    tableHeader: { bold: true, fillColor: colors.greenLight, color: colors.ink, fontSize: 9 },
    tableCell: { fontSize: 9 },
  },
  content: [
    {
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            { text: 'Hygieia', fontSize: 11, bold: true, color: colors.green },
            h1('Residential Pricing Engine Manual'),
            { text: 'A practical guide for setting residential cleaning prices with examples, formulas, time estimates, add-ons, and review rules.', fontSize: 11, color: colors.muted },
          ],
          fillColor: '#ecfdf5',
          margin: [14, 14, 14, 14],
        }]],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 16],
    },
    h2('Purpose'),
    p('The residential pricing engine helps users create repeatable house-cleaning prices from common home details instead of guessing every quote manually.'),
    bullets([
      'Start with a base price by home type.',
      'Adjust for square footage, bedrooms, bathrooms, and levels.',
      'Apply service type, condition, first-clean surcharge, and frequency discounts.',
      'Add extras such as oven, fridge, windows, baseboards, laundry, and pet hair.',
      'Estimate time on site for proposals and scheduling.',
    ]),
    callout('Plain-language client explanation', 'Your price is based on home type, size, bedroom and bathroom count, condition, service type, frequency, and requested add-ons. Recurring service is priced differently from one-time or deep cleaning because maintenance visits are more predictable after the first clean.'),

    h2('Key Pricing Terms'),
    exampleTable([
      ['Home type base price', 'Condo: $160', 'The starting price before adjustments.'],
      ['Square-foot bracket', '1,001 to 1,500 sqft: +$30', 'Larger homes take more time.'],
      ['Bathroom adjustment', 'Full bath: +$28', 'Bathrooms are detail-heavy and usually drive time.'],
      ['Condition multiplier', 'Heavy: 1.28x', 'Harder homes need more time and product.'],
      ['Service multiplier', 'Deep clean: 1.38x', 'Deep cleaning includes more detail than maintenance.'],
      ['Frequency discount', 'Weekly: 12%', 'Recurring maintenance is more predictable.'],
      ['Minimum price', '$160', 'Protects small jobs from being underpriced.'],
    ]),

    h2('Pricing Flow'),
    code('1. Start with home type base price\n2. Add square-foot bracket adjustment\n3. Add bedroom adjustment\n4. Add bathroom adjustment\n5. Add level adjustment\n6. Apply condition multiplier\n7. Apply service type multiplier\n8. Apply first-clean surcharge if applicable\n9. Apply recurring frequency discount\n10. Add selected add-ons\n11. Enforce minimum price\n12. Flag manual review if needed'),

    h2('Step 1: Base Pricing'),
    p('Base pricing anchors the residential quote by home type.'),
    exampleTable([
      ['Apartment', '$140', 'Usually smaller and faster to clean.'],
      ['Condo', '$160', 'Often moderate size and simpler layout.'],
      ['Townhouse', '$175', 'Usually more levels and stairs.'],
      ['Single family', '$190', 'Often more rooms, surfaces, and levels.'],
      ['Minimum price', '$160', 'Protects travel, admin, and setup cost.'],
    ]),

    h2('Step 2: Square-Foot Brackets'),
    p('Square-foot brackets adjust price without requiring users to manually calculate every extra foot.'),
    code('1,200 sqft condo\nCondo base price: $160\nSquare-foot bracket up to 1,500 sqft: +$30\nSubtotal: $190'),

    h2('Step 3: Bedrooms, Bathrooms, and Levels'),
    exampleTable([
      ['Bedroom adjustment', '3 bedrooms: +$35', 'Bedrooms add surfaces and reset time.'],
      ['Full bathroom', '+$28 each', 'Full bathrooms require more detailed cleaning.'],
      ['Half bathroom', '+$16 each', 'Half bathrooms are smaller but still detail-heavy.'],
      ['Levels', '2 levels: +$20', 'Stairs and split layouts add effort.'],
    ]),
    code('3 bedrooms, 2 full bathrooms, 1 half bathroom, 2 levels\nBedroom adjustment: +$35\nFull bathrooms: 2 x $28 = +$56\nHalf bathroom: +$16\nLevel adjustment: +$20\nTotal room/level adjustment: $127'),

    h2('Step 4: Condition Multiplier'),
    p('Condition adjusts the quote based on actual cleaning difficulty.'),
    exampleTable([
      ['Light', '0.92x', 'Well-maintained home.'],
      ['Standard', '1.00x', 'Normal expected condition.'],
      ['Heavy', '1.28x', 'More buildup, product, and detail time.'],
    ]),
    code('Subtotal before condition: $317\nHeavy condition multiplier: 1.28\nCondition-adjusted price: $317 x 1.28 = $405.76'),

    h2('Step 5: Service Type Multiplier'),
    exampleTable([
      ['Recurring standard', '1.00x', 'Maintenance cleaning.'],
      ['One-time standard', '1.12x', 'No recurring maintenance discount behavior.'],
      ['Deep clean', '1.38x', 'More buildup and detail cleaning.'],
      ['Move in / out', '1.48x', 'Empty-home detail and inside surfaces.'],
      ['Turnover', '1.16x', 'Short-term rental or reset style work.'],
      ['Post construction', '1.75x', 'Dust, debris, repeated wiping, and review risk.'],
    ]),
    code('Condition-adjusted price: $405.76\nDeep clean multiplier: 1.38\nService-adjusted price: $405.76 x 1.38 = $560.00'),

    h2('Step 6: Frequency Discounts'),
    exampleTable([
      ['Weekly', '12%', 'Maintenance is easier and more predictable.'],
      ['Biweekly', '8%', 'Still recurring, but more buildup than weekly.'],
      ['Every 4 weeks', '3%', 'Small discount for recurring work.'],
      ['One-time', '0%', 'No recurring maintenance discount.'],
    ]),
    code('Recurring standard price before discount: $240\nWeekly discount: 12%\nFinal recurring visit price: $240 x 0.88 = $211.20'),

    h2('Step 7: First-Clean Surcharge'),
    p('First-clean surcharge helps avoid undercharging the first visit for new recurring clients.'),
    code('Recurring standard price: $211.20\nFirst-clean surcharge: 15%\nFirst clean price: $211.20 x 1.15 = $242.88'),

    h2('Step 8: Add-Ons'),
    exampleTable([
      ['Inside fridge', '$25, 20 min', 'Extra appliance detail.'],
      ['Inside oven', '$30, 25 min', 'High-effort appliance detail.'],
      ['Inside cabinets', '$45, 40 min', 'Common move-in/out extra.'],
      ['Interior windows', '$6/window, 6 min each', 'Unit-based pricing.'],
      ['Blinds', '$8/room, 8 min each', 'Room-based dusting/detail.'],
      ['Baseboards', '$35, 25 min', 'Detail add-on.'],
      ['Heavy pet hair', '$20, 20 min', 'Extra removal effort.'],
    ]),
    code('Base residential price: $211.20\nInside oven: +$30\nInterior windows: 8 x $6 = +$48\nHeavy pet hair: +$20\nFinal price: $309.20'),

    h2('Step 9: Estimated Time'),
    p('Estimated time helps operations schedule the job and explains why larger or deeper jobs cost more.'),
    exampleTable([
      ['Apartment base time', '1.6 hours', 'Small-home baseline.'],
      ['Condo base time', '1.9 hours', 'Moderate-home baseline.'],
      ['Townhouse base time', '2.2 hours', 'Stairs and levels included.'],
      ['Single family base time', '2.5 hours', 'Larger-home baseline.'],
      ['Bedroom time', '+12 minutes each', 'Reset and surface time.'],
      ['Full bath time', '+18 minutes each', 'Detail-heavy room time.'],
      ['Every 1,000 sqft', '+42 minutes', 'Size-based time adjustment.'],
    ]),
    code('Single family base: 2.5 hours\n3 bedrooms: 36 minutes\n2 full bathrooms: 36 minutes\n1 half bathroom: 10 minutes\n1,800 sqft: 1.8 x 42 = 75.6 minutes\nEstimated standard time: 5.13 hours\nDeep clean multiplier: 1.45\nEstimated deep clean time: 7.44 hours'),

    h2('Step 10: Manual Review Rules'),
    exampleTable([
      ['Max auto-quote size', '3,500 sqft', 'Large homes may need walkthrough review.'],
      ['Heavy condition review', 'Yes', 'Condition can vary too much for blind pricing.'],
      ['Post-construction review', 'Yes', 'Dust and debris vary heavily.'],
      ['Max add-ons before review', '5', 'Many extras can change staffing and schedule.'],
    ]),

    h2('Full Worked Example: Recurring Condo'),
    code('Scenario:\nHome type: Condo\nSquare feet: 1,200\nBedrooms: 2\nFull bathrooms: 2\nHalf bathrooms: 0\nLevels: 1\nCondition: Standard\nService type: Recurring standard\nFrequency: Weekly\nAdd-ons: Inside oven'),
    code('Price:\nCondo base: $160\nSqft bracket: +$30\n2 bedrooms: +$20\n2 full bathrooms: +$56\nLevels: +$0\nSubtotal: $266\nCondition: x1.00 = $266\nService type: x1.00 = $266\nWeekly discount: -$31.92\nAfter discount: $234.08\nInside oven: +$30\nFinal visit price: $264.08'),
    code('Estimated time:\nCondo base: 1.9 hours\n2 bedrooms: 24 minutes\n2 full bathrooms: 36 minutes\n1,200 sqft: 50.4 minutes\nInside oven: 25 minutes\nTotal estimated time: 4.16 hours'),

    h2('Full Worked Example: Deep Clean Single Family'),
    code('Scenario:\nHome type: Single family\nSquare feet: 2,400\nBedrooms: 4\nFull bathrooms: 3\nHalf bathrooms: 1\nLevels: 2\nCondition: Heavy\nService type: Deep clean\nFrequency: One-time\nAdd-ons: Fridge, oven, baseboards, heavy pet hair'),
    code('Price:\nSingle family base: $190\nSqft bracket up to 3,000 sqft: +$120\n4 bedrooms: +$50\n3 full bathrooms: +$84\n1 half bathroom: +$16\n2 levels: +$20\nSubtotal: $480\nHeavy condition: $480 x 1.28 = $614.40\nDeep clean: $614.40 x 1.38 = $847.87\nAdd-ons: $110\nFinal price: $957.87'),
    code('Estimated time:\nBase time: 6.05 hours\nHeavy condition multiplier: 1.35\nDeep clean multiplier: 1.45\nAdjusted time: 11.84 hours\nAdd-ons: 90 minutes\nFinal estimated time: 13.34 hours'),
    callout('Estimator note', 'This job should likely require manual review because it is heavy condition and includes several add-ons.', colors.warningLight),

    h2('Practical Starting Template'),
    exampleTable([
      ['Apartment base', '$140', 'Small-home default.'],
      ['Condo base', '$160', 'Moderate-home default.'],
      ['Townhouse base', '$175', 'Multi-level default.'],
      ['Single family base', '$190', 'Larger-home default.'],
      ['Minimum price', '$160', 'Protects small jobs.'],
      ['Full bathroom add', '$28', 'Detail-heavy room pricing.'],
      ['Heavy condition', '1.28x', 'More effort and product.'],
      ['Deep clean', '1.38x', 'Detailed service multiplier.'],
      ['Weekly discount', '12%', 'Recurring maintenance incentive.'],
      ['First-clean surcharge', '15%', 'Protects first recurring visit.'],
      ['Max auto-quote size', '3,500 sqft', 'Manual review threshold.'],
    ]),

    h2('Common Mistakes'),
    bullets([
      'Pricing a deep clean like a recurring maintenance clean.',
      'Not charging enough for bathrooms.',
      'Forgetting first-clean surcharge for new recurring clients.',
      'Applying weekly discounts to one-time jobs.',
      'Ignoring heavy condition.',
      'Auto-pricing post-construction without review.',
      'Not adding time for add-ons.',
      'Sending a quote without checking estimated time on site.',
    ]),

    h2('Final Review Checklist'),
    bullets([
      'Home type is correct.',
      'Square footage is realistic.',
      'Bedroom and bathroom counts are correct.',
      'Levels are correct.',
      'Condition is realistic.',
      'Service type matches client request.',
      'Frequency discount is appropriate.',
      'First-clean surcharge is applied when needed.',
      'Add-ons are selected and priced correctly.',
      'Estimated time on site makes sense.',
      'Manual review is triggered for large, heavy, or post-construction jobs.',
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
