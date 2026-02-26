import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Send,
  CheckCircle,
  XCircle,
  Archive,
  RotateCcw,
  DollarSign,
  Building2,
  Calendar,
  User,
  ExternalLink,
  Clock,
  Eye,
  FileText,
  Copy,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { useAuthStore } from '../../stores/authStore';
import { PERMISSIONS } from '../../lib/permissions';
import {
  getQuotation,
  sendQuotation,
  acceptQuotation,
  rejectQuotation,
  archiveQuotation,
  restoreQuotation,
  deleteQuotation,
} from '../../lib/quotations';
import type { Quotation, QuotationStatus } from '../../types/quotation';

const getStatusVariant = (status: QuotationStatus) => {
  const variants: Record<QuotationStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    draft: 'default',
    sent: 'info',
    viewed: 'warning',
    accepted: 'success',
    rejected: 'error',
    expired: 'default',
  };
  return variants[status];
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

  const formatDate = (date: string | null | undefined) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString();
};

const formatTime = (date: string | null | undefined) => {
  if (!date) return '-';
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDateTime = (date: string | null | undefined) => {
  if (!date) return '-';
  return new Date(date).toLocaleString();
};

const QuotationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canWrite = hasPermission(PERMISSIONS.QUOTATIONS_WRITE);
  const canAdmin = hasPermission(PERMISSIONS.QUOTATIONS_ADMIN);
  const canDelete = hasPermission(PERMISSIONS.QUOTATIONS_DELETE);

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendEmailTo, setSendEmailTo] = useState('');
  const [sending, setSending] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchQuotation = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getQuotation(id);
      setQuotation(data);
    } catch {
      toast.error('Failed to load quotation');
      navigate('/quotations');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchQuotation();
  }, [fetchQuotation]);

  const handleSend = async () => {
    if (!quotation) return;
    setSending(true);
    try {
      const result = await sendQuotation(quotation.id, {
        emailTo: sendEmailTo || undefined,
      });
      toast.success('Quotation sent');
      setShowSendModal(false);
      if (result.publicUrl) {
        navigator.clipboard.writeText(result.publicUrl).catch(() => {});
        toast.success('Public link copied to clipboard');
      }
      fetchQuotation();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send quotation');
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async () => {
    if (!quotation || !confirm('Mark this quotation as accepted?')) return;
    try {
      await acceptQuotation(quotation.id);
      toast.success('Quotation accepted');
      fetchQuotation();
    } catch {
      toast.error('Failed to accept quotation');
    }
  };

  const handleReject = async () => {
    if (!quotation || !rejectionReason.trim()) return;
    try {
      await rejectQuotation(quotation.id, rejectionReason);
      toast.success('Quotation rejected');
      setShowRejectModal(false);
      setRejectionReason('');
      fetchQuotation();
    } catch {
      toast.error('Failed to reject quotation');
    }
  };

  const handleArchive = async () => {
    if (!quotation || !confirm('Archive this quotation?')) return;
    try {
      await archiveQuotation(quotation.id);
      toast.success('Quotation archived');
      fetchQuotation();
    } catch {
      toast.error('Failed to archive quotation');
    }
  };

  const handleRestore = async () => {
    if (!quotation) return;
    try {
      await restoreQuotation(quotation.id);
      toast.success('Quotation restored');
      fetchQuotation();
    } catch {
      toast.error('Failed to restore quotation');
    }
  };

  const handleDelete = async () => {
    if (!quotation || !confirm('Permanently delete this quotation? This cannot be undone.')) return;
    try {
      await deleteQuotation(quotation.id);
      toast.success('Quotation deleted');
      navigate('/quotations');
    } catch {
      toast.error('Failed to delete quotation');
    }
  };

  const copyPublicLink = () => {
    if (!quotation?.publicToken) return;
    const url = `${window.location.origin}/q/${quotation.publicToken}`;
    navigator.clipboard.writeText(url);
    toast.success('Public link copied');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 skeleton rounded-lg" />
        <Card><div className="p-6"><div className="h-96 skeleton rounded-lg" /></div></Card>
      </div>
    );
  }

  if (!quotation) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/quotations')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="rounded-lg bg-primary-100 p-2.5 dark:bg-primary-900/30">
            <DollarSign className="h-5 w-5 text-primary-700 dark:text-primary-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                {quotation.quotationNumber}
              </h1>
              <Badge variant={getStatusVariant(quotation.status)} size="sm">
                {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
              </Badge>
              {quotation.archivedAt && (
                <Badge variant="default" size="sm">Archived</Badge>
              )}
            </div>
            <p className="text-sm text-surface-500 dark:text-surface-400">{quotation.title}</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Scheduled: {formatDate(quotation.scheduledDate)} {formatTime(quotation.scheduledStartTime)} - {formatTime(quotation.scheduledEndTime)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {quotation.publicToken && (
            <Button variant="secondary" size="sm" onClick={copyPublicLink}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy Link
            </Button>
          )}
          {canWrite && quotation.status === 'draft' && (
            <>
              <Button variant="secondary" size="sm" onClick={() => navigate(`/quotations/${quotation.id}/edit`)}>
                <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
              <Button size="sm" onClick={() => {
                setSendEmailTo(quotation.account.billingEmail || '');
                setShowSendModal(true);
              }}>
                <Send className="mr-1.5 h-3.5 w-3.5" />
                Send
              </Button>
            </>
          )}
          {canAdmin && ['sent', 'viewed'].includes(quotation.status) && (
            <>
              <Button variant="secondary" size="sm" onClick={handleAccept}>
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                Accept
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowRejectModal(true)}>
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                Reject
              </Button>
            </>
          )}
          {canAdmin && !quotation.archivedAt && (
            <Button variant="secondary" size="sm" onClick={handleArchive}>
              <Archive className="mr-1.5 h-3.5 w-3.5" />
              Archive
            </Button>
          )}
          {canAdmin && quotation.archivedAt && (
            <Button variant="secondary" size="sm" onClick={handleRestore}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Restore
            </Button>
          )}
          {canDelete && quotation.status === 'draft' && (
            <Button variant="secondary" size="sm" onClick={handleDelete}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5 text-red-500" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Services */}
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-4">
                Services
              </h2>
              <div className="space-y-3">
                {quotation.services.map((service, index) => (
                  <div
                    key={service.id || index}
                    className="flex items-start justify-between rounded-lg border border-surface-100 dark:border-surface-700 p-4"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-surface-900 dark:text-surface-100">
                        {service.serviceName}
                      </p>
                      {service.description && (
                        <p className="text-sm text-surface-500 mt-1">{service.description}</p>
                      )}
                      {Array.isArray(service.includedTasks) && (service.includedTasks as string[]).length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {(service.includedTasks as string[]).map((task, i) => (
                            <li key={i} className="text-sm text-surface-600 dark:text-surface-400 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary-400" />
                              {task}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <span className="text-lg font-semibold text-surface-900 dark:text-surface-100 ml-4">
                      {formatCurrency(Number(service.price))}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-6 border-t border-surface-100 dark:border-surface-700 pt-4">
                <div className="flex justify-end">
                  <div className="w-full sm:w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-surface-500">Subtotal</span>
                      <span className="font-medium">{formatCurrency(Number(quotation.subtotal))}</span>
                    </div>
                    {Number(quotation.taxRate) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-surface-500">
                          Tax ({(Number(quotation.taxRate) * 100).toFixed(1)}%)
                        </span>
                        <span>{formatCurrency(Number(quotation.taxAmount))}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total</span>
                      <span className="text-primary-600 dark:text-primary-400">
                        {formatCurrency(Number(quotation.totalAmount))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Description & Notes */}
          {(quotation.description || quotation.notes) && (
            <Card>
              <div className="p-6 space-y-4">
                {quotation.description && (
                  <div>
                    <h3 className="text-sm font-medium text-surface-500 mb-1">Description</h3>
                    <p className="text-sm text-surface-900 dark:text-surface-100 whitespace-pre-wrap">
                      {quotation.description}
                    </p>
                  </div>
                )}
                {quotation.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-surface-500 mb-1">Internal Notes</h3>
                    <p className="text-sm text-surface-900 dark:text-surface-100 whitespace-pre-wrap">
                      {quotation.notes}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Terms */}
          {quotation.termsAndConditions && (
            <Card>
              <div className="p-6">
                <h3 className="text-sm font-medium text-surface-500 mb-2">Terms & Conditions</h3>
                <p className="text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap">
                  {quotation.termsAndConditions}
                </p>
              </div>
            </Card>
          )}

          {/* Activity Log */}
          {quotation.activities && quotation.activities.length > 0 && (
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-4">
                  Activity
                </h2>
                <div className="space-y-3">
                  {quotation.activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="mt-0.5 h-2 w-2 rounded-full bg-primary-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-surface-900 dark:text-surface-100">
                          <span className="font-medium">{activity.action.replace(/_/g, ' ')}</span>
                          {activity.performedByUser && (
                            <span className="text-surface-500">
                              {' '}by {activity.performedByUser.fullName}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-surface-400">
                          {formatDateTime(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {quotation.generatedJob && (
            <Card>
              <div className="p-6">
                <h3 className="text-sm font-medium text-surface-500 mb-2">Generated Job</h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/jobs/${quotation.generatedJob!.id}`)}
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  {quotation.generatedJob.jobNumber}
                </Button>
              </div>
            </Card>
          )}
          <Card>
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-surface-500 uppercase tracking-wider">
                Details
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-surface-400" />
                  <div>
                    <p className="text-xs text-surface-500">Account</p>
                    <button
                      onClick={() => navigate(`/accounts/${quotation.account.id}`)}
                      className="text-sm font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400"
                    >
                      {quotation.account.name}
                    </button>
                  </div>
                </div>

                {quotation.facility && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-surface-400" />
                    <div>
                      <p className="text-xs text-surface-500">Facility</p>
                      <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                        {quotation.facility.name}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-surface-400" />
                  <div>
                    <p className="text-xs text-surface-500">Created By</p>
                    <p className="text-sm text-surface-900 dark:text-surface-100">
                      {quotation.createdByUser.fullName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-surface-400" />
                  <div>
                    <p className="text-xs text-surface-500">Created</p>
                    <p className="text-sm text-surface-900 dark:text-surface-100">
                      {formatDate(quotation.createdAt)}
                    </p>
                  </div>
                </div>

                {quotation.validUntil && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-surface-400" />
                    <div>
                      <p className="text-xs text-surface-500">Valid Until</p>
                      <p className="text-sm text-surface-900 dark:text-surface-100">
                        {formatDate(quotation.validUntil)}
                      </p>
                    </div>
                  </div>
                )}

                {quotation.sentAt && (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-surface-400" />
                    <div>
                      <p className="text-xs text-surface-500">Sent</p>
                      <p className="text-sm text-surface-900 dark:text-surface-100">
                        {formatDateTime(quotation.sentAt)}
                      </p>
                    </div>
                  </div>
                )}

                {quotation.viewedAt && (
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-surface-400" />
                    <div>
                      <p className="text-xs text-surface-500">Viewed</p>
                      <p className="text-sm text-surface-900 dark:text-surface-100">
                        {formatDateTime(quotation.viewedAt)}
                      </p>
                    </div>
                  </div>
                )}

                {quotation.acceptedAt && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-xs text-surface-500">Accepted</p>
                      <p className="text-sm text-surface-900 dark:text-surface-100">
                        {formatDateTime(quotation.acceptedAt)}
                        {quotation.signatureName && ` by ${quotation.signatureName}`}
                      </p>
                    </div>
                  </div>
                )}

                {quotation.rejectedAt && (
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="text-xs text-surface-500">Rejected</p>
                      <p className="text-sm text-surface-900 dark:text-surface-100">
                        {formatDateTime(quotation.rejectedAt)}
                      </p>
                      {quotation.rejectionReason && (
                        <p className="text-xs text-surface-500 mt-1">
                          {quotation.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Send Modal */}
      {showSendModal && (
        <Modal
          isOpen={showSendModal}
          title="Send Quotation"
          onClose={() => setShowSendModal(false)}
        >
          <div className="space-y-4">
            <Input
              label="Send to Email"
              type="email"
              value={sendEmailTo}
              onChange={(e) => setSendEmailTo(e.target.value)}
              placeholder="client@example.com"
            />
            <p className="text-sm text-surface-500">
              A public link will be generated and the quotation will be marked as sent.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowSendModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={sending}>
                <Send className="mr-1.5 h-3.5 w-3.5" />
                {sending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <Modal
          isOpen={showRejectModal}
          title="Reject Quotation"
          onClose={() => setShowRejectModal(false)}
        >
          <div className="space-y-4">
            <Textarea
              label="Rejection Reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
              >
                Reject
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default QuotationDetail;
