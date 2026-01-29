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
