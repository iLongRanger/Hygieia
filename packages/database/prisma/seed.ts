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
