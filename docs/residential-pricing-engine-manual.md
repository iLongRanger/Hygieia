# Hygieia Residential Pricing Engine Manual

## Purpose

The residential pricing engine helps users create repeatable house-cleaning prices from common home details instead of guessing every quote manually.

It is designed to answer five questions:

1. What is the base price for this type of home?
2. How should size, bedrooms, bathrooms, and levels adjust the price?
3. How much should service type and condition change the quote?
4. Should recurring frequency create a discount?
5. What add-ons and estimated time should appear in the proposal?

The goal is consistent pricing, clearer client explanations, and better time estimates for scheduling and walkthroughs.

## Key Terms

**Home Type Base Price**
The starting price before size, room, condition, service, and add-on adjustments.

Example:

```text
Apartment base: $140
Condo base: $160
Townhouse base: $175
Single family base: $190
```

**Square-Foot Bracket**
An adjustment based on the size of the home.

Example:

```text
Up to 1,000 sqft: +$0
Up to 1,500 sqft: +$30
Up to 2,000 sqft: +$60
Up to 3,000 sqft: +$120
Over 3,000 sqft: +$220
```

**Bedroom Adjustment**
An extra amount based on bedroom count.

**Bathroom Adjustment**
An extra amount for full and half bathrooms. Bathrooms are usually stronger price drivers because they take more detail time.

**Condition Multiplier**
A multiplier based on how clean or difficult the home is.

Example:

```text
Light: 0.92x
Standard: 1.00x
Heavy: 1.28x
```

**Service Type Multiplier**
A multiplier based on what kind of cleaning is requested.

Example:

```text
Recurring standard: 1.00x
One-time standard: 1.12x
Deep clean: 1.38x
Move in / out: 1.48x
Post construction: 1.75x
```

**Frequency Discount**
A discount for recurring clients because repeat visits are more predictable and normally easier to maintain.

Example:

```text
Weekly: 12%
Biweekly: 8%
Every 4 weeks: 3%
One-time: 0%
```

**Minimum Price**
The lowest allowed residential price. This prevents small jobs from being underpriced.

## Pricing Flow

The residential price is built in this order:

```text
1. Start with home type base price
2. Add square-foot bracket adjustment
3. Add bedroom adjustment
4. Add bathroom adjustment
5. Add level adjustment
6. Apply condition multiplier
7. Apply service type multiplier
8. Apply first-clean surcharge if applicable
9. Apply recurring frequency discount
10. Add selected add-ons
11. Enforce minimum price
12. Flag manual review if needed
```

## Step 1: Base Pricing

Base pricing anchors the quote by home type.

Recommended starting values:

```text
Apartment: $140
Condo: $160
Townhouse: $175
Single family: $190
Minimum price: $160
```

Why this matters:

- Apartments usually clean faster than single-family homes.
- Townhouses and single-family homes often have more levels, rooms, and surfaces.
- The minimum price protects travel, admin, setup, and small-job profitability.

## Step 2: Square-Foot Brackets

Square footage should adjust price without making users manually calculate every extra foot.

Example:

```text
1,200 sqft condo
Condo base price: $160
Square-foot bracket for up to 1,500 sqft: +$30
Subtotal: $190
```

Why this matters:

- Bigger homes take longer.
- Brackets are easier for staff to maintain than per-square-foot residential pricing.
- Brackets avoid over-precision when home conditions vary.

## Step 3: Bedrooms, Bathrooms, and Levels

Bedrooms and levels add time. Bathrooms usually add more time than bedrooms.

Example defaults:

```text
Bedroom adjustment:
0 bedrooms: +$0
1 bedroom: +$0
2 bedrooms: +$20
3 bedrooms: +$35
4 bedrooms: +$50
5 bedrooms: +$70

Full bathroom: +$28 each
Half bathroom: +$16 each

Levels:
1 level: +$0
2 levels: +$20
3 levels: +$40
4 levels: +$60
```

Example:

```text
Home: 3 bedrooms, 2 full bathrooms, 1 half bathroom, 2 levels
Bedroom adjustment: +$35
Full bathroom adjustment: 2 x $28 = +$56
Half bathroom adjustment: 1 x $16 = +$16
Level adjustment: +$20
Total room/level adjustment: $127
```

## Step 4: Condition Multiplier

Condition adjusts the quote based on actual cleaning difficulty.

Example:

```text
Light condition: 0.92x
Standard condition: 1.00x
Heavy condition: 1.28x
```

Example:

```text
Subtotal before condition: $317
Heavy condition multiplier: 1.28
Condition-adjusted price: $317 x 1.28 = $405.76
```

Why this matters:

- A well-maintained home is faster.
- A heavy-condition home needs more detail, product, and time.
- Heavy condition may require manual review before sending a quote.

## Step 5: Service Type Multiplier

Service type changes the work expectation.

Example defaults:

```text
Recurring standard: 1.00x
One-time standard: 1.12x
Deep clean: 1.38x
Move in / out: 1.48x
Turnover: 1.16x
Post construction: 1.75x
```

Example:

```text
Condition-adjusted price: $405.76
Deep clean multiplier: 1.38
Service-adjusted price: $405.76 x 1.38 = $560.00
```

Why this matters:

- Deep cleans include more detail and buildup removal.
- Move-in/out cleans involve empty-home detail and inside cabinets/surfaces.
- Post-construction work often includes dust, debris, and repeated wiping.

## Step 6: Frequency Discounts

Recurring clients can receive a discount because maintenance cleaning is more predictable after the first visit.

Example defaults:

```text
Weekly: 12%
Biweekly: 8%
Every 4 weeks: 3%
One-time: 0%
```

Example:

```text
Recurring standard price before discount: $240
Weekly discount: 12%
Final recurring visit price: $240 x 0.88 = $211.20
```

Why this matters:

- Weekly homes are usually easier to maintain.
- Discounts encourage recurring work.
- One-time cleans should not receive recurring discounts.

## Step 7: First-Clean Surcharge

First-clean surcharge can be used when the first recurring visit takes more effort than ongoing maintenance visits.

Example default:

```text
Enabled: Yes
Type: Percent
Value: 15%
Applies to: Recurring standard and deep clean
```

Example:

```text
Recurring standard price: $211.20
First-clean surcharge: 15%
First clean price: $211.20 x 1.15 = $242.88
```

Why this matters:

- The first clean often catches up neglected details.
- Ongoing visits should be easier after the first service.
- This avoids undercharging the first appointment.

## Step 8: Add-Ons

Add-ons are extra services that should be visible in the proposal and PDF.

Default examples:

```text
Inside fridge: $25, 20 minutes
Inside oven: $30, 25 minutes
Inside cabinets: $45, 40 minutes
Interior windows: $6 per window, 6 minutes each
Blinds: $8 per room, 8 minutes each
Baseboards: $35, 25 minutes
Laundry: $20, 25 minutes
Dishes: $18, 15 minutes
Linen change: $12 per bed, 10 minutes each
Heavy pet hair: $20, 20 minutes
Balcony / patio: $25, 20 minutes
Garage: $35, 30 minutes
```

Example:

```text
Base residential price: $211.20
Inside oven: +$30
Interior windows: 8 windows x $6 = +$48
Heavy pet hair: +$20
Final price: $211.20 + $30 + $48 + $20 = $309.20
```

Why this matters:

- Add-ons keep the base price clean.
- Clients can see what extras cost.
- Estimated minutes help scheduling and staffing.

## Step 9: Estimated Time

Estimated time helps operations understand how long the home should take.

Default example assumptions:

```text
Base hours:
Apartment: 1.6 hours
Condo: 1.9 hours
Townhouse: 2.2 hours
Single family: 2.5 hours

Bedroom: +12 minutes each
Full bathroom: +18 minutes each
Half bathroom: +10 minutes each
Every 1,000 sqft: +42 minutes
```

Example:

```text
Single family base: 2.5 hours
3 bedrooms: 3 x 12 minutes = 36 minutes
2 full bathrooms: 2 x 18 minutes = 36 minutes
1 half bathroom: 10 minutes
1,800 sqft: 1.8 x 42 minutes = 75.6 minutes

Estimated standard time:
2.5 hours + 36 + 36 + 10 + 75.6 minutes
= 2.5 hours + 157.6 minutes
= 5.13 hours
```

If service type is deep clean:

```text
Deep clean time multiplier: 1.45
Estimated time: 5.13 x 1.45 = 7.44 hours
```

Why this matters:

- Time estimates help build realistic schedules.
- Time estimates help explain why deep cleans cost more.
- The proposal PDF should show expected time on site.

## Step 10: Manual Review Rules

Manual review rules prevent the system from auto-pricing jobs that need human judgment.

Default examples:

```text
Max auto-quote size: 3,500 sqft
Heavy condition requires review: Yes
Post-construction requires review: Yes
Max add-ons before review: 5
```

Why this matters:

- Large homes may have unusual scope.
- Heavy condition can be hard to estimate without photos or walkthrough.
- Post-construction cleaning varies widely.
- Many add-ons can change staffing and time significantly.

## Full Worked Example: Recurring Condo

Scenario:

```text
Home type: Condo
Square feet: 1,200
Bedrooms: 2
Full bathrooms: 2
Half bathrooms: 0
Levels: 1
Condition: Standard
Service type: Recurring standard
Frequency: Weekly
Add-ons: Inside oven
```

Price:

```text
Condo base: $160
Square-foot bracket up to 1,500 sqft: +$30
2 bedrooms: +$20
2 full bathrooms: 2 x $28 = +$56
Levels: +$0

Subtotal: $266
Condition standard: $266 x 1.00 = $266
Recurring standard: $266 x 1.00 = $266
Weekly discount: $266 x 12% = -$31.92
After discount: $234.08
Inside oven add-on: +$30

Final visit price: $264.08
```

Estimated time:

```text
Condo base: 1.9 hours
2 bedrooms: 24 minutes
2 full bathrooms: 36 minutes
1,200 sqft: 1.2 x 42 = 50.4 minutes
Inside oven: 25 minutes

Total: 1.9 hours + 135.4 minutes
Total: 4.16 hours
```

## Full Worked Example: Deep Clean Single Family

Scenario:

```text
Home type: Single family
Square feet: 2,400
Bedrooms: 4
Full bathrooms: 3
Half bathrooms: 1
Levels: 2
Condition: Heavy
Service type: Deep clean
Frequency: One-time
Add-ons: Inside fridge, inside oven, baseboards, heavy pet hair
```

Price:

```text
Single family base: $190
Square-foot bracket up to 3,000 sqft: +$120
4 bedrooms: +$50
3 full bathrooms: 3 x $28 = +$84
1 half bathroom: +$16
2 levels: +$20

Subtotal: $480
Heavy condition: $480 x 1.28 = $614.40
Deep clean: $614.40 x 1.38 = $847.87
One-time frequency discount: $0

Add-ons:
Inside fridge: +$25
Inside oven: +$30
Baseboards: +$35
Heavy pet hair: +$20

Final price: $847.87 + $110 = $957.87
```

Estimated time:

```text
Single family base: 2.5 hours
4 bedrooms: 48 minutes
3 full bathrooms: 54 minutes
1 half bathroom: 10 minutes
2,400 sqft: 2.4 x 42 = 100.8 minutes
Base time: 2.5 hours + 212.8 minutes = 6.05 hours
Heavy condition multiplier: 1.35
Deep clean multiplier: 1.45
Adjusted time: 6.05 x 1.35 x 1.45 = 11.84 hours

Add-ons:
Fridge: 20 minutes
Oven: 25 minutes
Baseboards: 25 minutes
Pet hair: 20 minutes

Final estimated time: 11.84 hours + 90 minutes = 13.34 hours
```

This job should likely require manual review because it is heavy condition and includes several add-ons.

## Practical Starting Template

For a standard residential cleaning company, start with:

```text
Apartment base: $140
Condo base: $160
Townhouse base: $175
Single family base: $190
Minimum price: $160
Full bathroom add: $28
Half bathroom add: $16
Heavy condition multiplier: 1.28
Deep clean multiplier: 1.38
Move in / out multiplier: 1.48
Post construction multiplier: 1.75
Weekly discount: 12%
Biweekly discount: 8%
First-clean surcharge: 15%
Max auto-quote size: 3,500 sqft
```

## How to Explain This to a Client

Use simple language:

"Your price is based on the type and size of the home, number of bedrooms and bathrooms, condition, service type, frequency, and any requested add-ons. Recurring service is priced differently from one-time or deep cleaning because maintenance visits are more predictable after the first clean."

## Common Mistakes

- Pricing a deep clean like a recurring maintenance clean.
- Not charging enough for bathrooms.
- Forgetting first-clean surcharge for new recurring clients.
- Applying weekly discounts to one-time jobs.
- Ignoring heavy condition.
- Auto-pricing post-construction without review.
- Not adding time for add-ons.
- Sending a quote without checking estimated time on site.

## Final Review Checklist

Before sending a residential proposal, verify:

- Home type is correct.
- Square footage is realistic.
- Bedroom and bathroom counts are correct.
- Levels are correct.
- Condition is realistic.
- Service type matches client request.
- Frequency discount is appropriate.
- First-clean surcharge is applied when needed.
- Add-ons are selected and priced correctly.
- Estimated time on site makes sense.
- Manual review is triggered for large, heavy, or post-construction jobs.

