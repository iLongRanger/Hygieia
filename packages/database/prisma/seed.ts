import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import {
  RESIDENTIAL_AREA_TEMPLATE_FIXTURES,
  RESIDENTIAL_AREA_TYPES,
  RESIDENTIAL_FIXTURE_TYPES,
  RESIDENTIAL_TASK_TEMPLATE_SEEDS,
} from './seeds/residentialCleaning'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // Create system roles
  const roles = await prisma.role.createMany({
    data: [
      {
        key: 'owner',
        label: 'Owner',
        description: 'Full system access',
        isSystemRole: true,
        permissions: { all: true }
      },
      {
        key: 'admin',
        label: 'Admin',
        description: 'CRM, proposals, contracts, reporting',
        isSystemRole: true,
        permissions: { crm: true, proposals: true, contracts: true, reporting: true }
      },
      {
        key: 'manager',
        label: 'Manager',
        description: 'Estimates, facilities, tasks, cleaners',
        isSystemRole: true,
        permissions: { estimates: true, facilities: true, tasks: true, cleaners: true }
      },
      {
        key: 'cleaner',
        label: 'Cleaner',
        description: 'Assigned work orders only',
        isSystemRole: true,
        permissions: { work_orders: true, own_tasks_only: true }
      },
      {
        key: 'subcontractor',
        label: 'Subcontractor',
        description: 'View assigned contracts and jobs, log time',
        isSystemRole: true,
        permissions: {
          dashboard_read: true,
          contracts_read: true,
          facilities_read: true,
          jobs_read: true,
          jobs_write: true,
          time_tracking_read: true,
          time_tracking_write: true,
        }
      }
    ],
    skipDuplicates: true
  })

  console.log(`Created ${roles.count} system roles`)

  // Seed commercial area types
  const sharedAreaTypeNames = new Set(['Hallway', 'Kitchen'])
  const commercialAreaTypeSeeds: { name: string; scope: 'commercial' | 'both' }[] = [
    'Break Room',
    'Cafeteria',
    'Changing Room',
    'Classroom',
    'Clinic Room',
    'Conference Room',
    'Copy Room',
    'Corridor',
    'Cubicle Area',
    'Dining Area',
    'Electrical Room',
    'Elevator Lobby',
    'Exam Room',
    'Gym',
    'Hallway',
    'Janitor Closet',
    'Kitchen',
    'Lab',
    'Loading Dock',
    'Locker Room',
    'Lobby',
    'Lounge',
    'Mail Room',
    'Manufacturing Floor',
    'Mechanical Room',
    'Meeting Room',
    'Office',
    'Open Workspace',
    'Pantry',
    'Private Office',
    'Reception',
    'Retail Floor',
    'Security Room',
    'Server Room',
    'Shower Room',
    'Showroom',
    'Stairwell',
    'Storage Room',
    'Stockroom',
    'Supply Closet',
    'Training Room',
    'Waiting Area',
    'Warehouse',
    'Washroom',
    'Workshop',
  ].map((name) => ({
    name,
    scope: sharedAreaTypeNames.has(name) ? 'both' : 'commercial',
  }))

  const areaTypes = await prisma.areaType.createMany({
    data: commercialAreaTypeSeeds,
    skipDuplicates: true
  })

  console.log(`Created ${areaTypes.count} commercial area types`)

  for (const areaType of commercialAreaTypeSeeds) {
    await prisma.areaType.updateMany({
      where: { name: areaType.name },
      data: { scope: areaType.scope },
    })
  }

  for (const areaType of RESIDENTIAL_AREA_TYPES) {
    await prisma.areaType.upsert({
      where: { name: areaType.name },
      update: {
        description: areaType.description,
        scope: areaType.scope,
        guidanceItems: areaType.guidanceItems,
      },
      create: {
        name: areaType.name,
        description: areaType.description,
        scope: areaType.scope,
        guidanceItems: areaType.guidanceItems,
      },
    })
  }

  console.log(`Ensured ${RESIDENTIAL_AREA_TYPES.length} residential area types`)

  // Seed inspector guidance checklists per area type
  const areaTypeGuidance: Record<string, string[]> = {
    Washroom: [
      'Toilets/urinals sanitized',
      'Sinks/faucets clean',
      'Mirrors streak-free',
      'Dispensers stocked (soap, paper, sanitizer)',
      'Floors mopped, no standing water',
      'Trash emptied and liners replaced',
      'Partitions wiped down',
      'Baseboards free of buildup',
    ],
    Lobby: [
      'Floors clean and free of debris',
      'Entry mats clean and positioned',
      'Glass/doors streak-free',
      'Furniture dusted and wiped',
      'Reception surfaces clean',
      'Trash emptied and liners replaced',
    ],
    'Break Room': [
      'Counters sanitized',
      'Sink clean and drain clear',
      'Microwave interior/exterior clean',
      'Fridge exterior wiped',
      'Floors mopped',
      'Trash/recycling emptied and liners replaced',
    ],
    Office: [
      'Desks and surfaces dusted',
      'Trash emptied and liners replaced',
      'Floors vacuumed or mopped',
      'Glass/partitions clean',
      'Door handles and switches sanitized',
    ],
    'Conference Room': [
      'Table wiped and sanitized',
      'Chairs wiped and arranged',
      'Whiteboard cleaned',
      'Floors vacuumed',
      'Trash emptied and liners replaced',
    ],
    Kitchen: [
      'Counters sanitized',
      'Sink and drain clear',
      'Appliance exteriors wiped',
      'Floors mopped',
      'Trash emptied and liners replaced',
      'Cleaning supplies stocked',
    ],
    Hallway: [
      'Floors clean and free of debris',
      'Walls free of marks and scuffs',
      'Baseboards wiped',
      'Trash/recycling emptied',
    ],
    Corridor: [
      'Floors clean and free of debris',
      'Walls free of marks and scuffs',
      'Baseboards wiped',
      'Trash/recycling emptied',
    ],
    Stairwell: [
      'Steps swept and mopped',
      'Handrails wiped and sanitized',
      'Landings free of debris',
      'Corners and edges swept',
    ],
    'Elevator Lobby': [
      'Floor clean and streak-free',
      'Elevator door tracks free of debris',
      'Walls free of marks and fingerprints',
      'Surfaces wiped and dusted',
    ],
    Gym: [
      'Equipment surfaces wiped and sanitized',
      'Floors mopped',
      'Mirrors clean and streak-free',
      'Trash emptied and liners replaced',
      'Dispensers stocked (wipes, sanitizer)',
    ],
    ...Object.fromEntries(
      RESIDENTIAL_AREA_TYPES.map((areaType) => [areaType.name, areaType.guidanceItems])
    ),
  }

  // Generic guidance for all remaining area types
  const genericGuidance = [
    'Floors clean and free of debris',
    'Trash emptied and liners replaced',
    'Surfaces dusted and wiped',
    'No spills or stains',
    'Baseboards and edges clean',
  ]

  // Get all area type names to apply generic guidance to those not explicitly listed
  const allAreaTypeRows = await prisma.areaType.findMany({
    select: { name: true },
  })

  for (const row of allAreaTypeRows) {
    const guidance = areaTypeGuidance[row.name] || genericGuidance
    await prisma.areaType.update({
      where: { name: row.name },
      data: { guidanceItems: guidance },
    })
  }

  console.log(`Updated guidance items for ${allAreaTypeRows.length} area types`)

  // Seed fixture and furniture types
  const fixtureTypes = await prisma.fixtureType.createMany({
    data: [
      // Furniture
      { name: 'Bench', category: 'furniture' },
      { name: 'Bookcase', category: 'furniture' },
      { name: 'Cart', category: 'furniture' },
      { name: 'Coffee Table', category: 'furniture' },
      { name: 'Conference Table', category: 'furniture' },
      { name: 'Desk', category: 'furniture' },
      { name: 'Filing Cabinet', category: 'furniture' },
      { name: 'Guest Chair', category: 'furniture' },
      { name: 'Locker', category: 'furniture' },
      { name: 'Meeting Table', category: 'furniture' },
      { name: 'Office Chair', category: 'furniture' },
      { name: 'Podium', category: 'furniture' },
      { name: 'Reception Desk', category: 'furniture' },
      { name: 'Shelving Unit', category: 'furniture' },
      { name: 'Side Table', category: 'furniture' },
      { name: 'Sofa', category: 'furniture' },
      { name: 'Stool', category: 'furniture' },
      { name: 'Storage Cabinet', category: 'furniture' },
      { name: 'Trash Can', category: 'furniture' },
      { name: 'Workstation', category: 'furniture' },

      // Fixtures
      { name: 'Ceiling Fan', category: 'fixture' },
      { name: 'Exit Sign', category: 'fixture' },
      { name: 'Faucet', category: 'fixture' },
      { name: 'Fire Extinguisher', category: 'fixture' },
      { name: 'Glass Door', category: 'fixture' },
      { name: 'Grab Bar', category: 'fixture' },
      { name: 'Hand Dryer', category: 'fixture' },
      { name: 'Light Fixture', category: 'fixture' },
      { name: 'Mirror', category: 'fixture' },
      { name: 'Paper Towel Dispenser', category: 'fixture' },
      { name: 'Shower Head', category: 'fixture' },
      { name: 'Shower Stall', category: 'fixture' },
      { name: 'Sink', category: 'fixture' },
      { name: 'Soap Dispenser', category: 'fixture' },
      { name: 'Toilet', category: 'fixture' },
      { name: 'Toilet Paper Dispenser', category: 'fixture' },
      { name: 'Urinal', category: 'fixture' },
      { name: 'Wall Mounted TV', category: 'fixture' },
      { name: 'Water Fountain', category: 'fixture' },
      { name: 'Whiteboard', category: 'fixture' },
      { name: 'Window', category: 'fixture' },
      ...RESIDENTIAL_FIXTURE_TYPES
    ],
    skipDuplicates: true
  })

  console.log(`Created ${fixtureTypes.count} fixture types`)

  // Seed common lead sources
  const leadSources = await prisma.leadSource.createMany({
    data: [
      { name: 'Website', color: '#3B82F6' },
      { name: 'Referral', color: '#10B981' },
      { name: 'Cold Call', color: '#F59E0B' },
      { name: 'Google Ads', color: '#EF4444' },
      { name: 'Social Media', color: '#8B5CF6' },
      { name: 'Door-to-Door', color: '#EC4899' },
      { name: 'Trade Show', color: '#06B6D4' },
      { name: 'Other', color: '#6B7280' },
    ],
    skipDuplicates: true,
  })

  console.log(`Created ${leadSources.count} lead sources`)

  // Create default super admin user
  const superAdminEmail = 'admin@company.com'
  const superAdminName = 'System Administrator'
  const defaultPassword = 'Admin@123'
  const hashedPassword = await bcrypt.hash(defaultPassword, 10)

  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
    select: { id: true }
  })

  const seedUser = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {
      fullName: superAdminName,
      status: 'active'
    },
    create: {
      email: superAdminEmail,
      passwordHash: hashedPassword,
      fullName: superAdminName,
      status: 'active'
    }
  })

  const ownerRole = await prisma.role.findUnique({
    where: { key: 'owner' },
    select: { id: true }
  })

  if (!ownerRole) {
    throw new Error('Owner role not found during seed')
  }

  const hasOwnerRole = await prisma.userRole.findFirst({
    where: {
      userId: seedUser.id,
      roleId: ownerRole.id
    },
    select: { id: true }
  })

  if (!hasOwnerRole) {
    await prisma.userRole.create({
      data: {
        userId: seedUser.id,
        roleId: ownerRole.id
      }
    })
  }

  if (!existingSuperAdmin) {
    console.log('\n=================================================')
    console.log('Default Super Admin Created Successfully!')
    console.log('=================================================')
    console.log(`Email:    ${superAdminEmail}`)
    console.log(`Password: ${defaultPassword}`)
    console.log('=================================================')
    console.log('IMPORTANT: Change this password after first login!')
    console.log('=================================================\n')
  } else {
    console.log('Default super admin already exists (ensured owner role)')
  }

  const standardResidentialSettings = {
    strategyKey: 'residential_flat_v1',
    homeTypeBasePrices: {
      apartment: 140,
      condo: 160,
      townhouse: 175,
      single_family: 190
    },
    sqftBrackets: [
      { upTo: 1000, adjustment: 0 },
      { upTo: 1500, adjustment: 30 },
      { upTo: 2000, adjustment: 60 },
      { upTo: 3000, adjustment: 120 },
      { upTo: null, adjustment: 220 }
    ],
    bedroomAdjustments: { '0': 0, '1': 0, '2': 20, '3': 35, '4': 50, '5': 70, '6': 90 },
    bathroomAdjustments: { fullBath: 28, halfBath: 16 },
    levelAdjustments: { '1': 0, '2': 20, '3': 40, '4': 60 },
    conditionMultipliers: { light: 0.92, standard: 1, heavy: 1.28 },
    serviceTypeMultipliers: {
      recurring_standard: 1,
      one_time_standard: 1.12,
      deep_clean: 1.38,
      move_in_out: 1.48,
      turnover: 1.16,
      post_construction: 1.75
    },
    frequencyDiscounts: {
      weekly: 0.12,
      biweekly: 0.08,
      every_4_weeks: 0.03,
      one_time: 0
    },
    firstCleanSurcharge: {
      enabled: true,
      type: 'percent',
      value: 0.15,
      appliesTo: ['recurring_standard', 'deep_clean']
    },
    addOnPrices: {
      inside_fridge: { pricingType: 'flat', unitPrice: 25, estimatedMinutes: 20, description: 'Inside fridge' },
      inside_oven: { pricingType: 'flat', unitPrice: 30, estimatedMinutes: 25, description: 'Inside oven' },
      inside_cabinets: { pricingType: 'flat', unitPrice: 45, estimatedMinutes: 40, description: 'Inside cabinets' },
      interior_windows: { pricingType: 'per_unit', unitPrice: 6, estimatedMinutes: 6, unitLabel: 'window', description: 'Interior windows' },
      blinds: { pricingType: 'per_unit', unitPrice: 8, estimatedMinutes: 8, unitLabel: 'room', description: 'Blinds' },
      baseboards: { pricingType: 'flat', unitPrice: 35, estimatedMinutes: 25, description: 'Baseboards' },
      laundry: { pricingType: 'flat', unitPrice: 20, estimatedMinutes: 25, description: 'Laundry' },
      dishes: { pricingType: 'flat', unitPrice: 18, estimatedMinutes: 15, description: 'Dishes' },
      linen_change: { pricingType: 'per_unit', unitPrice: 12, estimatedMinutes: 10, unitLabel: 'bed', description: 'Linen change' },
      pet_hair_heavy: { pricingType: 'flat', unitPrice: 20, estimatedMinutes: 20, description: 'Heavy pet hair' },
      balcony_patio: { pricingType: 'flat', unitPrice: 25, estimatedMinutes: 20, description: 'Balcony / patio' },
      garage: { pricingType: 'flat', unitPrice: 35, estimatedMinutes: 30, description: 'Garage' }
    },
    minimumPrice: 160,
    estimatedHours: {
      baseHoursByHomeType: { apartment: 1.6, condo: 1.9, townhouse: 2.2, single_family: 2.5 },
      minutesPerBedroom: 12,
      minutesPerFullBath: 18,
      minutesPerHalfBath: 10,
      minutesPer1000SqFt: 42,
      conditionMultipliers: { light: 0.9, standard: 1, heavy: 1.35 },
      serviceTypeMultipliers: {
        recurring_standard: 1,
        one_time_standard: 1.1,
        deep_clean: 1.45,
        move_in_out: 1.55,
        turnover: 1.12,
        post_construction: 1.8
      },
      addOnMinutes: {
        inside_fridge: 20,
        inside_oven: 25,
        inside_cabinets: 40,
        interior_windows: 6,
        blinds: 8,
        baseboards: 25,
        laundry: 25,
        dishes: 15,
        linen_change: 10,
        pet_hair_heavy: 20,
        balcony_patio: 20,
        garage: 30
      }
    },
    manualReviewRules: {
      maxAutoSqft: 3500,
      heavyConditionRequiresReview: true,
      postConstructionRequiresReview: true,
      maxAddOnsBeforeReview: 5
    }
  }

  await prisma.residentialPricingPlan.upsert({
    where: { name: 'Standard Residential' },
    update: {
      strategyKey: 'residential_flat_v1',
      settings: standardResidentialSettings,
      isActive: true,
      isDefault: true,
      createdByUserId: seedUser.id
    },
    create: {
      name: 'Standard Residential',
      strategyKey: 'residential_flat_v1',
      settings: standardResidentialSettings,
      isActive: true,
      isDefault: true,
      createdByUserId: seedUser.id
    }
  })

  console.log('Ensured Standard Residential pricing plan exists')

  const commercialTaskTemplateSeeds = [
    // Daily
    {
      name: 'Disinfect High-Touch Surfaces',
      cleaningType: 'daily',
      areaTypeName: null,
      baseMinutes: 2, perSqftMinutes: 0, perUnitMinutes: 0.25, perRoomMinutes: 0,
      instructions: 'Disinfect handles, switches, and common touch points.'
    },
    {
      name: 'Empty Trash And Replace Liners',
      cleaningType: 'daily',
      areaTypeName: null,
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 1.5, perRoomMinutes: 0,
      instructions: 'Remove trash, replace liners, and wipe bin rims if needed.'
    },
    {
      name: 'Spot Clean Spills And Stains',
      cleaningType: 'daily',
      areaTypeName: null,
      baseMinutes: 3, perSqftMinutes: 0, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Blot spills and spot-clean stains on floors or upholstery.'
    },
    {
      name: 'Vacuum Or Sweep Floors',
      cleaningType: 'daily',
      areaTypeName: null,
      baseMinutes: 0, perSqftMinutes: 0.02, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Vacuum carpets and sweep hard floors in high-traffic paths.'
    },
    {
      name: 'Clean Dry Erase Boards',
      cleaningType: 'daily',
      areaTypeName: 'Meeting Room',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 2.0, perRoomMinutes: 0,
      instructions: 'Erase boards and wipe with board-safe cleaner to remove ghosting.'
    },
    {
      name: 'Clean Conference Room Tables And Chairs',
      cleaningType: 'daily',
      areaTypeName: 'Conference Room',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 0, perRoomMinutes: 8.0,
      instructions: 'Wipe tables and chair backs with disinfectant, then dry.'
    },
    {
      name: 'Clean Toilets And Urinals',
      cleaningType: 'daily',
      areaTypeName: 'Washroom',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 3.0, perRoomMinutes: 0,
      instructions: 'Apply disinfectant, scrub bowls and exteriors, then flush.'
    },
    {
      name: 'Clean Washroom Sinks And Counters',
      cleaningType: 'daily',
      areaTypeName: 'Washroom',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 2.0, perRoomMinutes: 0,
      instructions: 'Spray disinfectant on sinks/counters, scrub, and rinse.'
    },
    {
      name: 'Disinfect Hand Dryers And Paper Towel Holders',
      cleaningType: 'daily',
      areaTypeName: 'Washroom',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 0.5, perRoomMinutes: 0,
      instructions: 'Wipe touch points with disinfectant and dry.'
    },
    {
      name: 'Disinfect High-Touch Surfaces',
      cleaningType: 'daily',
      areaTypeName: 'Lobby',
      baseMinutes: 2, perSqftMinutes: 0, perUnitMinutes: 0.25, perRoomMinutes: 0,
      instructions: 'Wipe handles, switches, and elevator buttons with disinfectant.'
    },
    {
      name: 'Dust And Wipe Desks And Work Surfaces',
      cleaningType: 'daily',
      areaTypeName: 'Office',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 1.5, perRoomMinutes: 0,
      instructions: 'Dust desks, tables, and shelves, then wipe with a damp cloth.'
    },
    {
      name: 'Dust Showroom Displays',
      cleaningType: 'daily',
      areaTypeName: 'Showroom',
      baseMinutes: 2, perSqftMinutes: 0.005, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Dust display surfaces and spot-clean fingerprints.'
    },
    {
      name: 'Empty Dock Trash And Debris',
      cleaningType: 'daily',
      areaTypeName: 'Loading Dock',
      baseMinutes: 5, perSqftMinutes: 0, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Remove trash, clear debris, and replace liners.'
    },
    {
      name: 'Empty Trash And Replace Liners',
      cleaningType: 'daily',
      areaTypeName: 'Office',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 1.5, perRoomMinutes: 0,
      instructions: 'Remove trash, replace liners, and wipe bin rims if soiled.'
    },
    {
      name: 'Restock Washroom Supplies',
      cleaningType: 'daily',
      areaTypeName: 'Washroom',
      baseMinutes: 2, perSqftMinutes: 0, perUnitMinutes: 0.5, perRoomMinutes: 0,
      instructions: 'Refill soap, paper towels, and toilet paper to par levels.'
    },
    {
      name: 'Sanitize Warehouse High-Contact Surfaces',
      cleaningType: 'daily',
      areaTypeName: 'Warehouse',
      baseMinutes: 3, perSqftMinutes: 0, perUnitMinutes: 0.25, perRoomMinutes: 0,
      instructions: 'Disinfect handles, switches, and shared equipment touch points.'
    },
    {
      name: 'Spot Clean Spills And Stains',
      cleaningType: 'daily',
      areaTypeName: 'Corridor',
      baseMinutes: 3, perSqftMinutes: 0, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Blot spills and spot-clean stains on floors or upholstery.'
    },
    {
      name: 'Sweep And Spot Mop Retail Floor',
      cleaningType: 'daily',
      areaTypeName: 'Retail Floor',
      baseMinutes: 0, perSqftMinutes: 0.015, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Sweep debris and spot mop spills in high-traffic zones.'
    },
    {
      name: 'Sweep And Wet Mop Kitchen Floor',
      cleaningType: 'daily',
      areaTypeName: 'Kitchen',
      baseMinutes: 0, perSqftMinutes: 0.025, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Sweep debris, then wet mop with neutral cleaner.'
    },
    {
      name: 'Sweep Warehouse Aisles And Walkways',
      cleaningType: 'daily',
      areaTypeName: 'Warehouse',
      baseMinutes: 0, perSqftMinutes: 0.01, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Sweep aisles and walkways, removing debris and spills.'
    },
    {
      name: 'Vacuum Or Sweep Floors',
      cleaningType: 'daily',
      areaTypeName: 'Open Workspace',
      baseMinutes: 0, perSqftMinutes: 0.02, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Vacuum carpets and sweep hard floors in high-traffic paths.'
    },
    {
      name: 'Wipe Common Tables And Chairs',
      cleaningType: 'daily',
      areaTypeName: 'Break Room',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 1.5, perRoomMinutes: 0,
      instructions: 'Clean tabletops and chair backs with disinfectant.'
    },
    {
      name: 'Wipe Kitchen Surfaces And Appliance Exteriors',
      cleaningType: 'daily',
      areaTypeName: 'Kitchen',
      baseMinutes: 5, perSqftMinutes: 0, perUnitMinutes: 3.0, perRoomMinutes: 0,
      instructions: 'Wipe countertops and appliance fronts/handles with disinfectant.'
    },
    {
      name: 'Wipe Reception Desk And Counters',
      cleaningType: 'daily',
      areaTypeName: 'Reception',
      baseMinutes: 3, perSqftMinutes: 0, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Wipe counters and transaction surfaces with disinfectant.'
    },
    {
      name: 'Wash Pantry Sink',
      cleaningType: 'daily',
      areaTypeName: 'Pantry',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 3.0, perRoomMinutes: 0,
      instructions: 'Scrub the sink with cleaner, rinse, and dry.'
    },

    // Weekly
    {
      name: 'Clean Interior Windows And Glass Doors',
      cleaningType: 'weekly',
      areaTypeName: null,
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 2.5, perRoomMinutes: 0,
      instructions: 'Clean interior glass and doors with streak-free cleaner.'
    },
    {
      name: 'Mop Hard Floors',
      cleaningType: 'weekly',
      areaTypeName: null,
      baseMinutes: 0, perSqftMinutes: 0.016, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Wet mop hard floors with neutral cleaner and let dry.'
    },
    {
      name: 'Clean And Organize Storage Areas',
      cleaningType: 'weekly',
      areaTypeName: 'Storage Room',
      baseMinutes: 10, perSqftMinutes: 0.01, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Remove clutter, wipe shelves, and reset organization.'
    },
    {
      name: 'Clean And Sanitize Conference Surfaces',
      cleaningType: 'weekly',
      areaTypeName: 'Conference Room',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 0, perRoomMinutes: 8.0,
      instructions: 'Disinfect tables, armrests, and shared controls.'
    },
    {
      name: 'Clean Interior Windows And Glass Doors',
      cleaningType: 'weekly',
      areaTypeName: 'Lobby',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 2.5, perRoomMinutes: 0,
      instructions: 'Clean glass and doors with streak-free glass cleaner.'
    },
    {
      name: 'Clean Kitchen Appliances',
      cleaningType: 'weekly',
      areaTypeName: 'Kitchen',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 3.0, perRoomMinutes: 0,
      instructions: 'Clean microwave, refrigerator handles, and coffee equipment.'
    },
    {
      name: 'Clean Loading Dock Area',
      cleaningType: 'weekly',
      areaTypeName: 'Loading Dock',
      baseMinutes: 10, perSqftMinutes: 0.01, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Sweep and mop dock floors, removing buildup.'
    },
    {
      name: 'Clean Refrigerator Shelves',
      cleaningType: 'weekly',
      areaTypeName: 'Kitchen',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 10.0, perRoomMinutes: 0,
      instructions: 'Remove old items, wipe shelves, and return current items.'
    },
    {
      name: 'Deep Clean Washroom Fixtures',
      cleaningType: 'weekly',
      areaTypeName: 'Washroom',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 5.0, perRoomMinutes: 0,
      instructions: 'Scrub toilets, sinks, and floors with disinfectant.'
    },
    {
      name: 'Disinfect Keyboards And Phones',
      cleaningType: 'weekly',
      areaTypeName: 'Office',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 1.0, perRoomMinutes: 0,
      instructions: 'Wipe keyboards, mice, and phones with electronics-safe disinfectant.'
    },
    {
      name: 'Dust Blinds And Window Sills',
      cleaningType: 'weekly',
      areaTypeName: 'Office',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 3.0, perRoomMinutes: 0,
      instructions: 'Dust blinds and wipe sills to remove buildup.'
    },
    {
      name: 'Dust Warehouse Shelves And Racks',
      cleaningType: 'weekly',
      areaTypeName: 'Warehouse',
      baseMinutes: 0, perSqftMinutes: 0.015, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Dust shelves, racks, and overhead structures safely.'
    },
    {
      name: 'Mop Hard Floors',
      cleaningType: 'weekly',
      areaTypeName: 'Corridor',
      baseMinutes: 0, perSqftMinutes: 0.016, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Wet mop hard floors with neutral cleaner and let dry.'
    },
    {
      name: 'Mop Warehouse Floors',
      cleaningType: 'weekly',
      areaTypeName: 'Warehouse',
      baseMinutes: 0, perSqftMinutes: 0.012, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Mop floors and spot-treat heavy-use zones.'
    },
    {
      name: 'Sanitize Washroom Dispensers',
      cleaningType: 'weekly',
      areaTypeName: 'Washroom',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 1.0, perRoomMinutes: 0,
      instructions: 'Clean and refill soap, towel, and toilet paper dispensers.'
    },
    {
      name: 'Vacuum Upholstered Furniture',
      cleaningType: 'weekly',
      areaTypeName: 'Lounge',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 2.0, perRoomMinutes: 0,
      instructions: 'Vacuum upholstery and cushions to remove dust and crumbs.'
    },

    // Biweekly
    {
      name: 'Clean Baseboards',
      cleaningType: 'biweekly',
      areaTypeName: 'Office',
      baseMinutes: 0, perSqftMinutes: 0.025, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Wipe baseboards to remove dust and scuffs.'
    },
    {
      name: 'Clean Glass Partitions And Doors',
      cleaningType: 'biweekly',
      areaTypeName: 'Reception',
      baseMinutes: 0, perSqftMinutes: 0.02, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Clean glass partitions and doors with streak-free cleaner.'
    },
    {
      name: 'Clean Outside Of Trash Cans',
      cleaningType: 'biweekly',
      areaTypeName: 'Break Room',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 1.0, perRoomMinutes: 0,
      instructions: 'Wipe exterior surfaces of trash cans and lids.'
    },
    {
      name: 'Dust Vents, Handrails, And Sills',
      cleaningType: 'biweekly',
      areaTypeName: 'Hallway',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 2.0, perRoomMinutes: 0,
      instructions: 'Dust vents, handrails, shelves, and sills from top to bottom.'
    },
    {
      name: 'Polish Furniture And Wood Surfaces',
      cleaningType: 'biweekly',
      areaTypeName: 'Office',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 2.0, perRoomMinutes: 0,
      instructions: 'Dust then polish desks and wood furniture to remove smudges.'
    },
    {
      name: 'Sanitize Trash And Recycling Bins',
      cleaningType: 'biweekly',
      areaTypeName: 'Office',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 2.0, perRoomMinutes: 0,
      instructions: 'Wash or wipe bins with disinfectant and dry before relining.'
    },

    // Monthly
    {
      name: 'Dust High Surfaces',
      cleaningType: 'monthly',
      areaTypeName: null,
      baseMinutes: 0, perSqftMinutes: 0.015, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'High-dust shelves and upper surfaces top-to-bottom.'
    },
    {
      name: 'Buff And Polish Hardwood Floors',
      cleaningType: 'monthly',
      areaTypeName: 'Lobby',
      baseMinutes: 0, perSqftMinutes: 0.015, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Buff and polish hardwood floors to restore shine.'
    },
    {
      name: 'Check For Pest Activity',
      cleaningType: 'monthly',
      areaTypeName: 'Warehouse',
      baseMinutes: 5, perSqftMinutes: 0.002, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Inspect for pest activity and document any findings.'
    },
    {
      name: 'Clean Behind Appliances',
      cleaningType: 'monthly',
      areaTypeName: 'Kitchen',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 8.0, perRoomMinutes: 0,
      instructions: 'Move appliances safely and clean behind and underneath.'
    },
    {
      name: 'Clean Upholstery',
      cleaningType: 'monthly',
      areaTypeName: 'Lounge',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 5.0, perRoomMinutes: 0,
      instructions: 'Vacuum and spot-clean upholstery with fabric-safe cleaner.'
    },
    {
      name: 'Clean Vents And Filters',
      cleaningType: 'monthly',
      areaTypeName: 'Warehouse',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 2.0, perRoomMinutes: 0,
      instructions: 'Clean vents and filters to reduce dust buildup.'
    },
    {
      name: 'Deep Clean Carpets And Rugs',
      cleaningType: 'monthly',
      areaTypeName: 'Office',
      baseMinutes: 0, perSqftMinutes: 0.06, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Deep clean carpets and rugs to remove embedded soil.'
    },
    {
      name: 'Deep Clean Kitchen Tile And Grout',
      cleaningType: 'monthly',
      areaTypeName: 'Kitchen',
      baseMinutes: 0, perSqftMinutes: 0.05, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Scrub tile and grout with appropriate cleaner and rinse.'
    },
    {
      name: 'Deep Clean Tile And Grout',
      cleaningType: 'monthly',
      areaTypeName: 'Washroom',
      baseMinutes: 0, perSqftMinutes: 0.05, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Scrub tile and grout with disinfecting cleaner and rinse.'
    },
    {
      name: 'Dust High Surfaces',
      cleaningType: 'monthly',
      areaTypeName: 'Storage Room',
      baseMinutes: 0, perSqftMinutes: 0.015, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'High-dust shelves and upper surfaces top-to-bottom.'
    },
    {
      name: 'Dust Light Fixtures And Vents',
      cleaningType: 'monthly',
      areaTypeName: 'Corridor',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 2.0, perRoomMinutes: 0,
      instructions: 'Dust light fixtures and vents with high-dusting tools.'
    },
    {
      name: 'Organize And Clean Supply Closets',
      cleaningType: 'monthly',
      areaTypeName: 'Supply Closet',
      baseMinutes: 15, perSqftMinutes: 0, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Sort supplies, discard expired items, and wipe shelves.'
    },
    {
      name: 'Remove Expired Inventory',
      cleaningType: 'monthly',
      areaTypeName: 'Stockroom',
      baseMinutes: 10, perSqftMinutes: 0, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Remove expired items and clean shelves before restocking.'
    },
    {
      name: 'Replace Air Fresheners',
      cleaningType: 'monthly',
      areaTypeName: 'Washroom',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 1.0, perRoomMinutes: 0,
      instructions: 'Check and replace air fresheners or deodorizers as needed.'
    },

    // Quarterly
    {
      name: 'Buff And Polish Washroom Floors',
      cleaningType: 'quarterly',
      areaTypeName: 'Washroom',
      baseMinutes: 0, perSqftMinutes: 0.015, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Buff and polish floors to restore finish and sheen.'
    },
    {
      name: 'Clean Exterior Windows',
      cleaningType: 'quarterly',
      areaTypeName: 'Lobby',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 5.0, perRoomMinutes: 0,
      instructions: 'Clean accessible exterior windows and glass.'
    },
    {
      name: 'Deep Clean Carpets',
      cleaningType: 'quarterly',
      areaTypeName: 'Open Workspace',
      baseMinutes: 0, perSqftMinutes: 0.06, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Perform deep carpet cleaning to remove embedded soil.'
    },
    {
      name: 'Deep Clean Storage Areas',
      cleaningType: 'quarterly',
      areaTypeName: 'Storage Room',
      baseMinutes: 10, perSqftMinutes: 0.02, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Deep clean storage areas and reset organization.'
    },
    {
      name: 'Deep Clean Upholstery, Drapes, And Blinds',
      cleaningType: 'quarterly',
      areaTypeName: 'Lounge',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 8.0, perRoomMinutes: 0,
      instructions: 'Deep clean upholstery and window treatments.'
    },
    {
      name: 'Strip And Refinish Hard Floors If Needed',
      cleaningType: 'quarterly',
      areaTypeName: 'Corridor',
      baseMinutes: 0, perSqftMinutes: 0.15, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Strip and refinish hard floors where finish is worn.'
    },
    {
      name: 'Wash Walls And Touch Up Paint',
      cleaningType: 'quarterly',
      areaTypeName: 'Hallway',
      baseMinutes: 0, perSqftMinutes: 0.03, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Wash walls and note areas needing touch-up.'
    },

    // Annual
    {
      name: 'Clean HVAC Ducts And Replace Filters',
      cleaningType: 'annual',
      areaTypeName: 'Mechanical Room',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 5.0, perRoomMinutes: 0,
      instructions: 'Coordinate duct cleaning and replace filters.'
    },
    {
      name: 'Deep Extraction Carpet Cleaning',
      cleaningType: 'annual',
      areaTypeName: 'Office',
      baseMinutes: 0, perSqftMinutes: 0.1, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Perform hot-water extraction to deep clean carpet fibers.'
    },
    {
      name: 'Power Wash Exterior Entrances',
      cleaningType: 'annual',
      areaTypeName: 'Loading Dock',
      baseMinutes: 15, perSqftMinutes: 0.01, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Pressure wash entryways and walkways to remove grime.'
    },
    {
      name: 'Strip And Wax VCT/Tile Floors',
      cleaningType: 'annual',
      areaTypeName: 'Lobby',
      baseMinutes: 0, perSqftMinutes: 0.15, perUnitMinutes: 0, perRoomMinutes: 0,
      instructions: 'Strip old finish and apply fresh wax coats.'
    },
    {
      name: 'Wash Exterior Windows And Frames',
      cleaningType: 'annual',
      areaTypeName: 'Reception',
      baseMinutes: 0, perSqftMinutes: 0, perUnitMinutes: 5.0, perRoomMinutes: 0,
      instructions: 'Wash exterior glass, frames, and sills for curb appeal.'
    }
  ]

  const taskTemplateSeeds = [
    ...commercialTaskTemplateSeeds.map((task) => ({
      ...task,
      scope:
        task.areaTypeName && sharedAreaTypeNames.has(task.areaTypeName)
          ? ('both' as const)
          : ('commercial' as const),
    })),
    ...RESIDENTIAL_TASK_TEMPLATE_SEEDS,
  ]

  const areaTypeNames = Array.from(
    new Set(
      taskTemplateSeeds
        .map((task) => task.areaTypeName)
        .filter((name): name is string => Boolean(name))
    )
  )

  const areaTypeRows = await prisma.areaType.findMany({
    where: { name: { in: areaTypeNames } },
    select: { id: true, name: true }
  })

  const areaTypeMap = new Map(areaTypeRows.map((row) => [row.name, row.id]))

  const missingAreaTypes = areaTypeNames.filter(
    (name) => !areaTypeMap.has(name)
  )

  if (missingAreaTypes.length > 0) {
    throw new Error(
      `Missing area types for task templates: ${missingAreaTypes.join(', ')}`
    )
  }

  const taskTemplatesData = taskTemplateSeeds.map((task) => ({
    name: task.name,
    scope: task.scope,
    cleaningType: task.cleaningType,
    areaTypeId: task.areaTypeName
      ? (areaTypeMap.get(task.areaTypeName) ?? null)
      : null,
    estimatedMinutes: 0,
    baseMinutes: task.baseMinutes ?? 0,
    perSqftMinutes: task.perSqftMinutes ?? 0,
    perUnitMinutes: task.perUnitMinutes ?? 0,
    perRoomMinutes: task.perRoomMinutes ?? 0,
    instructions: task.instructions,
    isGlobal: true,
    createdByUserId: seedUser.id
  }))

  const existingTaskTemplates = await prisma.taskTemplate.findMany({
    where: {
      isGlobal: true,
      facilityId: null,
      name: { in: Array.from(new Set(taskTemplatesData.map((t) => t.name))) }
    },
    select: { name: true, cleaningType: true, areaTypeId: true }
  })

  const existingTaskKeys = new Set(
    existingTaskTemplates.map(
      (task) =>
        `${task.name}||${task.cleaningType}||${task.areaTypeId ?? 'null'}`
    )
  )

  const newTaskTemplates = taskTemplatesData.filter(
    (task) =>
      !existingTaskKeys.has(
        `${task.name}||${task.cleaningType}||${task.areaTypeId ?? 'null'}`
      )
  )

  if (newTaskTemplates.length > 0) {
    const createdTasks = await prisma.taskTemplate.createMany({
      data: newTaskTemplates
    })

    console.log(`Created ${createdTasks.count} global task templates`)
  } else {
    console.log('No new global task templates to create')
  }

  // Sync existing global templates to the current seed definition
  let syncedTaskTemplateCount = 0
  for (const task of taskTemplateSeeds) {
    const areaTypeId = task.areaTypeName
      ? (areaTypeMap.get(task.areaTypeName) ?? null)
      : null
    const result = await prisma.taskTemplate.updateMany({
      where: {
        name: task.name,
        cleaningType: task.cleaningType,
        isGlobal: true,
        areaTypeId: areaTypeId,
      },
      data: {
        scope: task.scope,
        baseMinutes: task.baseMinutes ?? 0,
        perSqftMinutes: task.perSqftMinutes ?? 0,
        perUnitMinutes: task.perUnitMinutes ?? 0,
        perRoomMinutes: task.perRoomMinutes ?? 0,
        instructions: task.instructions,
      },
    })
    syncedTaskTemplateCount += result.count
  }

  if (syncedTaskTemplateCount > 0) {
    console.log(`Synced ${syncedTaskTemplateCount} existing global task templates`)
  }

  const areaTemplateFixtureMap: Record<string, string[]> = {
    'Break Room': [
      'Meeting Table',
      'Guest Chair',
      'Trash Can',
      'Sink',
      'Faucet',
      'Soap Dispenser',
      'Paper Towel Dispenser'
    ],
    Cafeteria: [
      'Meeting Table',
      'Guest Chair',
      'Trash Can',
      'Water Fountain',
      'Sink',
      'Faucet',
      'Soap Dispenser',
      'Paper Towel Dispenser'
    ],
    'Changing Room': ['Locker', 'Bench', 'Mirror', 'Trash Can'],
    Classroom: ['Desk', 'Guest Chair', 'Whiteboard', 'Wall Mounted TV'],
    'Clinic Room': [
      'Guest Chair',
      'Sink',
      'Faucet',
      'Soap Dispenser',
      'Paper Towel Dispenser',
      'Trash Can',
      'Mirror'
    ],
    'Conference Room': [
      'Conference Table',
      'Office Chair',
      'Guest Chair',
      'Whiteboard',
      'Wall Mounted TV'
    ],
    'Copy Room': ['Storage Cabinet', 'Shelving Unit', 'Trash Can'],
    Corridor: [
      'Light Fixture',
      'Exit Sign',
      'Fire Extinguisher',
      'Water Fountain'
    ],
    'Cubicle Area': [
      'Workstation',
      'Office Chair',
      'Trash Can',
      'Storage Cabinet'
    ],
    'Dining Area': [
      'Meeting Table',
      'Guest Chair',
      'Trash Can',
      'Water Fountain'
    ],
    'Electrical Room': ['Light Fixture', 'Fire Extinguisher'],
    'Elevator Lobby': ['Light Fixture', 'Exit Sign', 'Fire Extinguisher'],
    'Exam Room': [
      'Guest Chair',
      'Sink',
      'Faucet',
      'Soap Dispenser',
      'Paper Towel Dispenser',
      'Trash Can',
      'Mirror'
    ],
    Gym: ['Bench', 'Trash Can', 'Water Fountain', 'Mirror'],
    Hallway: [
      'Light Fixture',
      'Exit Sign',
      'Fire Extinguisher',
      'Water Fountain'
    ],
    'Janitor Closet': [
      'Storage Cabinet',
      'Shelving Unit',
      'Cart',
      'Trash Can',
      'Sink',
      'Faucet'
    ],
    Kitchen: [
      'Sink',
      'Faucet',
      'Soap Dispenser',
      'Paper Towel Dispenser',
      'Trash Can'
    ],
    Lab: [
      'Sink',
      'Faucet',
      'Soap Dispenser',
      'Paper Towel Dispenser',
      'Trash Can',
      'Storage Cabinet'
    ],
    'Loading Dock': ['Cart', 'Trash Can', 'Light Fixture', 'Fire Extinguisher'],
    'Locker Room': ['Locker', 'Bench', 'Mirror', 'Trash Can'],
    Lobby: [
      'Sofa',
      'Coffee Table',
      'Side Table',
      'Bench',
      'Trash Can',
      'Glass Door',
      'Window'
    ],
    Lounge: ['Sofa', 'Coffee Table', 'Side Table', 'Trash Can', 'Window'],
    'Mail Room': ['Storage Cabinet', 'Shelving Unit', 'Trash Can'],
    'Manufacturing Floor': ['Light Fixture', 'Fire Extinguisher', 'Trash Can'],
    'Mechanical Room': ['Light Fixture', 'Fire Extinguisher'],
    'Meeting Room': [
      'Meeting Table',
      'Office Chair',
      'Guest Chair',
      'Whiteboard',
      'Wall Mounted TV'
    ],
    Office: [
      'Desk',
      'Office Chair',
      'Guest Chair',
      'Filing Cabinet',
      'Storage Cabinet',
      'Trash Can',
      'Bookcase'
    ],
    'Open Workspace': [
      'Workstation',
      'Office Chair',
      'Guest Chair',
      'Trash Can',
      'Storage Cabinet'
    ],
    Pantry: [
      'Sink',
      'Faucet',
      'Soap Dispenser',
      'Paper Towel Dispenser',
      'Trash Can'
    ],
    'Private Office': [
      'Desk',
      'Office Chair',
      'Guest Chair',
      'Filing Cabinet',
      'Storage Cabinet',
      'Trash Can',
      'Bookcase'
    ],
    Reception: [
      'Reception Desk',
      'Guest Chair',
      'Trash Can',
      'Glass Door',
      'Window'
    ],
    'Retail Floor': ['Shelving Unit', 'Trash Can', 'Glass Door', 'Window'],
    'Security Room': [
      'Desk',
      'Office Chair',
      'Storage Cabinet',
      'Trash Can',
      'Wall Mounted TV'
    ],
    'Server Room': ['Storage Cabinet', 'Shelving Unit', 'Fire Extinguisher'],
    'Shower Room': [
      'Shower Stall',
      'Shower Head',
      'Sink',
      'Faucet',
      'Soap Dispenser',
      'Paper Towel Dispenser',
      'Grab Bar',
      'Trash Can',
      'Mirror'
    ],
    Showroom: [
      'Shelving Unit',
      'Trash Can',
      'Glass Door',
      'Window',
      'Coffee Table',
      'Side Table'
    ],
    Stairwell: ['Light Fixture', 'Exit Sign', 'Fire Extinguisher'],
    'Storage Room': ['Shelving Unit', 'Storage Cabinet', 'Trash Can'],
    Stockroom: ['Shelving Unit', 'Storage Cabinet', 'Trash Can'],
    'Supply Closet': ['Shelving Unit', 'Storage Cabinet', 'Trash Can'],
    'Training Room': [
      'Meeting Table',
      'Guest Chair',
      'Whiteboard',
      'Wall Mounted TV'
    ],
    'Waiting Area': [
      'Sofa',
      'Coffee Table',
      'Side Table',
      'Guest Chair',
      'Trash Can'
    ],
    Warehouse: ['Shelving Unit', 'Cart', 'Trash Can', 'Light Fixture'],
    Washroom: [
      'Toilet',
      'Urinal',
      'Sink',
      'Faucet',
      'Mirror',
      'Soap Dispenser',
      'Paper Towel Dispenser',
      'Hand Dryer',
      'Toilet Paper Dispenser',
      'Grab Bar',
      'Trash Can'
    ],
    Workshop: [
      'Storage Cabinet',
      'Shelving Unit',
      'Trash Can',
      'Light Fixture',
      'Fire Extinguisher'
    ],
    ...RESIDENTIAL_AREA_TEMPLATE_FIXTURES
  }

  const areaTypesForTemplates = await prisma.areaType.findMany({
    select: { id: true, name: true, scope: true }
  })

  const existingTemplates = await prisma.areaTemplate.findMany({
    select: {
      id: true,
      areaTypeId: true,
      items: {
        select: {
          fixtureTypeId: true
        }
      },
      tasks: {
        select: {
          taskTemplateId: true
        }
      }
    }
  })

  const existingTemplateByAreaTypeId = new Map(
    existingTemplates.map((template) => [template.areaTypeId, template])
  )

  const fixtureRows = await prisma.fixtureType.findMany({
    select: { id: true, name: true }
  })

  const fixtureTypeMap = new Map(fixtureRows.map((row) => [row.name, row.id]))

  const taskTemplateRows = await prisma.taskTemplate.findMany({
    where: {
      isGlobal: true,
      facilityId: null,
      isActive: true
    },
    select: { id: true, name: true, cleaningType: true, areaTypeId: true, scope: true }
  })

  const generalTaskTemplates = taskTemplateRows.filter(
    (task) => !task.areaTypeId
  )

  const tasksByAreaTypeId = new Map<string, typeof taskTemplateRows>()
  for (const task of taskTemplateRows) {
    if (!task.areaTypeId) continue
    const list = tasksByAreaTypeId.get(task.areaTypeId) || []
    list.push(task)
    tasksByAreaTypeId.set(task.areaTypeId, list)
  }

  const frequencyOrder = [
    'daily',
    'weekly',
    'biweekly',
    'monthly',
    'quarterly',
    'annual',
    'deep_clean',
    'move_out',
    'post_construction'
  ]
  const frequencyIndex = new Map(
    frequencyOrder.map((frequency, index) => [frequency, index])
  )

  const sortTasksByFrequency = (
    a: { name: string; cleaningType: string },
    b: { name: string; cleaningType: string }
  ) => {
    const aIndex = frequencyIndex.get(a.cleaningType) ?? 999
    const bIndex = frequencyIndex.get(b.cleaningType) ?? 999
    if (aIndex !== bIndex) return aIndex - bIndex
    return a.name.localeCompare(b.name)
  }

  const taskScopeMatchesAreaScope = (
    areaScope: 'residential' | 'commercial' | 'both',
    taskScope: 'residential' | 'commercial' | 'both'
  ) => {
    if (areaScope === 'both') {
      return taskScope === 'both'
    }

    return taskScope === areaScope || taskScope === 'both'
  }

  let createdAreaTemplates = 0
  let backfilledAreaTemplateItems = 0
  let backfilledAreaTemplateTasks = 0
  for (const areaType of areaTypesForTemplates) {
    const fixtureNames = areaTemplateFixtureMap[areaType.name] || []
    const missingFixtures = fixtureNames.filter(
      (name) => !fixtureTypeMap.has(name)
    )
    if (missingFixtures.length > 0) {
      throw new Error(
        `Missing fixture types for ${areaType.name}: ${missingFixtures.join(', ')}`
      )
    }

    const itemsData = fixtureNames.map((name, index) => ({
      fixtureTypeId: fixtureTypeMap.get(name) as string,
      defaultCount: 0,
      minutesPerItem: 0,
      sortOrder: index
    }))

    const areaSpecificTasks = (tasksByAreaTypeId.get(areaType.id) || []).filter((task) =>
      taskScopeMatchesAreaScope(areaType.scope, task.scope)
    )
    const taskNameSet = new Set(
      areaSpecificTasks.map((task) => task.name.toLowerCase())
    )
    const combinedTasks = [...areaSpecificTasks]
    for (const task of generalTaskTemplates) {
      if (!taskScopeMatchesAreaScope(areaType.scope, task.scope)) {
        continue
      }
      const key = task.name.toLowerCase()
      if (taskNameSet.has(key)) continue
      combinedTasks.push(task)
      taskNameSet.add(key)
    }

    combinedTasks.sort(sortTasksByFrequency)
    const taskData = combinedTasks.map((task, index) => ({
      taskTemplateId: task.id,
      sortOrder: index
    }))

    const existingTemplate = existingTemplateByAreaTypeId.get(areaType.id)

    if (!existingTemplate) {
      await prisma.areaTemplate.create({
        data: {
          areaTypeId: areaType.id,
          name: null,
          defaultSquareFeet: null,
          createdByUserId: seedUser.id,
          items: itemsData.length > 0 ? { create: itemsData } : undefined,
          tasks: taskData.length > 0 ? { create: taskData } : undefined
        },
        select: { id: true }
      })

      createdAreaTemplates += 1
      continue
    }

    const existingFixtureTypeIds = new Set(
      existingTemplate.items.map((item) => item.fixtureTypeId)
    )
    const missingItems = itemsData.filter(
      (item) => !existingFixtureTypeIds.has(item.fixtureTypeId)
    )

    if (missingItems.length > 0) {
      const createdItems = await prisma.areaTemplateItem.createMany({
        data: missingItems.map((item) => ({
          areaTemplateId: existingTemplate.id,
          fixtureTypeId: item.fixtureTypeId,
          defaultCount: item.defaultCount,
          minutesPerItem: item.minutesPerItem,
          sortOrder: item.sortOrder
        })),
        skipDuplicates: true
      })
      backfilledAreaTemplateItems += createdItems.count
    }

    const existingTaskTemplateIds = new Set(
      existingTemplate.tasks
        .map((task) => task.taskTemplateId)
        .filter((taskTemplateId): taskTemplateId is string => Boolean(taskTemplateId))
    )
    const missingTasks = taskData.filter(
      (task) => !existingTaskTemplateIds.has(task.taskTemplateId)
    )

    if (missingTasks.length > 0) {
      const createdTasks = await prisma.areaTemplateTask.createMany({
        data: missingTasks.map((task) => ({
          areaTemplateId: existingTemplate.id,
          taskTemplateId: task.taskTemplateId,
          sortOrder: task.sortOrder
        }))
      })
      backfilledAreaTemplateTasks += createdTasks.count
    }
  }

  if (createdAreaTemplates > 0) {
    console.log(`Created ${createdAreaTemplates} area templates`)
  } else {
    console.log('No new area templates to create')
  }

  if (backfilledAreaTemplateItems > 0) {
    console.log(`Backfilled ${backfilledAreaTemplateItems} missing area template items`)
  } else {
    console.log('No missing area template items to backfill')
  }

  if (backfilledAreaTemplateTasks > 0) {
    console.log(`Backfilled ${backfilledAreaTemplateTasks} missing area template tasks`)
  } else {
    console.log('No missing area template tasks to backfill')
  }

  console.log('Database seed completed successfully')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('Error seeding database:', e)
    await prisma.$disconnect()
    process.exit(1)
  })

