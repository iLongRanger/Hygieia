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
  Calendar,
  DollarSign,
  FileText,
  RotateCcw,
  PlayCircle,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  getContract,
  updateContractStatus,
  signContract,
  terminateContract,
  archiveContract,
  restoreContract,
  createContractFromProposal,
} from '../../lib/contracts';
import type { Contract, ContractStatus } from '../../types/contract';

const getStatusVariant = (status: ContractStatus) => {
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

const ContractDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<Contract | null>(null);

  useEffect(() => {
    if (id) {
      fetchContract(id);
    }
  }, [id]);

  const fetchContract = async (contractId: string) => {
    try {
      setLoading(true);
      const data = await getContract(contractId);
      setContract(data);
    } catch (error) {
      console.error('Failed to fetch contract:', error);
      toast.error('Failed to load contract');
      navigate('/contracts');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!contract || !confirm('Activate this contract? This will make it active and billable.')) return;

    try {
      await updateContractStatus(contract.id, 'active');
      toast.success('Contract activated successfully');
      fetchContract(contract.id);
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
      fetchContract(contract.id);
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
      fetchContract(contract.id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to terminate contract');
    }
  };

  const handleArchive = async () => {
    if (!contract || !confirm('Archive this contract?')) return;

    try {
      await archiveContract(contract.id);
      toast.success('Contract archived');
      fetchContract(contract.id);
    } catch (error) {
      toast.error('Failed to archive contract');
    }
  };

  const handleRestore = async () => {
    if (!contract) return;

    try {
      await restoreContract(contract.id);
      toast.success('Contract restored');
      fetchContract(contract.id);
    } catch (error) {
      toast.error('Failed to restore contract');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-gray-400">Loading contract...</div>
        </div>
      </div>
    );
  }

  if (!contract) {
    return null;
  }

  const StatusIcon = getStatusIcon(contract.status);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/contracts')}
            className="mb-4 text-gray-400 hover:text-gray-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contracts
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-100 mb-2">
                {contract.contractNumber}
              </h1>
              <p className="text-xl text-gray-400">{contract.title}</p>
            </div>
            <Badge variant={getStatusVariant(contract.status)} className="text-lg px-4 py-2">
              <StatusIcon className="w-5 h-5 mr-2" />
              {contract.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <Card className="mb-6 bg-gray-800 border-gray-700">
          <div className="flex flex-wrap gap-3">
            {contract.status === 'draft' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/contracts/${contract.id}/edit`)}
                  className="border-gray-600 text-gray-300"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Contract
                </Button>
                <Button
                  variant="primary"
                  onClick={handleActivate}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Activate Contract
                </Button>
              </>
            )}
            {contract.status === 'pending_signature' && (
              <Button
                variant="primary"
                onClick={handleSign}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <FileSignature className="w-4 h-4 mr-2" />
                Sign Contract
              </Button>
            )}
            {contract.status === 'active' && (
              <Button
                variant="outline"
                onClick={handleTerminate}
                className="border-red-600 text-red-400 hover:bg-red-900/20"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Terminate Contract
              </Button>
            )}
            {!contract.archivedAt && !['active', 'terminated'].includes(contract.status) && (
              <Button
                variant="outline"
                onClick={handleArchive}
                className="border-gray-600 text-gray-400"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </Button>
            )}
            {contract.archivedAt && (
              <Button
                variant="outline"
                onClick={handleRestore}
                className="border-gray-600 text-gray-300"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Restore
              </Button>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account & Facility Information */}
          <Card className="bg-gray-800 border-gray-700">
            <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-indigo-400" />
              Account & Facility
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Account</label>
                <p className="text-gray-100 font-medium">{contract.account.name}</p>
                <p className="text-sm text-gray-400 capitalize">{contract.account.type}</p>
              </div>
              {contract.facility && (
                <div>
                  <label className="text-sm text-gray-400">Facility</label>
                  <p className="text-gray-100 font-medium">{contract.facility.name}</p>
                  {contract.facility.address && (
                    <p className="text-sm text-gray-400 flex items-start">
                      <MapPin className="w-4 h-4 mr-1 mt-0.5" />
                      {typeof contract.facility.address === 'string'
                        ? contract.facility.address
                        : JSON.stringify(contract.facility.address)}
                    </p>
                  )}
                </div>
              )}
              {contract.proposal && (
                <div>
                  <label className="text-sm text-gray-400">Source Proposal</label>
                  <p className="text-gray-100 font-medium">
                    <button
                      onClick={() => navigate(`/proposals/${contract.proposal?.id}`)}
                      className="text-indigo-400 hover:text-indigo-300 underline"
                    >
                      {contract.proposal.proposalNumber} - {contract.proposal.title}
                    </button>
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Financial Terms */}
          <Card className="bg-gray-800 border-gray-700">
            <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-green-400" />
              Financial Terms
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Monthly Value</label>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(Number(contract.monthlyValue))}
                </p>
              </div>
              {contract.totalValue && (
                <div>
                  <label className="text-sm text-gray-400">Total Contract Value</label>
                  <p className="text-xl font-semibold text-gray-100">
                    {formatCurrency(Number(contract.totalValue))}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Billing Cycle</label>
                  <p className="text-gray-100 capitalize">
                    {contract.billingCycle.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Payment Terms</label>
                  <p className="text-gray-100">{contract.paymentTerms}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Service Terms */}
          <Card className="bg-gray-800 border-gray-700">
            <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-400" />
              Service Terms
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Start Date</label>
                  <p className="text-gray-100">{formatDate(contract.startDate)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">End Date</label>
                  <p className="text-gray-100">{formatDate(contract.endDate)}</p>
                </div>
              </div>
              {contract.serviceFrequency && (
                <div>
                  <label className="text-sm text-gray-400">Service Frequency</label>
                  <p className="text-gray-100 capitalize">
                    {contract.serviceFrequency.replace('_', ' ')}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Auto-Renew</label>
                  <p className="text-gray-100">{contract.autoRenew ? 'Yes' : 'No'}</p>
                </div>
                {contract.renewalNoticeDays && (
                  <div>
                    <label className="text-sm text-gray-400">Renewal Notice</label>
                    <p className="text-gray-100">{contract.renewalNoticeDays} days</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Workflow & Signatures */}
          <Card className="bg-gray-800 border-gray-700">
            <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center">
              <FileSignature className="w-5 h-5 mr-2 text-purple-400" />
              Workflow & Signatures
            </h2>
            <div className="space-y-4">
              {contract.signedByName && (
                <div>
                  <label className="text-sm text-gray-400">Signed By</label>
                  <p className="text-gray-100">{contract.signedByName}</p>
                  <p className="text-sm text-gray-400">{contract.signedByEmail}</p>
                  <p className="text-sm text-gray-400">
                    Signed on: {formatDate(contract.signedDate)}
                  </p>
                </div>
              )}
              {contract.approvedByUser && (
                <div>
                  <label className="text-sm text-gray-400">Approved By</label>
                  <p className="text-gray-100">{contract.approvedByUser.fullName}</p>
                  <p className="text-sm text-gray-400">
                    Approved on: {formatDate(contract.approvedAt)}
                  </p>
                </div>
              )}
              {contract.terminationReason && (
                <div>
                  <label className="text-sm text-gray-400">Termination Reason</label>
                  <p className="text-gray-100">{contract.terminationReason}</p>
                  <p className="text-sm text-gray-400">
                    Terminated on: {formatDate(contract.terminatedAt)}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm text-gray-400">Created By</label>
                <p className="text-gray-100 flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  {contract.createdByUser.fullName}
                </p>
                <p className="text-sm text-gray-400">
                  {formatDate(contract.createdAt)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Terms & Conditions */}
        {contract.termsAndConditions && (
          <Card className="mt-6 bg-gray-800 border-gray-700">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">
              Terms & Conditions
            </h2>
            <div className="text-gray-300 whitespace-pre-wrap">
              {contract.termsAndConditions}
            </div>
          </Card>
        )}

        {/* Special Instructions */}
        {contract.specialInstructions && (
          <Card className="mt-6 bg-gray-800 border-gray-700">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">
              Special Instructions
            </h2>
            <div className="text-gray-300 whitespace-pre-wrap">
              {contract.specialInstructions}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ContractDetail;
