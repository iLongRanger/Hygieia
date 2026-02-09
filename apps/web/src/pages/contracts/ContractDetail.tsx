import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  FileSignature,
  CheckCircle,
  XCircle,
  Archive,
  Building2,
  MapPin,
  User,
  Users,
  Calendar,
  DollarSign,
  FileText,
  RotateCcw,
  PlayCircle,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Link as LinkIcon,
  Download,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import {
  getContract,
  updateContract,
  updateContractStatus,
  signContract,
  terminateContract,
  archiveContract,
  restoreContract,
  canRenewContract,
  renewContract,
  assignContractTeam,
  completeInitialClean as completeInitialCleanApi,
  downloadContractPdf,
  generateContractTerms,
} from '../../lib/contracts';
import ContractTimeline from '../../components/contracts/ContractTimeline';
import { listTeams } from '../../lib/teams';
import type { Contract, ContractStatus, RenewContractInput } from '../../types/contract';
import type { Team } from '../../types/team';

// Format address object into readable string
const formatAddress = (address: any): string => {
  if (!address) return '';
  if (typeof address === 'string') return address;

  const lines: string[] = [];
  if (address.street) lines.push(address.street);
  const cityLine = [address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(', ');
  if (cityLine) lines.push(cityLine);
  if (address.country) lines.push(address.country);
  return lines.length > 0 ? lines.join(', ') : '';
};

const getStatusVariant = (status: ContractStatus): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  const variants: Record<ContractStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    draft: 'default',
    pending_signature: 'warning',
    active: 'success',
    expired: 'default',
    terminated: 'error',
    renewed: 'info',
  };
  return variants[status];
};

const getStatusIcon = (status: ContractStatus) => {
  const icons: Record<ContractStatus, React.ElementType> = {
    draft: FileText,
    pending_signature: FileSignature,
    active: CheckCircle,
    expired: Calendar,
    terminated: XCircle,
    renewed: RotateCcw,
  };
  return icons[status];
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (date: string | null | undefined) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const SERVICE_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi_weekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'custom', label: 'Custom' },
];

const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
];

const ContractDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<Contract | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [assigningTeam, setAssigningTeam] = useState(false);

  // T&C inline editing state
  const [editingTerms, setEditingTerms] = useState(false);
  const [termsText, setTermsText] = useState('');
  const [savingTerms, setSavingTerms] = useState(false);
  const [generatingTerms, setGeneratingTerms] = useState(false);

  // Renewal modal state
  const [activityRefresh, setActivityRefresh] = useState(0);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [renewalFormData, setRenewalFormData] = useState<RenewContractInput>({
    startDate: '',
    endDate: null,
    monthlyValue: undefined,
    serviceFrequency: null,
    autoRenew: false,
    renewalNoticeDays: 30,
    billingCycle: 'monthly',
    paymentTerms: 'Net 30',
    termsAndConditions: null,
    specialInstructions: null,
  });

  useEffect(() => {
    if (id) {
      fetchContract(id);
      fetchTeams();
    }
  }, [id]);

  const refreshAll = (contractId: string) => {
    fetchContract(contractId);
    setActivityRefresh((n) => n + 1);
  };

  const fetchContract = async (contractId: string) => {
    try {
      setLoading(true);
      const data = await getContract(contractId);
      setContract(data);
      setSelectedTeamId(data.assignedTeam?.id || '');
    } catch (error) {
      console.error('Failed to fetch contract:', error);
      toast.error('Failed to load contract');
      navigate('/contracts');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await listTeams({ limit: 100, isActive: true });
      setTeams(response.data || []);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      toast.error('Failed to load teams');
    }
  };

  const handleAssignTeam = async () => {
    if (!contract) return;

    try {
      setAssigningTeam(true);
      const updatedContract = await assignContractTeam(contract.id, selectedTeamId || null);
      setContract(updatedContract);
      setActivityRefresh((n) => n + 1);
      toast.success(selectedTeamId ? 'Team assigned successfully' : 'Team unassigned successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Failed to assign team');
    } finally {
      setAssigningTeam(false);
    }
  };

  const handleActivate = async () => {
    if (!contract || !confirm('Activate this contract? This will make it active and billable.')) return;

    try {
      await updateContractStatus(contract.id, 'active');
      toast.success('Contract activated successfully');
      refreshAll(contract.id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to activate contract');
    }
  };

  const handleSign = async () => {
    if (!contract) return;

    const signedByName = prompt('Enter signer name:');
    if (!signedByName) return;

    const signedByEmail = prompt('Enter signer email:');
    if (!signedByEmail) return;

    try {
      await signContract(contract.id, {
        signedDate: new Date().toISOString().split('T')[0],
        signedByName,
        signedByEmail,
      });
      toast.success('Contract signed successfully');
      refreshAll(contract.id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to sign contract');
    }
  };

  const handleTerminate = async () => {
    if (!contract) return;

    const reason = prompt('Please provide a termination reason:');
    if (!reason) return;

    if (!confirm('Terminate this contract? This action will end the service agreement.')) return;

    try {
      await terminateContract(contract.id, { terminationReason: reason });
      toast.success('Contract terminated');
      refreshAll(contract.id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to terminate contract');
    }
  };

  const handleArchive = async () => {
    if (!contract || !confirm('Archive this contract?')) return;

    try {
      await archiveContract(contract.id);
      toast.success('Contract archived');
      refreshAll(contract.id);
    } catch (error) {
      toast.error('Failed to archive contract');
    }
  };

  const handleRestore = async () => {
    if (!contract) return;

    try {
      await restoreContract(contract.id);
      toast.success('Contract restored');
      refreshAll(contract.id);
    } catch (error) {
      toast.error('Failed to restore contract');
    }
  };

  const openRenewModal = async () => {
    if (!contract) return;

    try {
      const result = await canRenewContract(contract.id);
      if (!result.canRenew) {
        toast.error(result.reason || 'This contract cannot be renewed');
        return;
      }
    } catch (error) {
      toast.error('Failed to check renewal eligibility');
      return;
    }

    // Pre-fill form with contract data
    const startDate = contract.endDate
      ? new Date(new Date(contract.endDate).getTime() + 86400000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    setRenewalFormData({
      startDate,
      endDate: null,
      monthlyValue: Number(contract.monthlyValue),
      serviceFrequency: contract.serviceFrequency || null,
      autoRenew: contract.autoRenew,
      renewalNoticeDays: contract.renewalNoticeDays || 30,
      billingCycle: contract.billingCycle,
      paymentTerms: contract.paymentTerms,
      termsAndConditions: contract.termsAndConditions || null,
      specialInstructions: contract.specialInstructions || null,
    });
    setShowRenewModal(true);
  };

  const handleRenew = async () => {
    if (!contract) return;

    if (!renewalFormData.startDate) {
      toast.error('Start date is required');
      return;
    }

    try {
      setRenewing(true);
      const renewedContract = await renewContract(contract.id, renewalFormData);
      toast.success('Contract renewed successfully');
      setShowRenewModal(false);
      // Navigate to the new contract
      navigate(`/contracts/${renewedContract.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to renew contract');
    } finally {
      setRenewing(false);
    }
  };

  const handleCompleteInitialClean = async () => {
    if (!contract || !confirm('Mark the initial clean as completed?')) return;

    try {
      const updated = await completeInitialCleanApi(contract.id);
      setContract(updated);
      setActivityRefresh((n) => n + 1);
      toast.success('Initial clean marked as completed');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to complete initial clean');
    }
  };

  const handleDownloadPdf = async () => {
    if (!contract) return;
    try {
      await downloadContractPdf(contract.id, contract.contractNumber);
      toast.success('PDF downloaded');
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!contract) {
    return <div className="text-center text-gray-400">Contract not found</div>;
  }

  const StatusIcon = getStatusIcon(contract.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/contracts')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{contract.contractNumber}</h1>
            <Badge variant={getStatusVariant(contract.status)}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {contract.status.replace('_', ' ').toUpperCase()}
            </Badge>
            {contract.status === 'active' && contract.endDate && (() => {
              const daysLeft = Math.ceil(
                (new Date(contract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );
              return daysLeft <= 30 && daysLeft > 0 ? (
                <Badge variant="warning">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Expires in {daysLeft} days
                </Badge>
              ) : null;
            })()}
          </div>
          <p className="text-gray-400">{contract.title}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleDownloadPdf}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          {contract.status === 'draft' && (
            <>
              <Button
                variant="secondary"
                onClick={() => navigate(`/contracts/${contract.id}/edit`)}
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button onClick={handleActivate}>
                <PlayCircle className="mr-2 h-4 w-4" />
                Activate
              </Button>
            </>
          )}
          {contract.status === 'pending_signature' && (
            <Button onClick={handleSign}>
              <FileSignature className="mr-2 h-4 w-4" />
              Sign Contract
            </Button>
          )}
          {(contract.status === 'active' || contract.status === 'expired') && !contract.renewedToContract && (
            <Button onClick={openRenewModal}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Renew
            </Button>
          )}
          {contract.status === 'active' && (
            <Button
              variant="secondary"
              onClick={handleTerminate}
              className="text-red-400 hover:text-red-300"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Terminate
            </Button>
          )}
          {!contract.archivedAt && !['active', 'terminated'].includes(contract.status) && (
            <Button
              variant="secondary"
              onClick={handleArchive}
              className="text-orange-400 hover:text-orange-300"
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>
          )}
          {contract.archivedAt && (
            <Button variant="secondary" onClick={handleRestore}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account & Facility Information */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Account & Facility</h2>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-400">Account</div>
              <div className="text-white font-medium">{contract.account.name}</div>
              <div className="text-sm text-gray-400 capitalize">{contract.account.type}</div>
            </div>
            {contract.facility && (
              <div>
                <div className="text-sm text-gray-400">Facility</div>
                <div className="text-white font-medium">{contract.facility.name}</div>
                {contract.facility.address && (
                  <div className="flex items-start gap-1 text-sm text-gray-400">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{formatAddress(contract.facility.address)}</span>
                  </div>
                )}
              </div>
            )}
            {contract.proposal && (
              <div>
                <div className="text-sm text-gray-400">Source Proposal</div>
                <button
                  onClick={() => navigate(`/proposals/${contract.proposal?.id}`)}
                  className="text-gold hover:underline"
                >
                  {contract.proposal.proposalNumber} - {contract.proposal.title}
                </button>
              </div>
            )}
            {/* Contract Source */}
            <div>
              <div className="text-sm text-gray-400">Contract Source</div>
              <Badge variant="default" className="capitalize">
                {contract.contractSource}
              </Badge>
              {contract.renewalNumber > 0 && (
                <span className="ml-2 text-sm text-gray-400">
                  (Renewal #{contract.renewalNumber})
                </span>
              )}
            </div>
            {/* Renewal Chain */}
            {(contract.renewedFromContract || contract.renewedToContract) && (
              <div>
                <div className="text-sm text-gray-400 mb-2">
                  <LinkIcon className="inline h-4 w-4 mr-1" />
                  Renewal Chain
                </div>
                <div className="space-y-2">
                  {contract.renewedFromContract && (
                    <div className="flex items-center gap-2 text-sm">
                      <ArrowRight className="h-4 w-4 text-gray-500 rotate-180" />
                      <span className="text-gray-400">Previous:</span>
                      <button
                        onClick={() => navigate(`/contracts/${contract.renewedFromContract?.id}`)}
                        className="text-gold hover:underline"
                      >
                        {contract.renewedFromContract.contractNumber}
                      </button>
                    </div>
                  )}
                  {contract.renewedToContract && (
                    <div className="flex items-center gap-2 text-sm">
                      <ArrowRight className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-400">Renewed to:</span>
                      <button
                        onClick={() => navigate(`/contracts/${contract.renewedToContract?.id}`)}
                        className="text-gold hover:underline"
                      >
                        {contract.renewedToContract.contractNumber}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Financial Terms */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-green-400" />
            <h2 className="text-lg font-semibold text-white">Financial Terms</h2>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-400">Monthly Value</div>
              <div className="text-2xl font-bold text-green-400">
                {formatCurrency(Number(contract.monthlyValue))}
              </div>
            </div>
            {contract.totalValue && (
              <div>
                <div className="text-sm text-gray-400">Total Contract Value</div>
                <div className="text-xl font-semibold text-white">
                  {formatCurrency(Number(contract.totalValue))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-400">Billing Cycle</div>
                <div className="text-white capitalize">
                  {contract.billingCycle.replace('_', ' ')}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Payment Terms</div>
                <div className="text-white">{contract.paymentTerms}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Team Assignment */}
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-400" />
            <h2 className="text-lg font-semibold text-white">Assigned Team</h2>
          </div>
          <div className="space-y-4">
            <Select
              label="Subcontractor Team"
              value={selectedTeamId}
              onChange={setSelectedTeamId}
              disabled={contract.status !== 'active'}
              options={[
                { value: '', label: 'Unassigned' },
                ...teams.map((team) => ({ value: team.id, label: team.name })),
              ]}
              hint={
                contract.status !== 'active'
                  ? 'Teams can only be assigned to active contracts'
                  : undefined
              }
            />
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Current: {contract.assignedTeam?.name || 'No team assigned'}
              </div>
              <Button
                onClick={handleAssignTeam}
                disabled={contract.status !== 'active'}
                isLoading={assigningTeam}
              >
                Save Team Assignment
              </Button>
            </div>
          </div>
        </Card>

        {/* Service Terms */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Service Terms</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-400">Start Date</div>
                <div className="text-white">{formatDate(contract.startDate)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">End Date</div>
                <div className="text-white">{formatDate(contract.endDate)}</div>
              </div>
            </div>
            {contract.serviceFrequency && (
              <div>
                <div className="text-sm text-gray-400">Service Frequency</div>
                <div className="text-white capitalize">
                  {contract.serviceFrequency.replace('_', ' ')}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-400">Auto-Renew</div>
                <div className="text-white">{contract.autoRenew ? 'Yes' : 'No'}</div>
              </div>
              {contract.renewalNoticeDays && (
                <div>
                  <div className="text-sm text-gray-400">Renewal Notice</div>
                  <div className="text-white">{contract.renewalNoticeDays} days</div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Workflow & Signatures */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <FileSignature className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Workflow & Signatures</h2>
          </div>
          <div className="space-y-4">
            {contract.signedByName && (
              <div>
                <div className="text-sm text-gray-400">Signed By</div>
                <div className="text-white">{contract.signedByName}</div>
                <div className="text-sm text-gray-400">{contract.signedByEmail}</div>
                <div className="text-sm text-gray-400">
                  Signed on: {formatDate(contract.signedDate)}
                </div>
              </div>
            )}
            {contract.approvedByUser && (
              <div>
                <div className="text-sm text-gray-400">Approved By</div>
                <div className="text-white">{contract.approvedByUser.fullName}</div>
                <div className="text-sm text-gray-400">
                  Approved on: {formatDate(contract.approvedAt)}
                </div>
              </div>
            )}
            {contract.terminationReason && (
              <div>
                <div className="text-sm text-gray-400">Termination Reason</div>
                <div className="text-white">{contract.terminationReason}</div>
                <div className="text-sm text-gray-400">
                  Terminated on: {formatDate(contract.terminatedAt)}
                </div>
              </div>
            )}
            <div>
              <div className="text-sm text-gray-400">Created By</div>
              <div className="flex items-center gap-1 text-white">
                <User className="h-4 w-4" />
                {contract.createdByUser.fullName}
              </div>
              <div className="text-sm text-gray-400">
                {formatDate(contract.createdAt)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Terms & Conditions */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Terms & Conditions</h2>
          {['draft', 'pending_signature'].includes(contract.status) && !editingTerms && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setTermsText(contract.termsAndConditions || '');
                setEditingTerms(true);
              }}
            >
              <Edit2 className="w-3.5 h-3.5 mr-1" />
              Edit
            </Button>
          )}
        </div>
        {editingTerms ? (
          <div className="space-y-3">
            <Textarea
              value={termsText}
              onChange={(e) => setTermsText(e.target.value)}
              rows={16}
              placeholder="Enter contract terms and conditions..."
            />
            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  if (termsText && !window.confirm('This will replace the current terms. Continue?')) return;
                  setGeneratingTerms(true);
                  try {
                    const terms = await generateContractTerms({
                      accountId: contract.account.id,
                      facilityId: contract.facility?.id,
                      startDate: contract.startDate,
                      endDate: contract.endDate,
                      monthlyValue: Number(contract.monthlyValue),
                      billingCycle: contract.billingCycle,
                      paymentTerms: contract.paymentTerms,
                      serviceFrequency: contract.serviceFrequency,
                      autoRenew: contract.autoRenew,
                      renewalNoticeDays: contract.renewalNoticeDays,
                      title: contract.title,
                    });
                    setTermsText(terms);
                    toast.success('Default terms generated');
                  } catch {
                    toast.error('Failed to generate terms');
                  } finally {
                    setGeneratingTerms(false);
                  }
                }}
                disabled={generatingTerms}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                {generatingTerms ? 'Generating...' : 'Generate Default Terms'}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingTerms(false)}
                  disabled={savingTerms}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    setSavingTerms(true);
                    try {
                      await updateContract(contract.id, { termsAndConditions: termsText || null });
                      setEditingTerms(false);
                      refreshAll(contract.id);
                      toast.success('Terms updated');
                    } catch {
                      toast.error('Failed to save terms');
                    } finally {
                      setSavingTerms(false);
                    }
                  }}
                  disabled={savingTerms}
                >
                  {savingTerms ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        ) : contract.termsAndConditions ? (
          <div className="text-gray-300 whitespace-pre-wrap text-sm max-h-96 overflow-y-auto">
            {contract.termsAndConditions}
          </div>
        ) : (
          <p className="text-gray-500 text-sm italic">No terms and conditions set.</p>
        )}
      </Card>

      {/* Special Instructions */}
      {contract.specialInstructions && (
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4">Special Instructions</h2>
          <div className="text-gray-300 whitespace-pre-wrap">
            {contract.specialInstructions}
          </div>
        </Card>
      )}

      {/* Initial Clean */}
      {contract.includesInitialClean && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Initial Clean</h2>
          </div>
          {contract.initialCleanCompleted ? (
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Completed</span>
              <span className="text-sm text-gray-400 ml-2">
                {formatDate(contract.initialCleanCompletedAt)}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-yellow-400 font-medium">Pending</span>
                <p className="text-sm text-gray-400 mt-1">
                  The initial deep clean has not been completed yet.
                </p>
              </div>
              {contract.status === 'active' && (
                <Button onClick={handleCompleteInitialClean}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark Complete
                </Button>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Activity Timeline */}
      {contract && (
        <ContractTimeline contractId={contract.id} refreshTrigger={activityRefresh} />
      )}

      {/* Renewal Modal */}
      <Modal
        isOpen={showRenewModal}
        onClose={() => setShowRenewModal(false)}
        title="Renew Contract"
        size="lg"
      >
        <div className="space-y-6">
          <div className="rounded-lg border border-white/10 bg-navy-darker/50 p-4">
            <h4 className="text-sm font-medium text-gray-400">Renewing Contract</h4>
            <p className="mt-1 text-white">{contract.contractNumber}</p>
            <p className="text-sm text-gray-400">{contract.title}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Date *"
              type="date"
              value={renewalFormData.startDate}
              onChange={(e) =>
                setRenewalFormData({ ...renewalFormData, startDate: e.target.value })
              }
            />
            <Input
              label="End Date"
              type="date"
              value={renewalFormData.endDate || ''}
              onChange={(e) =>
                setRenewalFormData({
                  ...renewalFormData,
                  endDate: e.target.value || null,
                })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Monthly Value"
              type="number"
              step="0.01"
              value={renewalFormData.monthlyValue || ''}
              onChange={(e) =>
                setRenewalFormData({
                  ...renewalFormData,
                  monthlyValue: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
            <Select
              label="Billing Cycle"
              options={BILLING_CYCLES}
              value={renewalFormData.billingCycle || 'monthly'}
              onChange={(value) =>
                setRenewalFormData({
                  ...renewalFormData,
                  billingCycle: value as any,
                })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Service Frequency"
              placeholder="Select frequency"
              options={SERVICE_FREQUENCIES}
              value={renewalFormData.serviceFrequency || ''}
              onChange={(value) =>
                setRenewalFormData({
                  ...renewalFormData,
                  serviceFrequency: (value || null) as any,
                })
              }
            />
            <Input
              label="Payment Terms"
              value={renewalFormData.paymentTerms || ''}
              onChange={(e) =>
                setRenewalFormData({
                  ...renewalFormData,
                  paymentTerms: e.target.value,
                })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={renewalFormData.autoRenew || false}
                  onChange={(e) =>
                    setRenewalFormData({
                      ...renewalFormData,
                      autoRenew: e.target.checked,
                    })
                  }
                  className="rounded border-white/20 bg-navy-darker text-primary-500 focus:ring-primary-500"
                />
                Auto-Renew
              </label>
            </div>
            <Input
              label="Renewal Notice Days"
              type="number"
              value={renewalFormData.renewalNoticeDays || ''}
              onChange={(e) =>
                setRenewalFormData({
                  ...renewalFormData,
                  renewalNoticeDays: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>

          <Textarea
            label="Terms & Conditions"
            rows={3}
            value={renewalFormData.termsAndConditions || ''}
            onChange={(e) =>
              setRenewalFormData({
                ...renewalFormData,
                termsAndConditions: e.target.value || null,
              })
            }
          />

          <Textarea
            label="Special Instructions"
            rows={2}
            value={renewalFormData.specialInstructions || ''}
            onChange={(e) =>
              setRenewalFormData({
                ...renewalFormData,
                specialInstructions: e.target.value || null,
              })
            }
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowRenewModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenew} isLoading={renewing}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Create Renewal Contract
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ContractDetail;

