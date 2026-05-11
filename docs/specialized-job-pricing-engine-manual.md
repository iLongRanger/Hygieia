# Hygieia Specialized Job Pricing Engine Manual

## Purpose

The specialized job pricing engine is used for one-time work that does not fit recurring commercial or residential pricing.

It is designed for jobs such as:

- Window cleaning
- Carpet cleaning
- Pressure washing
- Post-construction cleanup
- Floor work
- Move-out specialty work
- Custom one-time requests

The goal is to create reusable job standards so admins do not rebuild the same specialized proposal from scratch every time.

## Key Terms

**Specialized Job**
A catalog item that represents a one-time service the company can quote repeatedly.

Example:

```text
Name: Interior Window Cleaning
Code: interior_window_cleaning
Service type: window_cleaning
Unit type: per_window
Base rate: $8.00
Default quantity: 20
Minimum charge: $150
Max discount: 10%
```

**Service Type**
The category of work. This helps organize catalog items.

Examples:

```text
window_cleaning
carpet_cleaning
pressure_washing
post_construction
floor_care
custom
```

**Unit Type**
How the job is priced.

Examples:

```text
fixed
per_window
per_sqft
per_room
per_hour
per_item
```

**Base Rate**
The standard price per unit.

Example:

```text
Base rate: $8.00 per window
Quantity: 25 windows
Subtotal: 25 x $8.00 = $200
```

**Default Quantity**
The default quantity used when the job is selected in a proposal.

**Minimum Charge**
The lowest allowed charge for the specialized job.

**Max Discount Percent**
The largest discount that can be applied without special review or approval.

**Requires Schedule**
Specialized proposals usually require a scheduled date, start time, and end time because the work is one-time and operationally specific.

## Pricing Flow

The specialized proposal price is built in this order:

```text
1. Admin selects a specialized job from the catalog
2. Proposal title and line item populate from the selected job
3. Quantity defaults from the catalog item
4. Unit price comes from base rate
5. Subtotal is quantity x base rate
6. Minimum charge is enforced if needed
7. Add-ons are added when applicable
8. Discount is checked against max discount percent
9. Scheduled date and time are required
10. Accepted proposal can generate the one-time job
```

## Step 1: Create the Catalog Item

Every specialized job should be named clearly enough for admins and clients to understand.

Good examples:

```text
Interior Window Cleaning
Carpet Cleaning
Pressure Washing - Driveway
Post-Construction Final Clean
Floor Strip and Wax
Garage Deep Clean
```

Avoid vague names:

```text
Special clean
Custom job
Extra service
Misc work
```

Why this matters:

- The selected job can populate the proposal title.
- The line item can be reused.
- Users can select the right job faster.

## Step 2: Set Service Type

Service type groups similar specialized jobs together.

Recommended examples:

```text
window_cleaning
carpet_cleaning
pressure_washing
post_construction
floor_care
appliance_cleaning
custom
```

Why this matters:

- Easier filtering and reporting.
- Cleaner catalog organization.
- Better proposal consistency.

## Step 3: Pick the Unit Type

Unit type controls how the price is calculated.

Recommended unit types:

```text
fixed: One flat price for the job
per_window: Price per window
per_sqft: Price per square foot
per_room: Price per room
per_hour: Price per labor hour
per_item: Price per item
```

Examples:

```text
Window cleaning: per_window
Carpet cleaning: per_room or per_sqft
Pressure washing: per_sqft or fixed
Post-construction cleanup: per_sqft or per_hour
Appliance detail: per_item
```

Why this matters:

- The unit must match how the work is estimated.
- Incorrect unit types create confusing proposals.
- Unit types help users understand quantity.

## Step 4: Set Base Rate and Default Quantity

Base rate is the standard unit price. Default quantity is what the proposal starts with.

Example:

```text
Specialized job: Interior Window Cleaning
Unit type: per_window
Base rate: $8.00
Default quantity: 20

Default proposal subtotal:
20 x $8.00 = $160
```

Why this matters:

- Default quantity speeds up proposal creation.
- Admin can still adjust quantity when needed.
- The line item starts from a controlled catalog standard.

## Step 5: Set Minimum Charge

Minimum charge protects small jobs.

Example:

```text
Window cleaning base rate: $8.00/window
Quantity: 8 windows
Calculated subtotal: 8 x $8.00 = $64
Minimum charge: $150
Client price: $150
```

Why this matters:

- Small jobs still require travel, setup, admin, and scheduling.
- Minimums prevent unprofitable one-time work.
- Minimums help avoid manual negotiation for small requests.

## Step 6: Set Max Discount Percent

Max discount protects standardized pricing.

Example:

```text
Catalog price: $400
Max discount: 10%
Allowed discount: $40
Lowest standard price: $360
```

If an admin wants to discount below the maximum, the system should require a reason or approval depending on the workflow.

Why this matters:

- Keeps sales from over-discounting one-time jobs.
- Protects margin.
- Creates accountability for exceptions.

## Step 7: Add-Ons

Add-ons are optional extras attached to a specialized job.

Examples:

```text
Window cleaning add-ons:
Screen cleaning: $3 per screen
Track cleaning: $4 per track
Hard water removal: $12 per window

Carpet cleaning add-ons:
Stain treatment: $20 per room
Pet odor treatment: $35 per room
Staircase: $45 fixed

Pressure washing add-ons:
Oil stain treatment: $30 fixed
Deck railing: $60 fixed
Sealer application: $0.50 per sqft
```

Why this matters:

- Keeps the base service clean.
- Lets the proposal show optional extras clearly.
- Prevents underpricing scope creep.

## Step 8: Scheduling Requirement

Specialized jobs should usually require schedule details.

Required proposal fields:

```text
Scheduled date
Scheduled start time
Scheduled end time
```

Why this matters:

- One-time work must be operationally scheduled.
- Accepted specialized proposals can generate one-time jobs.
- The team needs duration and timing before dispatch.

## Full Worked Example: Interior Window Cleaning

Catalog setup:

```text
Name: Interior Window Cleaning
Code: interior_window_cleaning
Service type: window_cleaning
Unit type: per_window
Base rate: $8.00
Default quantity: 20
Minimum charge: $150
Max discount: 10%
Requires schedule: Yes
```

Client request:

```text
Windows: 28
Add-ons:
Screen cleaning: 20 screens x $3
Track cleaning: 28 tracks x $4
```

Price:

```text
Base window cleaning:
28 windows x $8.00 = $224

Add-ons:
Screen cleaning: 20 x $3 = $60
Track cleaning: 28 x $4 = $112

Subtotal: $224 + $60 + $112 = $396
Minimum charge: $150
Final price: $396
```

Discount check:

```text
Max discount: 10%
Maximum allowed discount: $396 x 10% = $39.60
Lowest standard price: $356.40
```

## Full Worked Example: Carpet Cleaning

Catalog setup:

```text
Name: Carpet Cleaning
Code: carpet_cleaning
Service type: carpet_cleaning
Unit type: per_room
Base rate: $45.00
Default quantity: 3
Minimum charge: $175
Max discount: 10%
Requires schedule: Yes
```

Client request:

```text
Rooms: 4
Add-ons:
Stain treatment: 2 rooms x $20
Pet odor treatment: 1 room x $35
```

Price:

```text
Base carpet cleaning:
4 rooms x $45 = $180

Add-ons:
Stain treatment: 2 x $20 = $40
Pet odor treatment: 1 x $35 = $35

Subtotal: $255
Minimum charge: $175
Final price: $255
```

## Full Worked Example: Post-Construction Cleanup

Catalog setup:

```text
Name: Post-Construction Final Clean
Code: post_construction_final_clean
Service type: post_construction
Unit type: per_sqft
Base rate: $0.35
Default quantity: 2,000 sqft
Minimum charge: $750
Max discount: 5%
Requires schedule: Yes
```

Client request:

```text
Area: 3,200 sqft
Add-ons:
Window sticker removal: $150 fixed
Heavy dust detail: $250 fixed
```

Price:

```text
Base post-construction clean:
3,200 sqft x $0.35 = $1,120

Add-ons:
Window sticker removal: $150
Heavy dust detail: $250

Subtotal: $1,520
Minimum charge: $750
Final price: $1,520
```

Manual review note:

Post-construction work should usually be reviewed before sending because dust level, debris, access, and contractor cleanup quality vary heavily.

## Practical Starting Template

Use these as starter catalog standards:

```text
Interior Window Cleaning
Unit: per_window
Base rate: $8
Minimum charge: $150
Max discount: 10%

Carpet Cleaning
Unit: per_room
Base rate: $45
Minimum charge: $175
Max discount: 10%

Pressure Washing
Unit: per_sqft
Base rate: $0.25
Minimum charge: $250
Max discount: 10%

Post-Construction Final Clean
Unit: per_sqft
Base rate: $0.35
Minimum charge: $750
Max discount: 5%

Floor Strip and Wax
Unit: per_sqft
Base rate: $0.60
Minimum charge: $500
Max discount: 5%
```

## How to Explain This to a Client

Use simple language:

"This is a one-time specialized service, so it is priced from the requested job type, quantity, minimum service charge, and any selected add-ons. The schedule is confirmed before work begins so the correct team, time, and equipment can be assigned."

## Common Mistakes

- Using a fixed price when the job should be priced per unit.
- Forgetting minimum charge for small one-time jobs.
- Setting max discount too high.
- Using vague catalog names.
- Not requiring schedule for work that needs dispatch.
- Forgetting add-ons like screens, tracks, stain treatment, or heavy dust detail.
- Pricing post-construction work without review.
- Using specialized jobs for recurring work that should be commercial or residential.

## Final Review Checklist

Before sending a specialized proposal, verify:

- Catalog item matches the requested job.
- Service type is correct.
- Unit type matches how the work is measured.
- Quantity is correct.
- Base rate is current.
- Minimum charge is enforced.
- Add-ons are selected and priced correctly.
- Discount does not exceed max discount.
- Schedule date and time are set.
- Proposal title is clear.
- Accepted proposal can generate the one-time job.

