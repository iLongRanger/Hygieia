import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { getGlobalSettings, getDefaultBranding } from './globalSettingsService';
import { buildSubcontractorWelcomeHtml, buildSubcontractorWelcomeSubject } from '../templates/subcontractorWelcome';
import { isEmailConfigured } from '../config/email';
import { sendNotificationEmail } from './emailService';
import { requireWebAppBaseUrl } from '../lib/appUrl';

export interface TeamListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  includeArchived?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TeamCreateInput {
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  isActive?: boolean;
  calendarColor?: string | null;
  createdByUserId: string;
}

export interface TeamUpdateInput {
  name?: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  isActive?: boolean;
  calendarColor?: string | null;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const teamSelect = {
  id: true,
  name: true,
  contactName: true,
  contactEmail: true,
  contactPhone: true,
  notes: true,
  isActive: true,
  calendarColor: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  createdByUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
};

type TeamWithMetadata = Prisma.TeamGetPayload<{
  select: typeof teamSelect;
}>;

function formatTeam(team: TeamWithMetadata) {
  return {
    id: team.id,
    name: team.name,
    contactName: team.contactName,
    contactEmail: team.contactEmail,
    contactPhone: team.contactPhone,
    notes: team.notes,
    isActive: team.isActive,
    calendarColor: team.calendarColor,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
    archivedAt: team.archivedAt,
    createdByUser: team.createdByUser,
  };
}

export async function listTeams(params: TeamListParams): Promise<PaginatedResult<any>> {
  const {
    page = 1,
    limit = 20,
    search,
    isActive,
    includeArchived = false,
    sortBy = 'name',
    sortOrder = 'asc',
  } = params;

  const where: Prisma.TeamWhereInput = {};

  if (typeof isActive === 'boolean') {
    where.isActive = isActive;
  }

  if (!includeArchived) {
    where.archivedAt = null;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { contactName: { contains: search, mode: 'insensitive' } },
      { contactEmail: { contains: search, mode: 'insensitive' } },
    ];
  }

  const validSortFields = ['name', 'createdAt', 'updatedAt', 'isActive'];
  const orderByField = validSortFields.includes(sortBy) ? sortBy : 'name';

  const [teams, total] = await Promise.all([
    prisma.team.findMany({
      where,
      select: teamSelect,
      orderBy: { [orderByField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.team.count({ where }),
  ]);

  return {
    data: teams.map(formatTeam),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getTeamById(id: string) {
  const team = await prisma.team.findUnique({
    where: { id },
    select: teamSelect,
  });

  return team ? formatTeam(team) : null;
}

export async function createTeam(input: TeamCreateInput) {
  const team = await prisma.team.create({
    data: {
      name: input.name,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      notes: input.notes,
      isActive: input.isActive ?? true,
      calendarColor: input.calendarColor ?? null,
      createdByUserId: input.createdByUserId,
    },
    select: teamSelect,
  });

  return formatTeam(team);
}

export async function updateTeam(id: string, input: TeamUpdateInput) {
  const team = await prisma.team.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.contactName !== undefined ? { contactName: input.contactName } : {}),
      ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail } : {}),
      ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.calendarColor !== undefined ? { calendarColor: input.calendarColor } : {}),
    },
    select: teamSelect,
  });

  return formatTeam(team);
}

export async function archiveTeam(id: string) {
  const team = await prisma.team.update({
    where: { id },
    data: {
      archivedAt: new Date(),
      isActive: false,
    },
    select: teamSelect,
  });

  return formatTeam(team);
}

export async function restoreTeam(id: string) {
  const team = await prisma.team.update({
    where: { id },
    data: {
      archivedAt: null,
      isActive: true,
    },
    select: teamSelect,
  });

  return formatTeam(team);
}

async function getBrandingSafe() {
  try {
    return await getGlobalSettings();
  } catch {
    return getDefaultBranding();
  }
}

async function getOrCreateSubcontractorRole() {
  let subRole = await prisma.role.findUnique({ where: { key: 'subcontractor' } });
  if (!subRole) {
    subRole = await prisma.role.create({
      data: {
        key: 'subcontractor',
        label: 'Subcontractor',
        permissions: {
          dashboard_read: true,
          contracts_read: true,
          facilities_read: true,
          jobs_read: true,
          jobs_write: true,
          time_tracking_read: true,
          time_tracking_write: true,
        },
        isSystemRole: true,
      },
    });
  }
  return subRole;
}

export async function ensureSubcontractorRoleForTeamUsers(teamId: string): Promise<{
  assigned: number;
  totalTeamUsers: number;
}> {
  const [subRole, users] = await Promise.all([
    getOrCreateSubcontractorRole(),
    prisma.user.findMany({
      where: { teamId, status: { in: ['active', 'pending'] } },
      select: {
        id: true,
        roles: {
          select: {
            role: { select: { key: true } },
          },
        },
      },
    }),
  ]);

  let assigned = 0;
  for (const user of users) {
    const hasSubcontractorRole = user.roles.some((assignment) => assignment.role.key === 'subcontractor');
    if (hasSubcontractorRole) continue;

    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: subRole.id,
      },
    });
    assigned += 1;
  }

  return {
    assigned,
    totalTeamUsers: users.length,
  };
}

export async function resendSubcontractorInvite(teamId: string): Promise<{
  userId: string;
  email: string;
  setPasswordUrl: string;
  expiresAt: Date;
  emailSent: boolean;
}> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      contactName: true,
      contactEmail: true,
      users: {
        select: {
          id: true,
          email: true,
          roles: {
            select: {
              role: {
                select: {
                  key: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!team) {
    throw new Error('Team not found');
  }

  const contactEmail = team.contactEmail?.trim().toLowerCase();
  if (!contactEmail) {
    throw new Error('Team contact email is required to send an invite');
  }

  const subRole = await getOrCreateSubcontractorRole();

  let user =
    team.users.find((candidate) => candidate.email.toLowerCase() === contactEmail) ||
    team.users[0];

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({
      where: { email: contactEmail },
      select: {
        id: true,
        email: true,
        roles: {
          select: {
            role: {
              select: { key: true },
            },
          },
        },
      },
    });

    if (existingByEmail) {
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: { teamId: team.id },
        select: {
          id: true,
          email: true,
          roles: {
            select: {
              role: {
                select: { key: true },
              },
            },
          },
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: contactEmail,
          fullName: team.contactName || team.name,
          teamId: team.id,
          status: 'pending',
          roles: {
            create: { roleId: subRole.id },
          },
        },
        select: {
          id: true,
          email: true,
          roles: {
            select: {
              role: {
                select: { key: true },
              },
            },
          },
        },
      });
    }
  }

  const hasSubcontractorRole = user.roles.some((assignment) => assignment.role.key === 'subcontractor');
  if (!hasSubcontractorRole) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: subRole.id,
      },
    });
  }

  const baseUrl = requireWebAppBaseUrl();
  const tokenRecord = await prisma.passwordSetToken.create({
    data: {
      userId: user.id,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    },
  });

  const setPasswordUrl = `${baseUrl}/auth/set-password?token=${tokenRecord.token}`;

  let emailSent = false;
  if (isEmailConfigured()) {
    const branding = await getBrandingSafe();
    emailSent = await sendNotificationEmail(
      contactEmail,
      buildSubcontractorWelcomeSubject(),
      buildSubcontractorWelcomeHtml(
        {
          teamName: team.name,
          contractNumber: 'Portal Access',
          facilityName: 'Hygieia',
          setPasswordUrl,
        },
        branding
      )
    );
  }

  return {
    userId: user.id,
    email: contactEmail,
    setPasswordUrl,
    expiresAt: tokenRecord.expiresAt,
    emailSent,
  };
}
