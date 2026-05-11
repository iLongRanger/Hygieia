import { prisma } from '../lib/prisma';
import type { UserRole} from '../types/roles';
import { isValidRole } from '../types/roles';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { validatePassword } from '../utils/passwordPolicy';

const SALT_ROUNDS = 10;

export interface UserListParams {
  page?: number;
  limit?: number;
  status?: string;
  role?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserCreateInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string | null;
  address?: Record<string, unknown> | null;
  avatarUrl?: string | null;
  status?: string;
  role?: UserRole;
  payType?: 'hourly' | 'percentage' | null;
  hourlyPayRate?: number | null;
  percentagePayRate?: number | null;
  employeeNumber?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  employmentType?: string | null;
  supervisorUserId?: string | null;
  startDate?: string | null;
  terminationDate?: string | null;
  birthDate?: string | null;
  emergencyContact?: Record<string, unknown> | null;
  availability?: Record<string, unknown> | null;
  skills?: string[] | null;
  compliance?: Record<string, unknown> | null;
  onboarding?: Record<string, unknown> | null;
  hrNotes?: Record<string, unknown>[] | null;
}

export interface UserUpdateInput {
  fullName?: string;
  phone?: string | null;
  address?: Record<string, unknown> | null;
  avatarUrl?: string | null;
  status?: string;
  preferences?: Record<string, unknown>;
  calendarColor?: string | null;
  payType?: 'hourly' | 'percentage' | null;
  hourlyPayRate?: number | null;
  percentagePayRate?: number | null;
  employeeNumber?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  employmentType?: string | null;
  supervisorUserId?: string | null;
  startDate?: string | null;
  terminationDate?: string | null;
  birthDate?: string | null;
  emergencyContact?: Record<string, unknown> | null;
  availability?: Record<string, unknown> | null;
  skills?: string[] | null;
  compliance?: Record<string, unknown> | null;
  onboarding?: Record<string, unknown> | null;
  hrNotes?: Record<string, unknown>[] | null;
}

export interface UserFormatOptions {
  includeCompensation?: boolean;
}

function readCalendarColor(preferences: unknown): string | null {
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
    return null;
  }

  const calendarColor = (preferences as Record<string, unknown>).calendarColor;
  return typeof calendarColor === 'string' ? calendarColor : null;
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

const userSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  address: true,
  avatarUrl: true,
  status: true,
  lastLoginAt: true,
  preferences: true,
  payType: true,
  hourlyPayRate: true,
  percentagePayRate: true,
  employeeNumber: true,
  jobTitle: true,
  department: true,
  employmentType: true,
  supervisorUserId: true,
  startDate: true,
  terminationDate: true,
  birthDate: true,
  emergencyContact: true,
  availability: true,
  skills: true,
  compliance: true,
  onboarding: true,
  hrNotes: true,
  createdAt: true,
  updatedAt: true,
  supervisor: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  roles: {
    include: {
      role: {
        select: {
          id: true,
          key: true,
          label: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

export type UserWithRoles = Prisma.UserGetPayload<{
  select: typeof userSelect;
}>;

function formatUser(user: UserWithRoles, options: UserFormatOptions = { includeCompensation: true }) {
  const primaryRole = user.roles[0]?.role;
  const roleKeys = user.roles.map((ur) => ur.role.key);
  const workforceType = roleKeys.includes('subcontractor')
    ? 'subcontractor'
    : roleKeys.includes('cleaner')
      ? 'internal_employee'
      : 'office';

  const formatted: {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    address: Prisma.JsonValue;
    avatarUrl: string | null;
    status: string;
    lastLoginAt: Date | null;
    preferences: Prisma.JsonValue;
    calendarColor: string | null;
    workforceType: string;
    createdAt: Date;
    updatedAt: Date;
    role: { id: string; key: string; label: string } | null;
    roles: { id: string; role: { id: string; key: string; label: string } }[];
    payType?: 'hourly' | 'percentage' | null;
    hourlyPayRate?: number | null;
    percentagePayRate?: number | null;
    employeeNumber: string | null;
    jobTitle: string | null;
    department: string | null;
    employmentType: string | null;
    supervisorUserId: string | null;
    supervisor: { id: string; fullName: string; email: string } | null;
    startDate: Date | null;
    terminationDate: Date | null;
    birthDate: Date | null;
    emergencyContact: Prisma.JsonValue;
    availability: Prisma.JsonValue;
    skills: Prisma.JsonValue;
    compliance: Prisma.JsonValue;
    onboarding: Prisma.JsonValue;
    hrNotes: Prisma.JsonValue;
  } = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    address: user.address,
    avatarUrl: user.avatarUrl,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    preferences: user.preferences,
    calendarColor: readCalendarColor(user.preferences),
    workforceType,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    employeeNumber: user.employeeNumber,
    jobTitle: user.jobTitle,
    department: user.department,
    employmentType: user.employmentType,
    supervisorUserId: user.supervisorUserId,
    supervisor: user.supervisor ?? null,
    startDate: user.startDate,
    terminationDate: user.terminationDate,
    birthDate: user.birthDate,
    emergencyContact: user.emergencyContact,
    availability: user.availability,
    skills: user.skills,
    compliance: user.compliance,
    onboarding: user.onboarding,
    hrNotes: user.hrNotes,
    role: primaryRole
      ? { id: primaryRole.id, key: primaryRole.key, label: primaryRole.label }
      : null,
    roles: user.roles.map(ur => ({
      id: ur.id,
      role: {
        id: ur.role.id,
        key: ur.role.key,
        label: ur.role.label,
      },
    })),
  };

  if (options.includeCompensation !== false) {
    formatted.payType =
      user.payType === 'hourly' || user.payType === 'percentage' ? user.payType : null;
    formatted.hourlyPayRate = user.hourlyPayRate != null ? Number(user.hourlyPayRate) : null;
    formatted.percentagePayRate =
      user.percentagePayRate != null ? Number(user.percentagePayRate) : null;
  }

  return formatted;
}

export async function listUsers(
  params: UserListParams,
  options: UserFormatOptions = { includeCompensation: true }
): Promise<PaginatedResult<ReturnType<typeof formatUser>>> {
  const {
    page = 1,
    limit = 20,
    status,
    role,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = params;

  const where: Prisma.UserWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (role) {
    where.roles = {
      some: {
        role: {
          key: role,
        },
      },
    };
  }

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { fullName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const validSortFields = [
    'createdAt',
    'updatedAt',
    'email',
    'fullName',
    'status',
  ];
  const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { [orderByField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users.map((user) => formatUser(user, options)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUserById(id: string, options: UserFormatOptions = { includeCompensation: true }) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });

  if (!user) {
    return null;
  }

  return formatUser(user, options);
}

export async function getUserByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: userSelect,
  });

  if (!user) {
    return null;
  }

  return formatUser(user);
}

export async function createUser(input: UserCreateInput) {
  const {
    email,
    password,
    fullName,
    phone,
    address,
    avatarUrl,
    status = 'active',
    role = 'cleaner',
    payType = null,
    hourlyPayRate = null,
  } = input;

  let roleRecord = await prisma.role.findUnique({
    where: { key: role },
  });

  if (!roleRecord) {
    roleRecord = await prisma.role.create({
      data: {
        key: role,
        label: role.charAt(0).toUpperCase() + role.slice(1),
        description: `${role} role`,
        isSystemRole: true,
        permissions: {},
      },
    });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const data: Prisma.UserCreateInput = {
    email: email.toLowerCase(),
    passwordHash,
    fullName,
    phone,
    avatarUrl,
    status,
    payType,
    hourlyPayRate,
    roles: {
      create: {
        roleId: roleRecord.id,
      },
    },
  };

  if (address !== undefined) {
    data.address = address === null ? Prisma.JsonNull : (address as Prisma.InputJsonValue);
  }
  if (input.percentagePayRate !== undefined) data.percentagePayRate = input.percentagePayRate;
  if (input.employeeNumber !== undefined) data.employeeNumber = input.employeeNumber;
  if (input.jobTitle !== undefined) data.jobTitle = input.jobTitle;
  if (input.department !== undefined) data.department = input.department;
  if (input.employmentType !== undefined) data.employmentType = input.employmentType;
  if (input.supervisorUserId) data.supervisor = { connect: { id: input.supervisorUserId } };
  if (input.startDate !== undefined) data.startDate = input.startDate ? new Date(input.startDate) : null;
  if (input.terminationDate !== undefined) {
    data.terminationDate = input.terminationDate ? new Date(input.terminationDate) : null;
  }
  if (input.birthDate !== undefined) data.birthDate = input.birthDate ? new Date(input.birthDate) : null;
  if (input.emergencyContact !== undefined) {
    data.emergencyContact =
      input.emergencyContact === null ? Prisma.JsonNull : (input.emergencyContact as Prisma.InputJsonValue);
  }
  if (input.availability !== undefined) {
    data.availability =
      input.availability === null ? Prisma.JsonNull : (input.availability as Prisma.InputJsonValue);
  }
  if (input.skills !== undefined) {
    data.skills = input.skills === null ? Prisma.JsonNull : (input.skills as Prisma.InputJsonValue);
  }
  if (input.compliance !== undefined) {
    data.compliance =
      input.compliance === null ? Prisma.JsonNull : (input.compliance as Prisma.InputJsonValue);
  }
  if (input.onboarding !== undefined) {
    data.onboarding =
      input.onboarding === null ? Prisma.JsonNull : (input.onboarding as Prisma.InputJsonValue);
  }
  if (input.hrNotes !== undefined) {
    data.hrNotes = input.hrNotes === null ? Prisma.JsonNull : (input.hrNotes as Prisma.InputJsonValue);
  }

  const user = await prisma.user.create({
    data,
    select: userSelect,
  });

  return formatUser(user);
}

export async function updateUser(id: string, input: UserUpdateInput) {
  const updateData: Prisma.UserUpdateInput = {};

  if (input.fullName !== undefined) updateData.fullName = input.fullName;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.address !== undefined) {
    updateData.address =
      input.address === null ? Prisma.JsonNull : (input.address as Prisma.InputJsonValue);
  }
  if (input.avatarUrl !== undefined) updateData.avatarUrl = input.avatarUrl;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.payType !== undefined) updateData.payType = input.payType;
  if (input.hourlyPayRate !== undefined) updateData.hourlyPayRate = input.hourlyPayRate;
  if (input.percentagePayRate !== undefined) updateData.percentagePayRate = input.percentagePayRate;
  if (input.employeeNumber !== undefined) updateData.employeeNumber = input.employeeNumber;
  if (input.jobTitle !== undefined) updateData.jobTitle = input.jobTitle;
  if (input.department !== undefined) updateData.department = input.department;
  if (input.employmentType !== undefined) updateData.employmentType = input.employmentType;
  if (input.supervisorUserId !== undefined) {
    if (input.supervisorUserId) {
      updateData.supervisor = { connect: { id: input.supervisorUserId } };
    } else {
      updateData.supervisor = { disconnect: true };
    }
  }
  if (input.startDate !== undefined) updateData.startDate = input.startDate ? new Date(input.startDate) : null;
  if (input.terminationDate !== undefined) {
    updateData.terminationDate = input.terminationDate ? new Date(input.terminationDate) : null;
  }
  if (input.birthDate !== undefined) updateData.birthDate = input.birthDate ? new Date(input.birthDate) : null;
  if (input.emergencyContact !== undefined) {
    updateData.emergencyContact =
      input.emergencyContact === null ? Prisma.JsonNull : (input.emergencyContact as Prisma.InputJsonValue);
  }
  if (input.availability !== undefined) {
    updateData.availability =
      input.availability === null ? Prisma.JsonNull : (input.availability as Prisma.InputJsonValue);
  }
  if (input.skills !== undefined) {
    updateData.skills = input.skills === null ? Prisma.JsonNull : (input.skills as Prisma.InputJsonValue);
  }
  if (input.compliance !== undefined) {
    updateData.compliance =
      input.compliance === null ? Prisma.JsonNull : (input.compliance as Prisma.InputJsonValue);
  }
  if (input.onboarding !== undefined) {
    updateData.onboarding =
      input.onboarding === null ? Prisma.JsonNull : (input.onboarding as Prisma.InputJsonValue);
  }
  if (input.hrNotes !== undefined) {
    updateData.hrNotes = input.hrNotes === null ? Prisma.JsonNull : (input.hrNotes as Prisma.InputJsonValue);
  }
  if (input.preferences !== undefined || input.calendarColor !== undefined) {
    const existingUser =
      input.calendarColor !== undefined
        ? await prisma.user.findUnique({
            where: { id },
            select: { preferences: true },
          })
        : null;

    const existingPreferences =
      existingUser?.preferences && typeof existingUser.preferences === 'object' && !Array.isArray(existingUser.preferences)
        ? (existingUser.preferences as Record<string, unknown>)
        : {};
    const nextPreferences =
      input.preferences !== undefined ? { ...input.preferences } : { ...existingPreferences };

    if (input.calendarColor !== undefined) {
      if (input.calendarColor) {
        nextPreferences.calendarColor = input.calendarColor;
      } else {
        delete nextPreferences.calendarColor;
      }
    }

    updateData.preferences = nextPreferences as Prisma.InputJsonValue;
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: userSelect,
  });

  return formatUser(user);
}

export async function deleteUser(id: string): Promise<{ id: string }> {
  const user = await prisma.user.delete({
    where: { id },
    select: { id: true },
  });

  return { id: user.id };
}

export async function assignRole(userId: string, roleKey: UserRole) {
  if (!isValidRole(roleKey)) {
    throw new Error(`Invalid role: ${roleKey}`);
  }

  const role = await prisma.role.findUnique({
    where: { key: roleKey },
  });

  if (!role) {
    throw new Error(`Role not found: ${roleKey}`);
  }

  const existingAssignment = await prisma.userRole.findFirst({
    where: { userId, roleId: role.id },
  });

  if (existingAssignment) {
    return getUserById(userId);
  }

  await prisma.userRole.create({
    data: {
      userId,
      roleId: role.id,
    },
  });

  return getUserById(userId);
}

export async function removeRole(userId: string, roleKey: UserRole) {
  const role = await prisma.role.findUnique({
    where: { key: roleKey },
  });

  if (!role) {
    throw new Error(`Role not found: ${roleKey}`);
  }

  await prisma.userRole.deleteMany({
    where: { userId, roleId: role.id },
  });

  return getUserById(userId);
}

export async function changePassword(userId: string, password: string) {
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    throw new Error(passwordValidation.error ?? 'Invalid password');
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashedPassword },
    select: userSelect,
  });

  return formatUser(user);
}

export async function listRoles() {
  return prisma.role.findMany({
    select: {
      id: true,
      key: true,
      label: true,
      description: true,
      isSystemRole: true,
    },
    orderBy: { key: 'asc' },
  });
}
