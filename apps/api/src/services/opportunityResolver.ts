import type { Prisma } from '@prisma/client';

interface OpportunityClient {
  opportunity: {
    findMany: (args: Prisma.OpportunityFindManyArgs) => Promise<
      {
        id: string;
        accountId: string | null;
        facilityId: string | null;
        leadId: string | null;
        status: string;
        updatedAt: Date;
        createdAt: Date;
      }[]
    >;
  };
}

const OPPORTUNITY_PRIORITY: Record<string, number> = {
  negotiation: 60,
  proposal_sent: 50,
  walk_through_completed: 40,
  walk_through_booked: 30,
  lead: 20,
  won: 10,
  lost: 0,
};

function getOpportunityPriority(status: string): number {
  return OPPORTUNITY_PRIORITY[status] ?? -1;
}

function selectPreferredOpportunity<T extends {
  status: string;
  updatedAt: Date;
  createdAt: Date;
}>(opportunities: T[]): T | null {
  if (opportunities.length === 0) {
    return null;
  }

  return [...opportunities].sort((left, right) => {
    const priorityDiff = getOpportunityPriority(right.status) - getOpportunityPriority(left.status);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const updatedDiff = right.updatedAt.getTime() - left.updatedAt.getTime();
    if (updatedDiff !== 0) {
      return updatedDiff;
    }

    return right.createdAt.getTime() - left.createdAt.getTime();
  })[0];
}

export async function findPreferredOpportunityForAccount(
  client: OpportunityClient,
  accountId: string,
  options: { requireLeadId?: boolean; facilityId?: string } = {}
) {
  const opportunities = await client.opportunity.findMany({
    where: {
      accountId,
      archivedAt: null,
      ...(options.facilityId ? { facilityId: options.facilityId } : {}),
      ...(options.requireLeadId ? { leadId: { not: null } } : {}),
    },
    select: {
      id: true,
      accountId: true,
      facilityId: true,
      leadId: true,
      status: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  return selectPreferredOpportunity(opportunities);
}

export async function findPreferredOpportunityForLead(
  client: OpportunityClient,
  leadId: string,
  options: { facilityId?: string } = {}
) {
  const opportunities = await client.opportunity.findMany({
    where: {
      leadId,
      archivedAt: null,
      ...(options.facilityId ? { facilityId: options.facilityId } : {}),
    },
    select: {
      id: true,
      accountId: true,
      facilityId: true,
      leadId: true,
      status: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  return selectPreferredOpportunity(opportunities);
}
