import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function deriveOpportunityTitle(lead: {
  companyName: string | null
  contactName: string
}): string {
  return lead.companyName?.trim() || lead.contactName.trim()
}

function deriveOpportunityTimestamps(status: string, updatedAt: Date) {
  if (status === 'won') {
    return {
      wonAt: updatedAt,
      lostAt: null,
      closedAt: updatedAt,
    }
  }

  if (status === 'lost') {
    return {
      wonAt: null,
      lostAt: updatedAt,
      closedAt: updatedAt,
    }
  }

  return {
    wonAt: null,
    lostAt: null,
    closedAt: null,
  }
}

async function main() {
  console.log('Backfilling opportunities from existing leads...')

  const leads = await prisma.lead.findMany({
    select: {
      id: true,
      companyName: true,
      contactName: true,
      status: true,
      leadSource: {
        select: {
          name: true,
        },
      },
      estimatedValue: true,
      probability: true,
      expectedCloseDate: true,
      lostReason: true,
      assignedToUserId: true,
      createdByUserId: true,
      createdAt: true,
      updatedAt: true,
      archivedAt: true,
      convertedToAccountId: true,
    },
  })

  let createdCount = 0
  let updatedCount = 0

  for (const lead of leads) {
    const timestamps = deriveOpportunityTimestamps(lead.status, lead.updatedAt)
    const existingOpportunity = await prisma.opportunity.findFirst({
      where: {
        OR: [
          { leadId: lead.id },
          ...(lead.convertedToAccountId
            ? [{ leadId: null, accountId: lead.convertedToAccountId, title: deriveOpportunityTitle(lead) }]
            : []),
        ],
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    const payload = {
      leadId: lead.id,
      accountId: lead.convertedToAccountId,
      title: deriveOpportunityTitle(lead),
      status: lead.status,
      source: lead.leadSource?.name ?? null,
      estimatedValue: lead.estimatedValue,
      probability: lead.probability,
      expectedCloseDate: lead.expectedCloseDate,
      lostReason: lead.lostReason,
      ownerUserId: lead.assignedToUserId,
      createdByUserId: lead.createdByUserId,
      wonAt: timestamps.wonAt,
      lostAt: timestamps.lostAt,
      closedAt: timestamps.closedAt,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      archivedAt: lead.archivedAt,
    }

    if (existingOpportunity) {
      await prisma.opportunity.update({
        where: { id: existingOpportunity.id },
        data: payload,
      })
      updatedCount += 1
    } else {
      await prisma.opportunity.create({
        data: payload,
      })
      createdCount += 1
    }
  }

  console.log(`Opportunities created: ${createdCount}`)
  console.log(`Opportunities updated: ${updatedCount}`)

  console.log('Backfilling appointment opportunity links...')
  const appointments = await prisma.appointment.findMany({
    where: {
      opportunityId: null,
    },
    select: {
      id: true,
      leadId: true,
      accountId: true,
    },
  })

  let appointmentLinks = 0

  for (const appointment of appointments) {
    let opportunity = null

    if (appointment.leadId) {
      opportunity = await prisma.opportunity.findFirst({
        where: { leadId: appointment.leadId },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      })
    }

    if (!opportunity && appointment.accountId) {
      opportunity = await prisma.opportunity.findFirst({
        where: { accountId: appointment.accountId },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      })
    }

    if (!opportunity) continue

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { opportunityId: opportunity.id },
    })
    appointmentLinks += 1
  }

  console.log(`Appointments linked: ${appointmentLinks}`)

  console.log('Backfilling proposal opportunity links...')
  const proposals = await prisma.proposal.findMany({
    where: {
      opportunityId: null,
    },
    select: {
      id: true,
      accountId: true,
    },
  })

  let proposalLinks = 0

  for (const proposal of proposals) {
    const opportunity = await prisma.opportunity.findFirst({
      where: { accountId: proposal.accountId },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })

    if (!opportunity) continue

    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { opportunityId: opportunity.id },
    })
    proposalLinks += 1
  }

  console.log(`Proposals linked: ${proposalLinks}`)

  console.log('Backfilling contract opportunity links...')
  const contracts = await prisma.contract.findMany({
    where: {
      opportunityId: null,
    },
    select: {
      id: true,
      accountId: true,
      proposalId: true,
    },
  })

  let contractLinks = 0

  for (const contract of contracts) {
    let opportunity = null

    if (contract.proposalId) {
      const proposal = await prisma.proposal.findUnique({
        where: { id: contract.proposalId },
        select: { opportunityId: true },
      })
      if (proposal?.opportunityId) {
        opportunity = { id: proposal.opportunityId }
      }
    }

    if (!opportunity) {
      opportunity = await prisma.opportunity.findFirst({
        where: { accountId: contract.accountId },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      })
    }

    if (!opportunity) continue

    await prisma.contract.update({
      where: { id: contract.id },
      data: { opportunityId: opportunity.id },
    })
    contractLinks += 1
  }

  console.log(`Contracts linked: ${contractLinks}`)
  console.log('Opportunity backfill completed successfully')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error('Opportunity backfill failed:', error)
    await prisma.$disconnect()
    process.exit(1)
  })
