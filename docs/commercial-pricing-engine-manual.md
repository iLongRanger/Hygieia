# Hygieia Commercial Pricing Engine Manual

## Purpose

The commercial pricing engine helps users turn cleaning scope, labor assumptions, operating costs, and margin rules into an explainable client price.

It is designed to answer four questions:

1. How much labor is needed?
2. What does that labor really cost after burden?
3. What operating costs should be added?
4. What should the client be charged so the job is profitable?

The engine is not just a calculator. It is a pricing checklist that makes sure labor, overhead, supplies, travel, equipment, margin, and service difficulty are considered before a proposal is sent.

## Key Terms

**Labor Cost per Hour**
The base wage or direct labor cost before burden. Example: a cleaner costs $20.00 per hour.

**Labor Burden**
The extra employer cost on top of wages. This can include payroll taxes, workers compensation, benefits, paid time off, and other labor-related overhead.

**Loaded Labor Cost**
Base labor plus labor burden.

Formula:

```text
Loaded labor cost = labor cost per hour x (1 + labor burden)
```

Example:

```text
Labor cost: $20.00/hr
Labor burden: 25%
Loaded labor cost: $20.00 x 1.25 = $25.00/hr
```

**Client Hourly Rate**
The hourly rate charged to the client when the plan uses detailed hourly pricing.

**Target Profit Margin**
The percentage of the final client price intended to remain as profit after costs.

Formula:

```text
Client price = cost / (1 - target profit margin)
```

Example:

```text
Cost: $100.00
Target margin: 25%
Client price: $100.00 / 0.75 = $133.33
```

## Pricing Method

The engine supports two commercial pricing methods.

### Fast Estimate, Per Square Foot

Use this when the job is a standard recurring commercial cleaning account and square footage is a reliable pricing anchor.

Best for:

- Offices
- Retail stores
- Warehouses
- Standard recurring janitorial work

Example:

```text
Square feet: 18,000
Base rate: $0.10 per sq ft
Base monthly price: 18,000 x $0.10 = $1,800
```

The engine still compares this against labor cost, operating cost, minimum charge, and margin protection.

### Detailed Estimate, Hourly

Use this when the job needs a more operationally defensible price based on expected labor hours.

Best for:

- Medical spaces
- High fixture density spaces
- Irregular scope
- Heavy traffic buildings
- Buildings where tasks matter more than square footage

Example:

```text
Monthly labor hours: 90
Client hourly rate: $35.00
Hourly price: 90 x $35.00 = $3,150
```

## Step 1: Commercial Setup

This step sets the pricing method and the main pricing guardrails.

Recommended starting values:

```text
Pricing method: Fast Estimate for standard commercial
Base rate per sq ft: $0.10 to $0.15
Hourly client rate: $35.00 to $45.00
Minimum monthly charge: $250 to $450
```

Why this matters:

- Base rate helps create quick recurring estimates.
- Hourly rate helps price detailed labor-heavy jobs.
- Minimum monthly charge protects small accounts from being underpriced.

## Step 2: Labor Assumptions

Labor assumptions are the foundation of the pricing engine.

Example:

```text
Labor cost per hour: $20.00
Labor burden: 25%
Loaded labor cost: $25.00/hr
Target profit margin: 25%
Target client hourly rate: $25.00 / 0.75 = $33.33/hr
```

If the current client hourly rate is set to $35.00:

```text
Client rate: $35.00/hr
Loaded labor cost: $25.00/hr
Gross margin dollars: $10.00/hr
Gross margin percentage: $10.00 / $35.00 = 28.6%
```

This means a $35.00 client hourly rate is reasonable if the worker costs $20.00/hr and burden is 25%.

## Step 3: Productivity by Building Type

Productivity tells the engine how many square feet can be cleaned per labor hour.

Example defaults:

```text
Office: 2,500 sq ft per labor hour
Medical: 1,500 sq ft per labor hour
Warehouse: 3,500 sq ft per labor hour
Retail: 2,400 sq ft per labor hour
```

Example office calculation:

```text
Building size: 18,000 sq ft
Office productivity: 2,500 sq ft/hr
Labor hours per visit: 18,000 / 2,500 = 7.2 hours
```

Why this matters:

- Higher productivity means fewer labor hours and lower price.
- Lower productivity means more labor hours and higher price.
- Medical and high-detail sites should usually have lower productivity assumptions.

## Step 4: Operating Cost Stack

Operating costs sit on top of loaded labor.

Recommended starting values:

```text
Insurance: 8%
Admin overhead: 12%
Travel per visit: $15
Equipment: 5%
Supplies: 4%
```

Example per visit:

```text
Labor hours per visit: 4
Labor cost per hour: $20
Labor burden: 25%
Loaded labor: 4 x $20 x 1.25 = $100

Insurance: $100 x 8% = $8
Admin overhead: $100 x 12% = $12
Equipment: $100 x 5% = $5
Supplies: $100 x 4% = $4
Travel: $15

Total operating add-ons: $44
Total cost per visit: $100 + $44 = $144
```

If the service runs 5x per week:

```text
Monthly visits: 21.67
Monthly cost before profit: $144 x 21.67 = $3,120.48
```

With 25% target margin:

```text
Client monthly price: $3,120.48 / 0.75 = $4,160.64
```

Why this matters:

- Insurance protects against real business risk.
- Admin overhead covers scheduling, management, billing, and office work.
- Travel prevents route time and fuel from silently eating profit.
- Equipment covers machines, carts, vacuums, tools, and replacement.
- Supplies covers chemicals, liners, consumables, and paper goods when included.

## Step 5: Margin Rules

Margin turns cost into the client-facing price.

Example:

```text
Monthly cost before profit: $3,120.48
Target profit margin: 25%
Client monthly price: $3,120.48 / (1 - 0.25)
Client monthly price: $4,160.64
Profit dollars: $4,160.64 - $3,120.48 = $1,040.16
```

Recommended target margins:

```text
20%: Conservative, useful for competitive bids
25%: Healthy standard target
30%+: Premium or higher-risk work
```

## Step 6: Adjustments

Adjustments tune the price for site difficulty.

### Floor Type Multipliers

Examples:

```text
Carpet: 1.00
Tile: 1.05
Concrete: 0.95
VCT: 1.10
```

Why this matters:

Some floors take more time, equipment, or skill.

### Condition Multipliers

Examples:

```text
Standard: 1.00
Medium difficulty: 1.15
Heavy / demanding: 1.30
```

Why this matters:

A neglected building takes longer than a maintained one.

### Traffic Multipliers

Examples:

```text
Low traffic: 1.00
Medium traffic: 1.10
High traffic: 1.20
```

Why this matters:

High-traffic areas need more detail, more touchpoint cleaning, and more frequent correction.

## Full Worked Example

Scenario:

```text
Client: Standard office
Square feet: 18,000
Frequency: 5x per week
Monthly visits: 21.67
Productivity: 2,500 sq ft/hr
Labor cost: $20/hr
Labor burden: 25%
Operating costs:
  Insurance: 8%
  Admin overhead: 12%
  Equipment: 5%
  Supplies: 4%
  Travel: $15/visit
Target margin: 25%
```

Labor:

```text
Hours per visit: 18,000 / 2,500 = 7.2
Base labor per visit: 7.2 x $20 = $144
Labor burden: $144 x 25% = $36
Loaded labor per visit: $180
```

Operating costs:

```text
Insurance: $180 x 8% = $14.40
Admin: $180 x 12% = $21.60
Equipment: $180 x 5% = $9.00
Supplies: $180 x 4% = $7.20
Travel: $15.00
Total add-ons: $67.20
Total cost per visit: $247.20
```

Monthly cost:

```text
Monthly cost before profit: $247.20 x 21.67 = $5,357.42
Client price with 25% margin: $5,357.42 / 0.75 = $7,143.23/month
```

Sanity check:

```text
Monthly labor hours: 7.2 x 21.67 = 156.02 hours
Client monthly price: $7,143.23
Effective client hourly rate: $7,143.23 / 156.02 = $45.78/hr
```

This price may be high for some markets, so the estimator should review productivity, frequency, scope, supplies, and margin before sending.

## Practical Starting Template

For a normal commercial cleaning company, start with:

```text
Base rate per sq ft: $0.10 to $0.15
Hourly client rate: $35 to $45
Labor cost per hour: actual wage, often $18 to $24
Labor burden: 20% to 30%
Insurance: 8%
Admin overhead: 12%
Travel: $15/visit
Equipment: 5%
Supplies: 4%
Target profit margin: 25%
Subcontractor split: 60%
```

## How to Explain This to a Client

Use simple language:

"Your price is based on the size of the facility, the cleaning frequency, the expected labor hours, supplies, equipment, travel, insurance, supervision, and the level of detail required. This helps us make sure the job is staffed correctly and priced sustainably so service quality does not drop after the first few months."

## Common Mistakes

- Setting labor burden to zero for employees.
- Forgetting travel cost for small accounts.
- Using office productivity for medical or high-detail buildings.
- Setting the target margin too low.
- Ignoring minimum monthly charge.
- Treating subcontractor payout as profit.
- Sending the price without reviewing the effective hourly rate.

## Final Review Checklist

Before sending a proposal, verify:

- Square footage is correct.
- Frequency is correct.
- Building type productivity is realistic.
- Labor cost matches actual wage or contractor cost.
- Labor burden reflects real payroll cost.
- Travel is included.
- Supplies are included if Hygieia provides them.
- Target margin is acceptable.
- Minimum charge protects small jobs.
- Final monthly price makes sense for the market.

