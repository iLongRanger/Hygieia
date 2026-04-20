import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as facilityService from '../facilityService';
import { prisma } from '../../lib/prisma';
import { createTestFacility } from '../../test/helpers';
import { geocodeAddressIfNeeded } from '../geocodingService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    facility: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    area: {
      count: jest.fn(),
    },
    facilityTask: {
      count: jest.fn(),
    },
    appointment: {
      findFirst: jest.fn(),
    },
    contact: {
      findFirst: jest.fn(),
    },
    opportunity: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    lead: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../geocodingService', () => ({
  geocodeAddressIfNeeded: jest.fn(async (address) => address),
}));

describe('facilityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.facility.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.contact.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.lead.findUnique as jest.Mock).mockResolvedValue(null);
  });

  describe('listFacilities', () => {
    it('should return paginated facilities', async () => {
      const mockFacilities = [
        createTestFacility({ id: 'facility-1', name: 'HQ Building' }),
        createTestFacility({ id: 'facility-2', name: 'Warehouse' }),
      ];

      (prisma.facility.findMany as jest.Mock).mockResolvedValue(mockFacilities);
      (prisma.facility.count as jest.Mock).mockResolvedValue(2);

      const result = await facilityService.listFacilities({});

      expect(result.data).toEqual([
        expect.objectContaining({ ...mockFacilities[0], opportunityStatus: null, submittedForProposal: false }),
        expect.objectContaining({ ...mockFacilities[1], opportunityStatus: null, submittedForProposal: false }),
      ]);
      expect(result.pagination.total).toBe(2);
      expect(prisma.facility.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            archivedAt: null,
            residentialPropertyId: null,
          }),
        })
      );
    });

    it('should filter by accountId', async () => {
      const mockFacilities = [createTestFacility()];

      (prisma.facility.findMany as jest.Mock).mockResolvedValue(mockFacilities);
      (prisma.facility.count as jest.Mock).mockResolvedValue(1);

      await facilityService.listFacilities({ accountId: 'account-123' });

      expect(prisma.facility.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountId: 'account-123',
          }),
        })
      );
    });

    it('should filter by status and buildingType', async () => {
      const mockFacilities = [createTestFacility()];

      (prisma.facility.findMany as jest.Mock).mockResolvedValue(mockFacilities);
      (prisma.facility.count as jest.Mock).mockResolvedValue(1);

      await facilityService.listFacilities({ status: 'active', buildingType: 'office' });

      expect(prisma.facility.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'active',
            buildingType: 'office',
          }),
        })
      );
    });

    it('should search by name', async () => {
      const mockFacilities = [createTestFacility()];

      (prisma.facility.findMany as jest.Mock).mockResolvedValue(mockFacilities);
      (prisma.facility.count as jest.Mock).mockResolvedValue(1);

      await facilityService.listFacilities({ search: 'warehouse' });

      expect(prisma.facility.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            residentialPropertyId: null,
            OR: [
              { name: { contains: 'warehouse', mode: 'insensitive' } },
              { account: { name: { contains: 'warehouse', mode: 'insensitive' } } },
            ],
          }),
        })
      );
    });

    it('should include residential-linked facilities when explicitly requested', async () => {
      (prisma.facility.findMany as jest.Mock).mockResolvedValue([createTestFacility()]);
      (prisma.facility.count as jest.Mock).mockResolvedValue(1);

      await facilityService.listFacilities({ includeResidentialLinked: true });

      expect(prisma.facility.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            residentialPropertyId: null,
          }),
        })
      );
    });

    it('should include submittedForProposal on listed facilities', async () => {
      const mockFacility = createTestFacility({
        id: 'facility-123',
        account: {
          id: 'account-123',
          name: 'Acme Corp',
          type: 'commercial',
        },
      });

      (prisma.facility.findMany as jest.Mock).mockResolvedValue([mockFacility]);
      (prisma.facility.count as jest.Mock).mockResolvedValue(1);
      (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'opp-1',
          accountId: 'account-123',
          facilityId: 'facility-123',
          leadId: 'lead-1',
          status: 'walk_through_completed',
          updatedAt: new Date('2026-03-13T10:00:00.000Z'),
          createdAt: new Date('2026-03-13T09:00:00.000Z'),
        },
      ]);

      const result = await facilityService.listFacilities({});

      expect(result.data).toEqual([
        expect.objectContaining({
          ...mockFacility,
          opportunityStatus: 'walk_through_completed',
          submittedForProposal: true,
        }),
      ]);
    });
  });

  describe('getFacilityById', () => {
    it('should return facility by id', async () => {
      const mockFacility = createTestFacility({
        id: 'facility-123',
        account: {
          id: 'account-123',
          name: 'Acme Corp',
          type: 'commercial',
        },
      });

      (prisma.facility.findUnique as jest.Mock).mockResolvedValue(mockFacility);
      (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'opp-1',
          accountId: mockFacility.account.id,
          facilityId: 'facility-123',
          leadId: 'lead-1',
          status: 'walk_through_completed',
          updatedAt: new Date('2026-03-13T10:00:00.000Z'),
          createdAt: new Date('2026-03-13T09:00:00.000Z'),
        },
      ]);

      const result = await facilityService.getFacilityById('facility-123');

      expect(result).toEqual(
        expect.objectContaining({
          ...mockFacility,
          opportunityStatus: 'walk_through_completed',
          submittedForProposal: true,
        })
      );
    });
  });

  describe('createFacility', () => {
    it('should create facility', async () => {
      const input: facilityService.FacilityCreateInput = {
        accountId: 'account-123',
        name: 'New Building',
        address: { street: '123 Main St', city: 'Test City' },
        buildingType: 'office',
        status: 'active',
        createdByUserId: 'user-123',
      };

      const mockFacility = createTestFacility(input);

      (prisma.facility.create as jest.Mock).mockResolvedValue(mockFacility);

      const result = await facilityService.createFacility(input);

      expect(result).toEqual(mockFacility);
      expect(geocodeAddressIfNeeded).toHaveBeenCalled();
    });

    it('should create a facility-scoped opportunity when the account already has a lead pipeline record', async () => {
      const input: facilityService.FacilityCreateInput = {
        accountId: 'account-123',
        name: 'Second Site',
        address: { street: '123 Main St', city: 'Test City' },
        createdByUserId: 'user-123',
      };

      const mockFacility = createTestFacility({ ...input, id: 'facility-2' });

      (prisma.facility.create as jest.Mock).mockResolvedValue(mockFacility);
      (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'opp-1',
          accountId: 'account-123',
          facilityId: 'facility-1',
          leadId: 'lead-1',
          status: 'walk_through_completed',
          updatedAt: new Date('2026-03-13T10:00:00Z'),
          createdAt: new Date('2026-03-13T09:00:00Z'),
        },
      ]);
      (prisma.lead.findUnique as jest.Mock).mockResolvedValue({
        id: 'lead-1',
        companyName: 'Acme Corporation',
        contactName: 'Jane Smith',
        estimatedValue: 5000,
        probability: 40,
        expectedCloseDate: new Date('2026-03-20T00:00:00Z'),
        assignedToUserId: null,
        createdByUserId: 'creator-1',
      });
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue({ id: 'contact-1' });

      await facilityService.createFacility(input);

      expect(prisma.opportunity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          leadId: 'lead-1',
          accountId: 'account-123',
          facilityId: 'facility-2',
          primaryContactId: 'contact-1',
          title: 'Acme Corporation',
          status: 'lead',
        }),
      });
    });

    it('should default status to active', async () => {
      const input: facilityService.FacilityCreateInput = {
        accountId: 'account-123',
        name: 'New Building',
        address: {},
        createdByUserId: 'user-123',
      };

      const mockFacility = createTestFacility(input);

      (prisma.facility.create as jest.Mock).mockResolvedValue(mockFacility);

      await facilityService.createFacility(input);

      expect(prisma.facility.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'active',
          }),
        })
      );
    });

    it('should save geocoded coordinates when address has no lat/lng', async () => {
      const input: facilityService.FacilityCreateInput = {
        accountId: 'account-123',
        name: 'Geocoded Building',
        address: { street: '123 Main St', city: 'Toronto' },
        createdByUserId: 'user-123',
      };
      (geocodeAddressIfNeeded as jest.Mock).mockResolvedValue({
        ...input.address,
        latitude: 43.70011,
        longitude: -79.4163,
      });
      (prisma.facility.create as jest.Mock).mockResolvedValue(createTestFacility(input));

      await facilityService.createFacility(input);

      expect(prisma.facility.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            address: expect.objectContaining({
              latitude: 43.70011,
              longitude: -79.4163,
            }),
          }),
        })
      );
    });

    it('should block duplicate facility creation for the same account', async () => {
      (prisma.facility.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'facility-1',
          name: 'HQ Building',
        },
      ]);

      await expect(
        facilityService.createFacility({
          accountId: 'account-123',
          name: ' hq building ',
          address: { street: '123 Main St' },
          createdByUserId: 'user-123',
        })
      ).rejects.toThrow('already exists for this account');

      expect(prisma.facility.create).not.toHaveBeenCalled();
    });

    it('should block duplicate facility creation by normalized name', async () => {
      (prisma.facility.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'facility-1',
          name: 'HQ-East',
        },
      ]);

      await expect(
        facilityService.createFacility({
          accountId: 'account-123',
          name: ' hq east ',
          address: { street: '123 Main St' },
          createdByUserId: 'user-123',
        })
      ).rejects.toThrow('already exists for this account');
    });
  });

  describe('updateFacility', () => {
    it('should update facility', async () => {
      const input: facilityService.FacilityUpdateInput = {
        name: 'Updated Name',
      };

      const mockFacility = createTestFacility(input);

      (prisma.facility.findUnique as jest.Mock).mockResolvedValue({
        accountId: 'account-123',
        name: 'Original Name',
      });
      (prisma.facility.update as jest.Mock).mockResolvedValue(mockFacility);

      const result = await facilityService.updateFacility('facility-123', input);

      expect(result).toEqual(mockFacility);
    });

    it('should not persist manual square footage on create', async () => {
      const input = {
        accountId: 'account-123',
        name: 'New Building',
        address: { street: '123 Main St', city: 'Test City' },
        buildingType: 'office',
        status: 'active',
        createdByUserId: 'user-123',
      } satisfies facilityService.FacilityCreateInput;

      (prisma.facility.create as jest.Mock).mockResolvedValue(createTestFacility(input));

      await facilityService.createFacility(input);

      expect(prisma.facility.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            squareFeet: expect.anything(),
          }),
        })
      );
    });

    it('should geocode updated address when coordinates are missing', async () => {
      const input: facilityService.FacilityUpdateInput = {
        address: { street: '456 King St', city: 'Toronto' },
      };
      (geocodeAddressIfNeeded as jest.Mock).mockResolvedValue({
        ...input.address,
        latitude: 43.64,
        longitude: -79.38,
      });
      (prisma.facility.update as jest.Mock).mockResolvedValue(createTestFacility({ id: 'facility-123' }));

      await facilityService.updateFacility('facility-123', input);

      expect(prisma.facility.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            address: expect.objectContaining({
              latitude: 43.64,
              longitude: -79.38,
            }),
          }),
        })
      );
    });

    it('should disconnect facility manager when set to null', async () => {
      const mockFacility = createTestFacility({ id: 'facility-123' });

      (prisma.facility.update as jest.Mock).mockResolvedValue(mockFacility);

      await facilityService.updateFacility('facility-123', { facilityManagerId: null });

      expect(prisma.facility.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            facilityManager: { disconnect: true },
          }),
        })
      );
    });

    it('should block renaming a facility to a duplicate name on the same account', async () => {
      (prisma.facility.findUnique as jest.Mock).mockResolvedValue({
        accountId: 'account-123',
        name: 'Original Name',
      });
      (prisma.facility.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'facility-999',
          name: 'HQ Building',
        },
      ]);

      await expect(
        facilityService.updateFacility('facility-123', {
          name: ' HQ Building ',
        })
      ).rejects.toThrow('already exists for this account');

      expect(prisma.facility.update).not.toHaveBeenCalled();
    });
  });

  describe('archiveFacility', () => {
    it('should archive facility', async () => {
      const mockFacility = createTestFacility({ archivedAt: new Date() });

      (prisma.facility.update as jest.Mock).mockResolvedValue(mockFacility);

      await facilityService.archiveFacility('facility-123');

      expect(prisma.facility.update).toHaveBeenCalledWith({
        where: { id: 'facility-123' },
        data: { archivedAt: expect.any(Date) },
        select: expect.any(Object),
      });
    });
  });

  describe('restoreFacility', () => {
    it('should restore facility', async () => {
      const mockFacility = createTestFacility({ archivedAt: null });

      (prisma.facility.update as jest.Mock).mockResolvedValue(mockFacility);

      await facilityService.restoreFacility('facility-123');

      expect(prisma.facility.update).toHaveBeenCalledWith({
        where: { id: 'facility-123' },
        data: { archivedAt: null },
        select: expect.any(Object),
      });
    });
  });

  describe('deleteFacility', () => {
    it('should delete facility', async () => {
      (prisma.facility.delete as jest.Mock).mockResolvedValue({ id: 'facility-123' });

      const result = await facilityService.deleteFacility('facility-123');

      expect(result).toEqual({ id: 'facility-123' });
    });
  });

  describe('submitFacilityForProposal', () => {
    it('should use the latest active opportunity when submitting a facility', async () => {
      (prisma.facility.findUnique as jest.Mock).mockResolvedValue({
        id: 'facility-123',
        accountId: 'account-123',
        archivedAt: null,
      });
      (prisma.area.count as jest.Mock).mockResolvedValue(1);
      (prisma.facilityTask.count as jest.Mock).mockResolvedValue(1);
      (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
        {
        id: 'opp-1',
        leadId: 'lead-source',
        status: 'walk_through_booked',
        updatedAt: new Date('2026-03-10T10:00:00.000Z'),
        createdAt: new Date('2026-03-10T09:00:00.000Z'),
      },
      ]);
      (prisma.appointment.findFirst as jest.Mock).mockResolvedValue({
        id: 'appt-1',
        status: 'completed',
        opportunityId: 'opp-1',
      });

      await expect(
        facilityService.submitFacilityForProposal('facility-123', {
          userId: 'user-1',
          notes: null,
        })
      ).rejects.toThrow('Facility has already been submitted for proposal');

      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ accountId: 'account-123' }),
        })
      );
      expect(prisma.appointment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'walk_through',
            OR: [
              { opportunityId: 'opp-1' },
              { leadId: 'lead-source' },
            ],
          }),
        })
      );
    });
  });
});
