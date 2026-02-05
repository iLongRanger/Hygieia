import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

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
      }
    ],
    skipDuplicates: true
  })

  console.log(`Created ${roles.count} system roles`)

  // Seed commercial area types
  const areaTypes = await prisma.areaType.createMany({
    data: [
      { name: 'Break Room' },
      { name: 'Cafeteria' },
      { name: 'Changing Room' },
      { name: 'Classroom' },
      { name: 'Clinic Room' },
      { name: 'Conference Room' },
      { name: 'Copy Room' },
      { name: 'Corridor' },
      { name: 'Cubicle Area' },
      { name: 'Dining Area' },
      { name: 'Electrical Room' },
      { name: 'Elevator Lobby' },
      { name: 'Exam Room' },
      { name: 'Gym' },
      { name: 'Hallway' },
      { name: 'Janitor Closet' },
      { name: 'Kitchen' },
      { name: 'Lab' },
      { name: 'Loading Dock' },
      { name: 'Locker Room' },
      { name: 'Lobby' },
      { name: 'Lounge' },
      { name: 'Mail Room' },
      { name: 'Manufacturing Floor' },
      { name: 'Mechanical Room' },
      { name: 'Meeting Room' },
      { name: 'Office' },
      { name: 'Open Workspace' },
      { name: 'Pantry' },
      { name: 'Private Office' },
      { name: 'Reception' },
      { name: 'Retail Floor' },
      { name: 'Security Room' },
      { name: 'Server Room' },
      { name: 'Shower Room' },
      { name: 'Showroom' },
      { name: 'Stairwell' },
      { name: 'Storage Room' },
      { name: 'Stockroom' },
      { name: 'Supply Closet' },
      { name: 'Training Room' },
      { name: 'Waiting Area' },
      { name: 'Warehouse' },
      { name: 'Washroom' },
      { name: 'Workshop' }
    ],
    skipDuplicates: true
  })

  console.log(`Created ${areaTypes.count} commercial area types`)

  // Seed commercial fixture and furniture types
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
      { name: 'Window', category: 'fixture' }
    ],
    skipDuplicates: true
  })

  console.log(`Created ${fixtureTypes.count} commercial fixture types`)

  // Create default super admin user
  const defaultPassword = 'Admin@123'
  const hashedPassword = await bcrypt.hash(defaultPassword, 10)

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@company.com' }
  })

  if (!existingAdmin) {
    // Create the admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@company.com',
        passwordHash: hashedPassword,
        fullName: 'System Administrator',
        status: 'active'
      }
    })

    // Get the owner role
    const ownerRole = await prisma.role.findUnique({
      where: { key: 'owner' }
    })

    if (ownerRole) {
      // Assign owner role to admin user
      await prisma.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: ownerRole.id
        }
      })

      console.log('\n=================================================')
      console.log('✅ Default Super Admin Created Successfully!')
      console.log('=================================================')
      console.log('Email:    admin@company.com')
      console.log('Password:', defaultPassword)
      console.log('=================================================')
      console.log('⚠️  IMPORTANT: Change this password after first login!')
      console.log('=================================================\n')
    }
  } else {
    console.log('ℹ️  Default admin user already exists')
  }

  const seedUser = await prisma.user.findUnique({
    where: { email: 'admin@company.com' }
  })

  if (!seedUser) {
    throw new Error('Seed user not found for task templates')
  }

  const taskTemplateSeeds = [
    // Daily
    {
      name: 'Disinfect High-Touch Surfaces',
      cleaningType: 'daily',
      areaTypeName: null,
      instructions: 'Disinfect handles, switches, and common touch points.'
    },
    {
      name: 'Empty Trash And Replace Liners',
      cleaningType: 'daily',
      areaTypeName: null,
      instructions: 'Remove trash, replace liners, and wipe bin rims if needed.'
    },
    {
      name: 'Spot Clean Spills And Stains',
      cleaningType: 'daily',
      areaTypeName: null,
      instructions: 'Blot spills and spot-clean stains on floors or upholstery.'
    },
    {
      name: 'Vacuum Or Sweep Floors',
      cleaningType: 'daily',
      areaTypeName: null,
      instructions: 'Vacuum carpets and sweep hard floors in high-traffic paths.'
    },
    {
      name: 'Clean Dry Erase Boards',
      cleaningType: 'daily',
      areaTypeName: 'Meeting Room',
      instructions: 'Erase boards and wipe with board-safe cleaner to remove ghosting.'
    },
    {
      name: 'Clean Conference Room Tables And Chairs',
      cleaningType: 'daily',
      areaTypeName: 'Conference Room',
      instructions: 'Wipe tables and chair backs with disinfectant, then dry.'
    },
    {
      name: 'Clean Toilets And Urinals',
      cleaningType: 'daily',
      areaTypeName: 'Washroom',
      instructions: 'Apply disinfectant, scrub bowls and exteriors, then flush.'
    },
    {
      name: 'Clean Washroom Sinks And Counters',
      cleaningType: 'daily',
      areaTypeName: 'Washroom',
      instructions: 'Spray disinfectant on sinks/counters, scrub, and rinse.'
    },
    {
      name: 'Disinfect Hand Dryers And Paper Towel Holders',
      cleaningType: 'daily',
      areaTypeName: 'Washroom',
      instructions: 'Wipe touch points with disinfectant and dry.'
    },
    {
      name: 'Disinfect High-Touch Surfaces',
      cleaningType: 'daily',
      areaTypeName: 'Lobby',
      instructions: 'Wipe handles, switches, and elevator buttons with disinfectant.'
    },
    {
      name: 'Dust And Wipe Desks And Work Surfaces',
      cleaningType: 'daily',
      areaTypeName: 'Office',
      instructions: 'Dust desks, tables, and shelves, then wipe with a damp cloth.'
    },
    {
      name: 'Dust Showroom Displays',
      cleaningType: 'daily',
      areaTypeName: 'Showroom',
      instructions: 'Dust display surfaces and spot-clean fingerprints.'
    },
    {
      name: 'Empty Dock Trash And Debris',
      cleaningType: 'daily',
      areaTypeName: 'Loading Dock',
      instructions: 'Remove trash, clear debris, and replace liners.'
    },
    {
      name: 'Empty Trash And Replace Liners',
      cleaningType: 'daily',
      areaTypeName: 'Office',
      instructions: 'Remove trash, replace liners, and wipe bin rims if soiled.'
    },
    {
      name: 'Restock Washroom Supplies',
      cleaningType: 'daily',
      areaTypeName: 'Washroom',
      instructions: 'Refill soap, paper towels, and toilet paper to par levels.'
    },
    {
      name: 'Sanitize Warehouse High-Contact Surfaces',
      cleaningType: 'daily',
      areaTypeName: 'Warehouse',
      instructions: 'Disinfect handles, switches, and shared equipment touch points.'
    },
    {
      name: 'Spot Clean Spills And Stains',
      cleaningType: 'daily',
      areaTypeName: 'Corridor',
      instructions: 'Blot spills and spot-clean stains on floors or upholstery.'
    },
    {
      name: 'Sweep And Spot Mop Retail Floor',
      cleaningType: 'daily',
      areaTypeName: 'Retail Floor',
      instructions: 'Sweep debris and spot mop spills in high-traffic zones.'
    },
    {
      name: 'Sweep And Wet Mop Kitchen Floor',
      cleaningType: 'daily',
      areaTypeName: 'Kitchen',
      instructions: 'Sweep debris, then wet mop with neutral cleaner.'
    },
    {
      name: 'Sweep Warehouse Aisles And Walkways',
      cleaningType: 'daily',
      areaTypeName: 'Warehouse',
      instructions: 'Sweep aisles and walkways, removing debris and spills.'
    },
    {
      name: 'Vacuum Or Sweep Floors',
      cleaningType: 'daily',
      areaTypeName: 'Open Workspace',
      instructions: 'Vacuum carpets and sweep hard floors in high-traffic paths.'
    },
    {
      name: 'Wipe Common Tables And Chairs',
      cleaningType: 'daily',
      areaTypeName: 'Break Room',
      instructions: 'Clean tabletops and chair backs with disinfectant.'
    },
    {
      name: 'Wipe Kitchen Surfaces And Appliance Exteriors',
      cleaningType: 'daily',
      areaTypeName: 'Kitchen',
      instructions: 'Wipe countertops and appliance fronts/handles with disinfectant.'
    },
    {
      name: 'Wipe Reception Desk And Counters',
      cleaningType: 'daily',
      areaTypeName: 'Reception',
      instructions: 'Wipe counters and transaction surfaces with disinfectant.'
    },
    {
      name: 'Wash Pantry Sink',
      cleaningType: 'daily',
      areaTypeName: 'Pantry',
      instructions: 'Scrub the sink with cleaner, rinse, and dry.'
    },

    // Weekly
    {
      name: 'Clean Interior Windows And Glass Doors',
      cleaningType: 'weekly',
      areaTypeName: null,
      instructions: 'Clean interior glass and doors with streak-free cleaner.'
    },
    {
      name: 'Mop Hard Floors',
      cleaningType: 'weekly',
      areaTypeName: null,
      instructions: 'Wet mop hard floors with neutral cleaner and let dry.'
    },
    {
      name: 'Clean And Organize Storage Areas',
      cleaningType: 'weekly',
      areaTypeName: 'Storage Room',
      instructions: 'Remove clutter, wipe shelves, and reset organization.'
    },
    {
      name: 'Clean And Sanitize Conference Surfaces',
      cleaningType: 'weekly',
      areaTypeName: 'Conference Room',
      instructions: 'Disinfect tables, armrests, and shared controls.'
    },
    {
      name: 'Clean Interior Windows And Glass Doors',
      cleaningType: 'weekly',
      areaTypeName: 'Lobby',
      instructions: 'Clean glass and doors with streak-free glass cleaner.'
    },
    {
      name: 'Clean Kitchen Appliances',
      cleaningType: 'weekly',
      areaTypeName: 'Kitchen',
      instructions: 'Clean microwave, refrigerator handles, and coffee equipment.'
    },
    {
      name: 'Clean Loading Dock Area',
      cleaningType: 'weekly',
      areaTypeName: 'Loading Dock',
      instructions: 'Sweep and mop dock floors, removing buildup.'
    },
    {
      name: 'Clean Refrigerator Shelves',
      cleaningType: 'weekly',
      areaTypeName: 'Kitchen',
      instructions: 'Remove old items, wipe shelves, and return current items.'
    },
    {
      name: 'Deep Clean Washroom Fixtures',
      cleaningType: 'weekly',
      areaTypeName: 'Washroom',
      instructions: 'Scrub toilets, sinks, and floors with disinfectant.'
    },
    {
      name: 'Disinfect Keyboards And Phones',
      cleaningType: 'weekly',
      areaTypeName: 'Office',
      instructions: 'Wipe keyboards, mice, and phones with electronics-safe disinfectant.'
    },
    {
      name: 'Dust Blinds And Window Sills',
      cleaningType: 'weekly',
      areaTypeName: 'Office',
      instructions: 'Dust blinds and wipe sills to remove buildup.'
    },
    {
      name: 'Dust Warehouse Shelves And Racks',
      cleaningType: 'weekly',
      areaTypeName: 'Warehouse',
      instructions: 'Dust shelves, racks, and overhead structures safely.'
    },
    {
      name: 'Mop Hard Floors',
      cleaningType: 'weekly',
      areaTypeName: 'Corridor',
      instructions: 'Wet mop hard floors with neutral cleaner and let dry.'
    },
    {
      name: 'Mop Warehouse Floors',
      cleaningType: 'weekly',
      areaTypeName: 'Warehouse',
      instructions: 'Mop floors and spot-treat heavy-use zones.'
    },
    {
      name: 'Sanitize Washroom Dispensers',
      cleaningType: 'weekly',
      areaTypeName: 'Washroom',
      instructions: 'Clean and refill soap, towel, and toilet paper dispensers.'
    },
    {
      name: 'Vacuum Upholstered Furniture',
      cleaningType: 'weekly',
      areaTypeName: 'Lounge',
      instructions: 'Vacuum upholstery and cushions to remove dust and crumbs.'
    },

    // Biweekly
    {
      name: 'Clean Baseboards',
      cleaningType: 'biweekly',
      areaTypeName: 'Office',
      instructions: 'Wipe baseboards to remove dust and scuffs.'
    },
    {
      name: 'Clean Glass Partitions And Doors',
      cleaningType: 'biweekly',
      areaTypeName: 'Reception',
      instructions: 'Clean glass partitions and doors with streak-free cleaner.'
    },
    {
      name: 'Clean Outside Of Trash Cans',
      cleaningType: 'biweekly',
      areaTypeName: 'Break Room',
      instructions: 'Wipe exterior surfaces of trash cans and lids.'
    },
    {
      name: 'Dust Vents, Handrails, And Sills',
      cleaningType: 'biweekly',
      areaTypeName: 'Hallway',
      instructions: 'Dust vents, handrails, shelves, and sills from top to bottom.'
    },
    {
      name: 'Polish Furniture And Wood Surfaces',
      cleaningType: 'biweekly',
      areaTypeName: 'Office',
      instructions: 'Dust then polish desks and wood furniture to remove smudges.'
    },
    {
      name: 'Sanitize Trash And Recycling Bins',
      cleaningType: 'biweekly',
      areaTypeName: 'Office',
      instructions: 'Wash or wipe bins with disinfectant and dry before relining.'
    },

    // Monthly
    {
      name: 'Dust High Surfaces',
      cleaningType: 'monthly',
      areaTypeName: null,
      instructions: 'High-dust shelves and upper surfaces top-to-bottom.'
    },
    {
      name: 'Buff And Polish Hardwood Floors',
      cleaningType: 'monthly',
      areaTypeName: 'Lobby',
      instructions: 'Buff and polish hardwood floors to restore shine.'
    },
    {
      name: 'Check For Pest Activity',
      cleaningType: 'monthly',
      areaTypeName: 'Warehouse',
      instructions: 'Inspect for pest activity and document any findings.'
    },
    {
      name: 'Clean Behind Appliances',
      cleaningType: 'monthly',
      areaTypeName: 'Kitchen',
      instructions: 'Move appliances safely and clean behind and underneath.'
    },
    {
      name: 'Clean Upholstery',
      cleaningType: 'monthly',
      areaTypeName: 'Lounge',
      instructions: 'Vacuum and spot-clean upholstery with fabric-safe cleaner.'
    },
    {
      name: 'Clean Vents And Filters',
      cleaningType: 'monthly',
      areaTypeName: 'Warehouse',
      instructions: 'Clean vents and filters to reduce dust buildup.'
    },
    {
      name: 'Deep Clean Carpets And Rugs',
      cleaningType: 'monthly',
      areaTypeName: 'Office',
      instructions: 'Deep clean carpets and rugs to remove embedded soil.'
    },
    {
      name: 'Deep Clean Kitchen Tile And Grout',
      cleaningType: 'monthly',
      areaTypeName: 'Kitchen',
      instructions: 'Scrub tile and grout with appropriate cleaner and rinse.'
    },
    {
      name: 'Deep Clean Tile And Grout',
      cleaningType: 'monthly',
      areaTypeName: 'Washroom',
      instructions: 'Scrub tile and grout with disinfecting cleaner and rinse.'
    },
    {
      name: 'Dust High Surfaces',
      cleaningType: 'monthly',
      areaTypeName: 'Storage Room',
      instructions: 'High-dust shelves and upper surfaces top-to-bottom.'
    },
    {
      name: 'Dust Light Fixtures And Vents',
      cleaningType: 'monthly',
      areaTypeName: 'Corridor',
      instructions: 'Dust light fixtures and vents with high-dusting tools.'
    },
    {
      name: 'Organize And Clean Supply Closets',
      cleaningType: 'monthly',
      areaTypeName: 'Supply Closet',
      instructions: 'Sort supplies, discard expired items, and wipe shelves.'
    },
    {
      name: 'Remove Expired Inventory',
      cleaningType: 'monthly',
      areaTypeName: 'Stockroom',
      instructions: 'Remove expired items and clean shelves before restocking.'
    },
    {
      name: 'Replace Air Fresheners',
      cleaningType: 'monthly',
      areaTypeName: 'Washroom',
      instructions: 'Check and replace air fresheners or deodorizers as needed.'
    },

    // Quarterly
    {
      name: 'Buff And Polish Washroom Floors',
      cleaningType: 'quarterly',
      areaTypeName: 'Washroom',
      instructions: 'Buff and polish floors to restore finish and sheen.'
    },
    {
      name: 'Clean Exterior Windows',
      cleaningType: 'quarterly',
      areaTypeName: 'Lobby',
      instructions: 'Clean accessible exterior windows and glass.'
    },
    {
      name: 'Deep Clean Carpets',
      cleaningType: 'quarterly',
      areaTypeName: 'Open Workspace',
      instructions: 'Perform deep carpet cleaning to remove embedded soil.'
    },
    {
      name: 'Deep Clean Storage Areas',
      cleaningType: 'quarterly',
      areaTypeName: 'Storage Room',
      instructions: 'Deep clean storage areas and reset organization.'
    },
    {
      name: 'Deep Clean Upholstery, Drapes, And Blinds',
      cleaningType: 'quarterly',
      areaTypeName: 'Lounge',
      instructions: 'Deep clean upholstery and window treatments.'
    },
    {
      name: 'Strip And Refinish Hard Floors If Needed',
      cleaningType: 'quarterly',
      areaTypeName: 'Corridor',
      instructions: 'Strip and refinish hard floors where finish is worn.'
    },
    {
      name: 'Wash Walls And Touch Up Paint',
      cleaningType: 'quarterly',
      areaTypeName: 'Hallway',
      instructions: 'Wash walls and note areas needing touch-up.'
    },

    // Annual
    {
      name: 'Clean HVAC Ducts And Replace Filters',
      cleaningType: 'annual',
      areaTypeName: 'Mechanical Room',
      instructions: 'Coordinate duct cleaning and replace filters.'
    },
    {
      name: 'Deep Extraction Carpet Cleaning',
      cleaningType: 'annual',
      areaTypeName: 'Office',
      instructions: 'Perform hot-water extraction to deep clean carpet fibers.'
    },
    {
      name: 'Power Wash Exterior Entrances',
      cleaningType: 'annual',
      areaTypeName: 'Loading Dock',
      instructions: 'Pressure wash entryways and walkways to remove grime.'
    },
    {
      name: 'Strip And Wax VCT/Tile Floors',
      cleaningType: 'annual',
      areaTypeName: 'Lobby',
      instructions: 'Strip old finish and apply fresh wax coats.'
    },
    {
      name: 'Wash Exterior Windows And Frames',
      cleaningType: 'annual',
      areaTypeName: 'Reception',
      instructions: 'Wash exterior glass, frames, and sills for curb appeal.'
    }
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
    cleaningType: task.cleaningType,
    areaTypeId: task.areaTypeName
      ? (areaTypeMap.get(task.areaTypeName) ?? null)
      : null,
    estimatedMinutes: 0,
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

    console.log(`Created ${createdTasks.count} commercial task templates`)
  } else {
    console.log('No new commercial task templates to create')
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
    ]
  }

  const areaTypesForTemplates = await prisma.areaType.findMany({
    select: { id: true, name: true }
  })

  const existingTemplates = await prisma.areaTemplate.findMany({
    select: { areaTypeId: true }
  })

  const existingTemplateAreaTypeIds = new Set(
    existingTemplates.map((template) => template.areaTypeId)
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
    select: { id: true, name: true, cleaningType: true, areaTypeId: true }
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

  let createdAreaTemplates = 0
  for (const areaType of areaTypesForTemplates) {
    if (existingTemplateAreaTypeIds.has(areaType.id)) continue

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

    const areaSpecificTasks = tasksByAreaTypeId.get(areaType.id) || []
    const taskNameSet = new Set(
      areaSpecificTasks.map((task) => task.name.toLowerCase())
    )
    const combinedTasks = [...areaSpecificTasks]
    for (const task of generalTaskTemplates) {
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
  }

  if (createdAreaTemplates > 0) {
    console.log(`Created ${createdAreaTemplates} area templates`)
  } else {
    console.log('No new area templates to create')
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
