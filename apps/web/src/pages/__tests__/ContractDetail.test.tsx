import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import ContractDetail from '../contracts/ContractDetail';
import type { Contract } from '../../types/contract';
import { useAuthStore } from '../../stores/authStore';

let mockParams: { id?: string } = { id: 'contract-1' };
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => navigateMock,
  };
});

const getContractMock = vi.fn();
const updateContractStatusMock = vi.fn();
const signContractMock = vi.fn();
const terminateContractMock = vi.fn();
const archiveContractMock = vi.fn();
const restoreContractMock = vi.fn();
const renewContractMock = vi.fn();
const assignContractTeamMock = vi.fn();
const getContractActivitiesMock = vi.fn();
const listContractAmendmentsMock = vi.fn();
const createContractAmendmentMock = vi.fn();
const getContractAmendmentMock = vi.fn();
const updateContractAmendmentMock = vi.fn();
const recalculateContractAmendmentMock = vi.fn();
const approveContractAmendmentMock = vi.fn();
const rejectContractAmendmentMock = vi.fn();
const applyContractAmendmentMock = vi.fn();
const listTeamsMock = vi.fn();
const listUsersMock = vi.fn();
const listAreaTypesMock = vi.fn();
const listTaskTemplatesMock = vi.fn();
const getAreaTemplateByAreaTypeMock = vi.fn();
const listPricingSettingsMock = vi.fn();

vi.mock('../../lib/contracts', () => ({
  getContract: (...args: unknown[]) => getContractMock(...args),
  updateContractStatus: (...args: unknown[]) => updateContractStatusMock(...args),
  signContract: (...args: unknown[]) => signContractMock(...args),
  terminateContract: (...args: unknown[]) => terminateContractMock(...args),
  archiveContract: (...args: unknown[]) => archiveContractMock(...args),
  restoreContract: (...args: unknown[]) => restoreContractMock(...args),
  renewContract: (...args: unknown[]) => renewContractMock(...args),
  assignContractTeam: (...args: unknown[]) => assignContractTeamMock(...args),
  getContractActivities: (...args: unknown[]) => getContractActivitiesMock(...args),
  listContractAmendments: (...args: unknown[]) => listContractAmendmentsMock(...args),
  createContractAmendment: (...args: unknown[]) => createContractAmendmentMock(...args),
  getContractAmendment: (...args: unknown[]) => getContractAmendmentMock(...args),
  recalculateContractAmendment: (...args: unknown[]) => recalculateContractAmendmentMock(...args),
  approveContractAmendment: (...args: unknown[]) => approveContractAmendmentMock(...args),
  rejectContractAmendment: (...args: unknown[]) => rejectContractAmendmentMock(...args),
  applyContractAmendment: (...args: unknown[]) => applyContractAmendmentMock(...args),
  updateContractAmendment: (...args: unknown[]) => updateContractAmendmentMock(...args),
}));

vi.mock('../../lib/teams', () => ({
  listTeams: (...args: unknown[]) => listTeamsMock(...args),
}));

vi.mock('../../lib/users', () => ({
  listUsers: (...args: unknown[]) => listUsersMock(...args),
}));

vi.mock('../../lib/facilities', () => ({
  listAreaTypes: (...args: unknown[]) => listAreaTypesMock(...args),
  listTaskTemplates: (...args: unknown[]) => listTaskTemplatesMock(...args),
  getAreaTemplateByAreaType: (...args: unknown[]) => getAreaTemplateByAreaTypeMock(...args),
}));

vi.mock('../../lib/pricing', async () => {
  const actual = await vi.importActual<typeof import('../../lib/pricing')>('../../lib/pricing');
  return {
    ...actual,
    listPricingSettings: (...args: unknown[]) => listPricingSettingsMock(...args),
  };
});

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const draftContract: Contract = {
  id: 'contract-1',
  contractNumber: 'CONT-202602-0001',
  title: 'Office Cleaning Agreement',
  status: 'draft',
  renewalNumber: 0,
  startDate: '2026-02-01',
  endDate: null,
  serviceFrequency: 'monthly',
  serviceSchedule: null,
  autoRenew: false,
  renewalNoticeDays: 30,
  monthlyValue: 2500,
  totalValue: null,
  billingCycle: 'monthly',
  paymentTerms: 'Net 30',
  termsAndConditions: 'Standard terms',
  specialInstructions: 'Special instructions',
  signedDocumentUrl: null,
  signedDate: null,
  signedByName: null,
  signedByEmail: null,
  approvedAt: null,
  terminationReason: null,
  terminatedAt: null,
  includesInitialClean: true,
  initialCleanCompleted: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  archivedAt: null,
  account: { id: 'account-1', name: 'Acme Corporation', type: 'commercial' },
  facility: null,
  proposal: { id: 'proposal-1', proposalNumber: 'PROP-001', title: 'Proposal Title' },
  approvedByUser: null,
  createdByUser: { id: 'user-1', fullName: 'Admin User', email: 'admin@example.com' },
};

describe('ContractDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { id: 'contract-1' };
    navigateMock.mockReset();
    useAuthStore.setState({
      user: { id: 'owner-1', email: 'owner@example.com', fullName: 'Owner User', role: 'owner' },
      token: 'token',
      refreshToken: null,
      isAuthenticated: true,
      hasPermission: () => true,
      canAny: () => true,
    });
    getContractMock.mockResolvedValue(draftContract);
    updateContractStatusMock.mockResolvedValue({ ...draftContract, status: 'active' });
    archiveContractMock.mockResolvedValue({ ...draftContract, archivedAt: new Date().toISOString() });
    getContractActivitiesMock.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });
    listContractAmendmentsMock.mockResolvedValue([]);
    createContractAmendmentMock.mockResolvedValue({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'draft',
      amendmentType: 'scope_change',
      title: 'Office Cleaning Agreement Amendment',
      effectiveDate: new Date().toISOString(),
      oldMonthlyValue: 2500,
      newMonthlyValue: 2500,
      monthlyDelta: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUser: { id: 'user-1', fullName: 'Admin User', email: 'admin@example.com' },
      snapshots: [],
      activities: [],
    });
    getContractAmendmentMock.mockResolvedValue({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'draft',
      amendmentType: 'scope_change',
      title: 'Office Cleaning Agreement Amendment',
      effectiveDate: new Date().toISOString(),
      oldMonthlyValue: 2500,
      newMonthlyValue: 2500,
      monthlyDelta: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUser: { id: 'user-1', fullName: 'Admin User', email: 'admin@example.com' },
      snapshots: [],
      activities: [],
    });
    updateContractAmendmentMock.mockResolvedValue({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'submitted',
      amendmentType: 'scope_change',
      title: 'Office Cleaning Agreement Amendment',
      effectiveDate: new Date().toISOString(),
      oldMonthlyValue: 2500,
      newMonthlyValue: 2500,
      monthlyDelta: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUser: { id: 'user-1', fullName: 'Admin User', email: 'admin@example.com' },
      snapshots: [],
      activities: [],
    });
    listTeamsMock.mockResolvedValue({
      data: [{ id: 'team-1', name: 'Alpha Team' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    listUsersMock.mockResolvedValue({
      data: [{ id: 'user-2', fullName: 'Jane Employee', email: 'jane@example.com', status: 'active' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    listAreaTypesMock.mockResolvedValue({
      data: [{ id: 'area-type-1', name: 'Lobby', description: null, defaultSquareFeet: null, baseCleaningTimeMinutes: null, createdAt: '', updatedAt: '', _count: { areas: 0, taskTemplates: 0 } }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    listTaskTemplatesMock.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    getAreaTemplateByAreaTypeMock.mockResolvedValue({
      id: 'template-1',
      name: 'Lobby Template',
      defaultSquareFeet: null,
      createdAt: '',
      updatedAt: '',
      areaType: {
        id: 'area-type-1',
        name: 'Lobby',
        defaultSquareFeet: null,
      },
      items: [],
      tasks: [],
      createdByUser: {
        id: 'user-1',
        fullName: 'Admin User',
      },
    });
    listPricingSettingsMock.mockResolvedValue({
      data: [{ id: 'plan-1', name: 'Default Plan', pricingType: 'standard' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    recalculateContractAmendmentMock.mockResolvedValue({
      amendment: {
        id: 'amend-1',
        contractId: 'contract-1',
        amendmentNumber: 1,
        status: 'draft',
        amendmentType: 'scope_change',
        title: 'Office Cleaning Agreement Amendment',
        effectiveDate: new Date().toISOString(),
        oldMonthlyValue: 2500,
        newMonthlyValue: 3000,
        monthlyDelta: 500,
        pricingPlanId: 'plan-1',
        newServiceFrequency: 'weekly',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdByUser: { id: 'user-1', fullName: 'Admin User', email: 'admin@example.com' },
        pricingSnapshot: { monthlyTotal: 3000 },
        snapshots: [],
        activities: [],
      },
      pricing: {
        facilityId: 'facility-1',
        facilityName: 'Main Office',
        buildingType: 'office',
        serviceFrequency: 'weekly',
        totalSquareFeet: 1000,
        areas: [],
        costBreakdown: {
          totalLaborCost: 100,
          totalLaborHours: 10,
          totalInsuranceCost: 10,
          totalAdminOverheadCost: 10,
          totalEquipmentCost: 10,
          totalTravelCost: 10,
          totalSupplyCost: 10,
          totalCostPerVisit: 150,
        },
        monthlyVisits: 4.33,
        monthlyCostBeforeProfit: 650,
        profitAmount: 350,
        profitMarginApplied: 0.35,
        taskComplexityAddOn: 0,
        taskComplexityAmount: 0,
        subtotal: 1000,
        monthlyTotal: 3000,
        minimumApplied: false,
        subcontractorPercentage: 0.6,
        subcontractorPayout: 1800,
        companyRevenue: 1200,
        pricingPlanId: 'plan-1',
        pricingPlanName: 'Default Plan',
      },
    });
    approveContractAmendmentMock.mockResolvedValue({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'approved',
      amendmentType: 'scope_change',
      title: 'Office Cleaning Agreement Amendment',
      effectiveDate: new Date().toISOString(),
      oldMonthlyValue: 2500,
      newMonthlyValue: 3000,
      monthlyDelta: 500,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUser: { id: 'user-1', fullName: 'Admin User', email: 'admin@example.com' },
      snapshots: [],
      activities: [],
    });
    rejectContractAmendmentMock.mockResolvedValue({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'rejected',
      amendmentType: 'scope_change',
      title: 'Office Cleaning Agreement Amendment',
      effectiveDate: new Date().toISOString(),
      oldMonthlyValue: 2500,
      newMonthlyValue: 3000,
      monthlyDelta: 500,
      rejectedReason: 'Scope not approved',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUser: { id: 'user-1', fullName: 'Admin User', email: 'admin@example.com' },
      snapshots: [],
      activities: [],
    });
    applyContractAmendmentMock.mockResolvedValue({
      amendment: {
        id: 'amend-1',
        contractId: 'contract-1',
        amendmentNumber: 1,
        status: 'applied',
        amendmentType: 'scope_change',
        title: 'Office Cleaning Agreement Amendment',
        effectiveDate: new Date().toISOString(),
        oldMonthlyValue: 2500,
        newMonthlyValue: 3000,
        monthlyDelta: 500,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        appliedAt: new Date().toISOString(),
        appliedByUser: { id: 'user-1', fullName: 'Admin User', email: 'admin@example.com' },
        createdByUser: { id: 'user-1', fullName: 'Admin User', email: 'admin@example.com' },
        snapshots: [],
        activities: [
          {
            id: 'activity-1',
            action: 'applied',
            createdAt: new Date().toISOString(),
            metadata: {
              updatedAreaCount: 1,
              createdAreaCount: 1,
              removedAreaCount: 0,
              updatedTaskCount: 2,
              createdTaskCount: 1,
              removedTaskCount: 0,
              activeAreaCount: 2,
              activeTaskCount: 3,
            },
          },
        ],
      },
      recurringJobs: { canceled: 2, created: 3 },
    });
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders contract detail', async () => {
    render(<ContractDetail />);

    expect(await screen.findByText('CONT-202602-0001')).toBeInTheDocument();
    expect(screen.getByText('Office Cleaning Agreement')).toBeInTheDocument();
    expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
  });

  it('activates draft contract', async () => {
    getContractMock.mockResolvedValueOnce({ ...draftContract, status: 'sent' });
    const user = userEvent.setup();
    render(<ContractDetail />);

    await user.click(await screen.findByRole('button', { name: /activate/i }));

    await waitFor(() => {
      expect(updateContractStatusMock).toHaveBeenCalledWith('contract-1', 'active');
    });
  });

  it('archives draft contract', async () => {
    const user = userEvent.setup();
    render(<ContractDetail />);

    await screen.findByText('CONT-202602-0001');
    const header = screen.getByText('Office Cleaning Agreement').closest('div.flex-1')?.parentElement;
    const actionRow = header?.querySelector('div.flex.items-center.gap-2');
    const actionButtons = actionRow?.querySelectorAll('button') || [];
    await user.click(actionButtons[actionButtons.length - 1] as HTMLElement);
    await user.click(await screen.findByText('Archive'));

    await waitFor(() => {
      expect(archiveContractMock).toHaveBeenCalledWith('contract-1');
    });
  });

  it('shows facility areas and tasks for subcontractor view', async () => {
    useAuthStore.setState({
      user: {
        id: 'sub-1',
        email: 'sub@example.com',
        fullName: 'Sub User',
        role: 'subcontractor',
      },
      token: 'token',
      refreshToken: null,
      isAuthenticated: true,
      hasPermission: () => true,
      canAny: () => true,
    });

    getContractMock.mockResolvedValueOnce({
      ...draftContract,
      facility: {
        id: 'facility-1',
        name: 'Main Office',
        address: { street: '123 Main St', city: 'Austin', state: 'TX' },
        accessInstructions: 'Use side entrance keypad',
        parkingInfo: 'Park in rear lot',
        specialRequirements: 'Wear PPE in production zone',
        notes: 'Alarm code changes monthly',
        areas: [{ id: 'area-1', name: 'Lobby', areaType: 'Common Area', squareFeet: 1200 }],
        tasks: [{ name: 'Vacuum', areaName: 'Lobby', cleaningFrequency: 'daily' }],
      },
    });

    render(<ContractDetail />);

    expect(await screen.findByText('Facility Areas & Tasks')).toBeInTheDocument();
    expect(screen.getByText('Facility Notes & Access')).toBeInTheDocument();
    expect(screen.getByText('Use side entrance keypad')).toBeInTheDocument();
    expect(screen.getByText('Park in rear lot')).toBeInTheDocument();
    expect(screen.getByText('Wear PPE in production zone')).toBeInTheDocument();
    expect(screen.getByText('Alarm code changes monthly')).toBeInTheDocument();
    expect(screen.getByText('Lobby')).toBeInTheDocument();
    expect(screen.getByText('Vacuum')).toBeInTheDocument();
    expect(screen.getByText('Daily')).toBeInTheDocument();
  });

  it('creates amendment draft from contract detail', async () => {
    getContractMock.mockResolvedValueOnce({ ...draftContract, status: 'active' });
    const user = userEvent.setup();

    render(<ContractDetail />);

    await user.click(await screen.findByRole('button', { name: /create contract change/i }));
    await user.type(screen.getByLabelText(/^reason$/i), 'Client requested scope change');
    await user.click(screen.getByRole('button', { name: /create draft/i }));

    await waitFor(() => {
      expect(createContractAmendmentMock).toHaveBeenCalledWith(
        'contract-1',
        expect.objectContaining({
          reason: 'Client requested scope change',
        })
      );
    });
  });

  it('recalculates amendment pricing from draft scope editor', async () => {
    getContractMock.mockResolvedValueOnce({ ...draftContract, status: 'active' });
    getContractAmendmentMock.mockResolvedValueOnce({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'draft',
      amendmentType: 'scope_change',
      title: 'Office Cleaning Agreement Amendment',
      effectiveDate: new Date().toISOString(),
      oldMonthlyValue: 2500,
      newMonthlyValue: 2500,
      monthlyDelta: 0,
      pricingPlanId: 'plan-1',
      newServiceFrequency: 'weekly',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUser: { id: 'user-1', fullName: 'Admin User', email: 'admin@example.com' },
      snapshots: [
        {
          id: 'snap-1',
          snapshotType: 'working',
          createdAt: new Date().toISOString(),
          scopeJson: {
            facility: { id: 'facility-1', name: 'Main Office', buildingType: 'office' },
            areas: [{ id: 'area-1', name: 'Lobby', areaType: { id: 'area-type-1', name: 'Lobby' }, squareFeet: 1000, quantity: 1, floorType: 'vct', conditionLevel: 'standard', trafficLevel: 'medium' }],
            tasks: [{ id: 'task-1', areaId: 'area-1', customName: 'Vacuum', cleaningFrequency: 'daily', estimatedMinutes: 20 }],
          },
        },
      ],
      activities: [],
    });
    const user = userEvent.setup();

    render(<ContractDetail />);

    await user.click(await screen.findByRole('button', { name: /create contract change/i }));
    await user.click(screen.getByRole('button', { name: /create draft/i }));
    await user.click(await screen.findByRole('button', { name: /update price/i }));

    await waitFor(() => {
      expect(recalculateContractAmendmentMock).toHaveBeenCalledWith(
        'contract-1',
        'amend-1',
        expect.objectContaining({
          workingScope: expect.objectContaining({
            areas: expect.any(Array),
            tasks: expect.any(Array),
          }),
        })
      );
    });
  });

  it('shows a before and after comparison for contract changes', async () => {
    const amendmentWithComparison = {
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'approved',
      amendmentType: 'mixed',
      title: 'Office Cleaning Agreement Amendment',
      effectiveDate: new Date().toISOString(),
      oldMonthlyValue: 2500,
      newMonthlyValue: 3000,
      monthlyDelta: 500,
      pricingPlanId: 'plan-1',
      newServiceFrequency: '2x_week',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUser: { id: 'user-1', fullName: 'Admin User', email: 'admin@example.com' },
      snapshots: [
        {
          id: 'snap-before',
          snapshotType: 'before',
          createdAt: new Date().toISOString(),
          scopeJson: {
            contract: {
              serviceFrequency: 'weekly',
              serviceSchedule: { days: ['monday'] },
            },
            areas: [{ id: 'area-1', name: 'Lobby' }],
            tasks: [{ id: 'task-1', areaId: 'area-1', customName: 'Vacuum', cleaningFrequency: 'weekly' }],
          },
        },
        {
          id: 'snap-working',
          snapshotType: 'working',
          createdAt: new Date().toISOString(),
          scopeJson: {
            contract: {
              serviceFrequency: '2x_week',
              serviceSchedule: { days: ['monday', 'thursday'] },
            },
            areas: [
              { id: 'area-1', name: 'Lobby' },
              { tempId: 'temp-area-2', name: 'East Wing' },
            ],
            tasks: [
              { id: 'task-1', areaId: 'area-1', customName: 'Vacuum', cleaningFrequency: 'weekly' },
              { tempId: 'temp-task-2', areaId: 'temp-area-2', customName: 'Dust Fixtures', cleaningFrequency: '2x_week' },
            ],
          },
        },
      ],
      activities: [],
    };
    getContractMock.mockResolvedValueOnce({ ...draftContract, status: 'active' });
    createContractAmendmentMock.mockResolvedValueOnce(amendmentWithComparison);
    getContractAmendmentMock.mockResolvedValueOnce(amendmentWithComparison);
    const user = userEvent.setup();

    render(<ContractDetail />);

    await user.click(await screen.findByRole('button', { name: /create contract change/i }));
    await user.click(screen.getByRole('button', { name: /create draft/i }));

    expect(await screen.findByText('What Will Change')).toBeInTheDocument();
    expect(screen.getByText('Current Schedule')).toBeInTheDocument();
    expect(screen.getByText('Updated Schedule')).toBeInTheDocument();
    expect(screen.getByText('Being Added')).toBeInTheDocument();
    expect(screen.getByText('Being Removed')).toBeInTheDocument();
    expect(screen.getByText('East Wing')).toBeInTheDocument();
    expect(screen.getByText('Dust Fixtures (East Wing)')).toBeInTheDocument();
    expect(screen.getAllByText(/\+\$500\.00/).length).toBeGreaterThan(0);
  });

  it('updates the comparison immediately when draft scope changes before save', async () => {
    const amendmentWithDraftScope = {
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'draft',
      amendmentType: 'mixed',
      title: 'Office Cleaning Agreement Amendment',
      effectiveDate: new Date().toISOString(),
      oldMonthlyValue: 2500,
      newMonthlyValue: 2500,
      monthlyDelta: 0,
      pricingPlanId: 'plan-1',
      newServiceFrequency: 'weekly',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUser: { id: 'user-1', fullName: 'Admin User', email: 'admin@example.com' },
      snapshots: [
        {
          id: 'snap-before',
          snapshotType: 'before',
          createdAt: new Date().toISOString(),
          scopeJson: {
            contract: {
              serviceFrequency: 'weekly',
              serviceSchedule: { days: ['monday'] },
            },
            areas: [
              { id: 'area-1', name: 'Lobby' },
              { id: 'area-2', name: 'Break Room' },
            ],
            tasks: [
              { id: 'task-1', areaId: 'area-1', customName: 'Vacuum', cleaningFrequency: 'weekly' },
            ],
          },
        },
        {
          id: 'snap-working',
          snapshotType: 'working',
          createdAt: new Date().toISOString(),
          scopeJson: {
            contract: {
              serviceFrequency: 'weekly',
              serviceSchedule: { days: ['monday'] },
            },
            areas: [
              { id: 'area-1', name: 'Lobby' },
              { id: 'area-2', name: 'Break Room' },
            ],
            tasks: [
              { id: 'task-1', areaId: 'area-1', customName: 'Vacuum', cleaningFrequency: 'weekly' },
            ],
          },
        },
      ],
      activities: [],
    };

    getContractMock.mockResolvedValueOnce({ ...draftContract, status: 'active' });
    createContractAmendmentMock.mockResolvedValueOnce(amendmentWithDraftScope);
    getContractAmendmentMock.mockResolvedValueOnce(amendmentWithDraftScope);
    const user = userEvent.setup();

    render(<ContractDetail />);

    await user.click(await screen.findByRole('button', { name: /create contract change/i }));
    await user.click(screen.getByRole('button', { name: /create draft/i }));

    expect((await screen.findAllByText('Break Room')).length).toBeGreaterThan(0);

    const removeAreaButtons = screen.getAllByRole('button', { name: /remove area/i });
    await user.click(removeAreaButtons[1]);

    const addTaskButtons = screen.getAllByRole('button', { name: /add task/i });
    await user.click(addTaskButtons[0]);

    const taskNameInputs = screen.getAllByLabelText(/task name/i);
    await user.type(taskNameInputs[taskNameInputs.length - 1], 'Dust Desks');

    expect(await screen.findByText('Being Removed')).toBeInTheDocument();
    expect(screen.getByText('Break Room')).toBeInTheDocument();
    expect(screen.getByText('Dust Desks (Lobby)')).toBeInTheDocument();
  });

  it('requires explicit confirmation to apply a future contract change early', async () => {
    const futureApprovedAmendment = {
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'approved',
      amendmentType: 'mixed',
      title: 'Office Cleaning Agreement Amendment',
      effectiveDate: '2026-03-20T00:00:00.000Z',
      oldMonthlyValue: 2500,
      newMonthlyValue: 3000,
      monthlyDelta: 500,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUser: { id: 'user-1', fullName: 'Admin User', email: 'admin@example.com' },
      snapshots: [],
      activities: [],
    };
    getContractMock.mockResolvedValueOnce({ ...draftContract, status: 'active' });
    createContractAmendmentMock.mockResolvedValueOnce(futureApprovedAmendment);
    getContractAmendmentMock.mockResolvedValueOnce(futureApprovedAmendment);

    const user = userEvent.setup();
    const confirmMock = vi.fn(() => true);
    vi.stubGlobal('confirm', confirmMock);

    render(<ContractDetail />);

    await user.click(await screen.findByRole('button', { name: /create contract change/i }));
    await user.click(screen.getByRole('button', { name: /create draft/i }));
    await user.click(await screen.findByRole('button', { name: /apply change/i }));

    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalledWith(
        expect.stringMatching(/scheduled to start on/i)
      );
    });
    expect(applyContractAmendmentMock).toHaveBeenCalledWith('contract-1', 'amend-1', {
      forceApply: true,
    });
    expect(await screen.findByText('Apply Summary')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Applied to the live contract')).toBeInTheDocument();
    expect(screen.getByText('1 updated')).toBeInTheDocument();
    expect(screen.getByText('3 total tasks')).toBeInTheDocument();
    expect(screen.getByText('Future Jobs')).toBeInTheDocument();
    expect(screen.getByText('3 created')).toBeInTheDocument();
    expect(screen.getByText('2 removed')).toBeInTheDocument();
  });
});
