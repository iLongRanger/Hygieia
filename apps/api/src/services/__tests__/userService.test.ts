import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import bcrypt from 'bcryptjs';
import * as userService from '../userService';
import { prisma } from '../../lib/prisma';
import { createTestUser, createTestRole } from '../../test/helpers';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    userRole: {
      findFirst: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs');
jest.mock('../../types/roles', () => ({
  isValidRole: (role: string) => ['owner', 'manager', 'supervisor', 'cleaner'].includes(role),
  UserRole: {},
}));

describe('userService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockUserWithRoles = (overrides?: Partial<any>) => ({
    ...createTestUser(overrides),
    roles: [
      {
        id: 'user-role-123',
        role: {
          id: 'role-123',
          key: 'owner',
          label: 'Owner',
        },
      },
    ],
  });

  describe('listUsers', () => {
    it('should return paginated users with default parameters', async () => {
      const mockUsers = [
        createMockUserWithRoles({ id: 'user-1', email: 'user1@test.com' }),
        createMockUserWithRoles({ id: 'user-2', email: 'user2@test.com' }),
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (prisma.user.count as jest.Mock).mockResolvedValue(2);

      const result = await userService.listUsers({});

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {},
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter by status', async () => {
      const mockUsers = [createMockUserWithRoles({ status: 'active' })];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      await userService.listUsers({ status: 'active' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'active',
          }),
        })
      );
    });

    it('should filter by role', async () => {
      const mockUsers = [createMockUserWithRoles()];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      await userService.listUsers({ role: 'owner' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            roles: {
              some: {
                role: {
                  key: 'owner',
                },
              },
            },
          }),
        })
      );
    });

    it('should search by email and fullName', async () => {
      const mockUsers = [createMockUserWithRoles()];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      await userService.listUsers({ search: 'test' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { email: { contains: 'test', mode: 'insensitive' } },
              { fullName: { contains: 'test', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should paginate results correctly', async () => {
      const mockUsers = [createMockUserWithRoles()];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (prisma.user.count as jest.Mock).mockResolvedValue(100);

      const result = await userService.listUsers({ page: 3, limit: 10 });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        })
      );
      expect(result.pagination.totalPages).toBe(10);
    });

    it('should format user data correctly', async () => {
      const mockUsers = [createMockUserWithRoles({ email: 'test@example.com' })];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      const result = await userService.listUsers({});

      expect(result.data[0]).toHaveProperty('role');
      expect(result.data[0]).toHaveProperty('roles');
      expect(result.data[0].role).toEqual({
        id: 'role-123',
        key: 'owner',
        label: 'Owner',
      });
    });
  });

  describe('getUserById', () => {
    it('should return formatted user by id', async () => {
      const mockUser = createMockUserWithRoles({ id: 'user-123' });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.getUserById('user-123');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: expect.any(Object),
      });
      expect(result).toBeDefined();
      expect(result?.id).toBe('user-123');
    });

    it('should return null for non-existent user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await userService.getUserById('non-existent');

      expect(result).toBeNull();
    });

    it('should handle user with no roles', async () => {
      const mockUser = {
        ...createTestUser(),
        roles: [],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.getUserById('user-123');

      expect(result?.role).toBeNull();
      expect(result?.roles).toEqual([]);
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email', async () => {
      const mockUser = createMockUserWithRoles({ email: 'test@example.com' });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.getUserByEmail('test@example.com');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: expect.any(Object),
      });
      expect(result?.email).toBe('test@example.com');
    });

    it('should normalize email to lowercase', async () => {
      const mockUser = createMockUserWithRoles({ email: 'test@example.com' });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await userService.getUserByEmail('TEST@EXAMPLE.COM');

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'test@example.com' },
        })
      );
    });

    it('should return null for non-existent email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await userService.getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should create user with all fields', async () => {
      const input: userService.UserCreateInput = {
        email: 'new@example.com',
        password: 'password123',
        fullName: 'New User',
        phone: '555-0100',
        avatarUrl: 'https://example.com/avatar.jpg',
        status: 'active',
        role: 'owner',
      };

      const mockRole = createTestRole({ key: 'owner' });
      const mockUser = createMockUserWithRoles({ ...input, email: 'new@example.com' });

      (prisma.role.findUnique as jest.Mock).mockResolvedValue(mockRole);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$10$hashedPassword');
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.createUser(input);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'new@example.com',
          passwordHash: '$2a$10$hashedPassword',
          fullName: 'New User',
          phone: '555-0100',
          avatarUrl: 'https://example.com/avatar.jpg',
          status: 'active',
          roles: {
            create: {
              roleId: mockRole.id,
            },
          },
        },
        select: expect.any(Object),
      });
      expect(result.email).toBe('new@example.com');
    });

    it('should create user with default values', async () => {
      const input: userService.UserCreateInput = {
        email: 'new@example.com',
        password: 'password123',
        fullName: 'New User',
      };

      const mockRole = createTestRole({ key: 'cleaner' });
      const mockUser = createMockUserWithRoles(input);

      (prisma.role.findUnique as jest.Mock).mockResolvedValue(mockRole);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$10$hashedPassword');
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      await userService.createUser(input);

      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { key: 'cleaner' },
      });
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'active',
          }),
        })
      );
    });

    it('should create role if it does not exist', async () => {
      const input: userService.UserCreateInput = {
        email: 'new@example.com',
        password: 'password123',
        fullName: 'New User',
        role: 'manager',
      };

      const mockRole = createTestRole({ key: 'manager', label: 'Manager' });
      const mockUser = createMockUserWithRoles(input);

      (prisma.role.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.role.create as jest.Mock).mockResolvedValue(mockRole);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$10$hashedPassword');
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      await userService.createUser(input);

      expect(prisma.role.create).toHaveBeenCalledWith({
        data: {
          key: 'manager',
          label: 'Manager',
          description: 'manager role',
          isSystemRole: true,
          permissions: {},
        },
      });
    });

    it('should normalize email to lowercase', async () => {
      const input: userService.UserCreateInput = {
        email: 'NEW@EXAMPLE.COM',
        password: 'password123',
        fullName: 'New User',
      };

      const mockRole = createTestRole();
      const mockUser = createMockUserWithRoles({ email: 'new@example.com' });

      (prisma.role.findUnique as jest.Mock).mockResolvedValue(mockRole);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$10$hashedPassword');
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      await userService.createUser(input);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@example.com',
          }),
        })
      );
    });
  });

  describe('updateUser', () => {
    it('should update user with provided fields', async () => {
      const input: userService.UserUpdateInput = {
        fullName: 'Updated Name',
        phone: '555-9999',
        status: 'inactive',
      };

      const mockUser = createMockUserWithRoles({ ...input, id: 'user-123' });

      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.updateUser('user-123', input);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          fullName: 'Updated Name',
          phone: '555-9999',
          status: 'inactive',
        },
        select: expect.any(Object),
      });
      expect(result.fullName).toBe('Updated Name');
    });

    it('should update preferences', async () => {
      const input: userService.UserUpdateInput = {
        preferences: { theme: 'dark', notifications: true },
      };

      const mockUser = createMockUserWithRoles({ id: 'user-123' });

      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      await userService.updateUser('user-123', input);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            preferences: { theme: 'dark', notifications: true },
          }),
        })
      );
    });

    it('should allow setting phone to null', async () => {
      const input: userService.UserUpdateInput = {
        phone: null,
      };

      const mockUser = createMockUserWithRoles({ id: 'user-123', phone: null });

      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      await userService.updateUser('user-123', input);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phone: null,
          }),
        })
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete user by id', async () => {
      (prisma.user.delete as jest.Mock).mockResolvedValue({ id: 'user-123' });

      const result = await userService.deleteUser('user-123');

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: { id: true },
      });
      expect(result).toEqual({ id: 'user-123' });
    });
  });

  describe('assignRole', () => {
    it('should assign role to user', async () => {
      const mockRole = createTestRole({ key: 'manager' });
      const mockUser = createMockUserWithRoles({ id: 'user-123' });

      (prisma.role.findUnique as jest.Mock).mockResolvedValue(mockRole);
      (prisma.userRole.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.userRole.create as jest.Mock).mockResolvedValue({});
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.assignRole('user-123', 'manager');

      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { key: 'manager' },
      });
      expect(prisma.userRole.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          roleId: mockRole.id,
        },
      });
      expect(result).toBeDefined();
    });

    it('should not create duplicate role assignment', async () => {
      const mockRole = createTestRole({ key: 'manager' });
      const mockUser = createMockUserWithRoles({ id: 'user-123' });

      (prisma.role.findUnique as jest.Mock).mockResolvedValue(mockRole);
      (prisma.userRole.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-assignment',
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await userService.assignRole('user-123', 'manager');

      expect(prisma.userRole.create).not.toHaveBeenCalled();
    });

    it('should throw error for invalid role', async () => {
      await expect(userService.assignRole('user-123', 'invalid' as any)).rejects.toThrow(
        'Invalid role: invalid'
      );
    });

    it('should throw error for non-existent role', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(userService.assignRole('user-123', 'manager')).rejects.toThrow(
        'Role not found: manager'
      );
    });
  });

  describe('removeRole', () => {
    it('should remove role from user', async () => {
      const mockRole = createTestRole({ key: 'manager' });
      const mockUser = createMockUserWithRoles({ id: 'user-123' });

      (prisma.role.findUnique as jest.Mock).mockResolvedValue(mockRole);
      (prisma.userRole.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.removeRole('user-123', 'manager');

      expect(prisma.userRole.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', roleId: mockRole.id },
      });
      expect(result).toBeDefined();
    });

    it('should throw error for non-existent role', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(userService.removeRole('user-123', 'manager')).rejects.toThrow(
        'Role not found: manager'
      );
    });
  });

  describe('changePassword', () => {
    it('should change user password', async () => {
      const newPassword = 'newPassword123';
      const mockUser = createMockUserWithRoles({ id: 'user-123' });

      (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$10$newHashedPassword');
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.changePassword('user-123', newPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { passwordHash: '$2a$10$newHashedPassword' },
        select: expect.any(Object),
      });
      expect(result).toBeDefined();
    });

    it('should throw error for short password', async () => {
      await expect(userService.changePassword('user-123', 'short')).rejects.toThrow(
        'Password must be at least 8 characters long'
      );
    });

    it('should throw error for empty password', async () => {
      await expect(userService.changePassword('user-123', '')).rejects.toThrow(
        'Password must be at least 8 characters long'
      );
    });
  });

  describe('listRoles', () => {
    it('should return all roles sorted by key', async () => {
      const mockRoles = [
        createTestRole({ key: 'cleaner', label: 'Cleaner' }),
        createTestRole({ key: 'manager', label: 'Manager' }),
        createTestRole({ key: 'owner', label: 'Owner' }),
      ];

      (prisma.role.findMany as jest.Mock).mockResolvedValue(mockRoles);

      const result = await userService.listRoles();

      expect(prisma.role.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          key: true,
          label: true,
          description: true,
          isSystemRole: true,
        },
        orderBy: { key: 'asc' },
      });
      expect(result).toEqual(mockRoles);
    });
  });
});
