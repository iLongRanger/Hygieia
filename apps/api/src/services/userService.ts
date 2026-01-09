import { prisma } from '../lib/prisma';
import { UserRole, isValidRole } from '../types/roles';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

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
  avatarUrl?: string | null;
  status?: string;
  role?: UserRole;
}

export interface UserUpdateInput {
  fullName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  status?: string;
  preferences?: Record<string, unknown>;
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
  avatarUrl: true,
  status: true,
  lastLoginAt: true,
  preferences: true,
  createdAt: true,
  updatedAt: true,
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

function formatUser(user: UserWithRoles) {
  const primaryRole = user.roles[0]?.role;
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    preferences: user.preferences,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
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
}

export async function listUsers(
  params: UserListParams
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
    data: users.map(formatUser),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });

  if (!user) {
    return null;
  }

  return formatUser(user);
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
    avatarUrl,
    status = 'active',
    role = 'cleaner',
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

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      fullName,
      phone,
      avatarUrl,
      status,
      roles: {
        create: {
          roleId: roleRecord.id,
        },
      },
    },
    select: userSelect,
  });

  return formatUser(user);
}

export async function updateUser(id: string, input: UserUpdateInput) {
  const updateData: Prisma.UserUpdateInput = {};

  if (input.fullName !== undefined) updateData.fullName = input.fullName;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.avatarUrl !== undefined) updateData.avatarUrl = input.avatarUrl;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.preferences !== undefined) {
    updateData.preferences = input.preferences as Prisma.InputJsonValue;
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
