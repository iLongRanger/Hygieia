import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  ArrowLeft,
  Play,
  CheckCircle,
  XCircle,
  Edit2,
  Clock,
  Building2,
  User,
  Calendar,
  FileText,
  Minus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  getInspection,
  startInspection,
  completeInspection,
  cancelInspection,
  createReinspection,
  createInspectionCorrectiveAction,
  updateInspectionCorrectiveAction,
  verifyInspectionCorrectiveAction,
  createInspectionSignoff,
  getAreaGuidance,
} from '../../lib/inspections';
import { InspectorGuidance } from '../../components/inspections/InspectorGuidance';
import type {
  InspectionDetail as InspectionDetailType,
  InspectionItem,
  InspectionStatus,
  InspectionScore,
  InspectionCorrectiveActionSeverity,
  InspectionCorrectiveActionStatus,
  InspectionSignerType,
} from '../../types/inspection';

const getStatusVariant = (status: InspectionStatus): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  const map: Record<InspectionStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    scheduled: 'info',
    in_progress: 'warning',
    completed: 'success',
    canceled: 'error',
  };
  return map[status];
};

const getRatingColor = (rating: string | null) => {
  if (!rating) return 'text-surface-400';
  if (rating === 'excellent') return 'text-green-600 dark:text-green-400';
  if (rating === 'good') return 'text-blue-600 dark:text-blue-400';
  if (rating === 'fair') return 'text-yellow-600 dark:text-yellow-400';
  if (rating === 'poor') return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
};

const getActionStatusVariant = (
  status: InspectionCorrectiveActionStatus
): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  if (status === 'verified') return 'success';
  if (status === 'resolved') return 'info';
  if (status === 'in_progress') return 'warning';
  if (status === 'canceled') return 'default';
  return 'error';
};

const getSeverityVariant = (
  severity: InspectionCorrectiveActionSeverity
): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  if (severity === 'critical') return 'error';
  if (severity === 'major') return 'warning';
  return 'info';
};

const InspectionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inspection, setInspection] = useState<InspectionDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [itemScores, setItemScores] = useState<Record<string, { score: InspectionScore; rating: number | null; notes: string }>>({});
  const [completionSummary, setCompletionSummary] = useState('');
  const [actionSaving, setActionSaving] = useState(false);
  const [signoffSaving, setSignoffSaving] = useState(false);
  const [reinspectionSaving, setReinspectionSaving] = useState(false);
  const [newAction, setNewAction] = useState<{
    title: string;
    description: string;
    severity: InspectionCorrectiveActionSeverity;
    dueDate: string;
  }>({
    title: '',
    description: '',
    severity: 'major',
    dueDate: '',
  });
  const [areaGuidance, setAreaGuidance] = useState<Record<string, string[]>>({});

  const [signoffForm, setSignoffForm] = useState<{
    signerType: InspectionSignerType;
    signerName: string;
    signerTitle: string;
    comments: string;
  }>({
    signerType: 'supervisor',
    signerName: '',
    signerTitle: '',
    comments: '',
  });

  const fetchInspection = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getInspection(id);
      setInspection(data);
      // Initialize item scores from existing data
      const scores: Record<string, { score: InspectionScore; rating: number | null; notes: string }> = {};
      data.items.forEach((item) => {
        scores[item.id] = {
          score: item.score || 'pass',
          rating: item.rating,
          notes: item.notes || '',
        };
      });
      setItemScores(scores);
    } catch {
      toast.error('Failed to load inspection');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInspection();
  }, [fetchInspection]);

  // Fetch area guidance when entering completion mode
  useEffect(() => {
    if (!completing || !inspection) return;
    const categories = [...new Set(inspection.items.map((item) => item.category))];
    if (categories.length === 0) return;
    getAreaGuidance(categories)
      .then(setAreaGuidance)
      .catch(() => {
        // Guidance is non-critical — silently fail
      });
  }, [completing, inspection]);

  const handleStart = async () => {
    if (!id) return;
    try {
      const data = await startInspection(id);
      setInspection(data);
      toast.success('Inspection started');
    } catch {
      toast.error('Failed to start inspection');
    }
  };

  const handleComplete = async () => {
    if (!id || !inspection) return;
    try {
      const items = inspection.items.map((item) => ({
        id: item.id,
        score: itemScores[item.id]?.score || ('pass' as InspectionScore),
        rating: itemScores[item.id]?.rating || null,
        notes: itemScores[item.id]?.notes || null,
      }));
      const data = await completeInspection(id, {
        summary: completionSummary || null,
        items,
      });
      setInspection(data);
      setCompleting(false);
      toast.success(`Inspection completed — Score: ${data.overallScore ? parseFloat(data.overallScore).toFixed(0) : 0}%`);
    } catch {
      toast.error('Failed to complete inspection');
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    try {
      const data = await cancelInspection(id);
      setInspection(data);
      toast.success('Inspection canceled');
    } catch {
      toast.error('Failed to cancel inspection');
    }
  };

  const handleCreateAction = async () => {
    if (!id || !newAction.title.trim()) {
      toast.error('Action title is required');
      return;
    }
    try {
      setActionSaving(true);
      await createInspectionCorrectiveAction(id, {
        title: newAction.title.trim(),
        description: newAction.description.trim() || null,
        severity: newAction.severity,
        dueDate: newAction.dueDate || null,
      });
      setNewAction({ title: '', description: '', severity: 'major', dueDate: '' });
      await fetchInspection();
      toast.success('Corrective action created');
    } catch {
      toast.error('Failed to create corrective action');
    } finally {
      setActionSaving(false);
    }
  };

  const handleUpdateActionStatus = async (actionId: string, status: InspectionCorrectiveActionStatus) => {
    if (!id) return;
    try {
      if (status === 'verified') {
        await verifyInspectionCorrectiveAction(id, actionId);
      } else {
        await updateInspectionCorrectiveAction(id, actionId, { status });
      }
      await fetchInspection();
      toast.success('Corrective action updated');
    } catch {
      toast.error('Failed to update corrective action');
    }
  };

  const handleCreateSignoff = async () => {
    if (!id || !signoffForm.signerName.trim()) {
      toast.error('Signer name is required');
      return;
    }
    try {
      setSignoffSaving(true);
      await createInspectionSignoff(id, {
        signerType: signoffForm.signerType,
        signerName: signoffForm.signerName.trim(),
        signerTitle: signoffForm.signerTitle.trim() || null,
        comments: signoffForm.comments.trim() || null,
      });
      setSignoffForm({
        signerType: 'supervisor',
        signerName: '',
        signerTitle: '',
        comments: '',
      });
      await fetchInspection();
      toast.success('Signoff added');
    } catch {
      toast.error('Failed to add signoff');
    } finally {
      setSignoffSaving(false);
    }
  };

  const handleCreateReinspection = async () => {
    if (!id) return;
    try {
      setReinspectionSaving(true);
      const reinspection = await createReinspection(id, {});
      toast.success(`Reinspection ${reinspection.inspectionNumber} created`);
      navigate(`/inspections/${reinspection.id}`);
    } catch {
      toast.error('Failed to create reinspection');
    } finally {
      setReinspectionSaving(false);
    }
  };

  const updateAreaScores = (
    items: InspectionItem[],
    field: 'score' | 'rating' | 'notes',
    value: InspectionScore | number | string | null
  ) => {
    setItemScores((prev) => {
      const next = { ...prev };
      for (const item of items) {
        next[item.id] = {
          ...next[item.id],
          [field]: value,
        };
      }
      return next;
    });
  };

  const getAreaAggregate = (items: InspectionItem[]) => {
    const scores = items.map((item) => itemScores[item.id]?.score).filter(Boolean) as InspectionScore[];
    const ratings = items
      .map((item) => itemScores[item.id]?.rating)
      .filter((rating): rating is number => rating !== null && rating !== undefined);
    const notes = items
      .map((item) => itemScores[item.id]?.notes)
      .find((note) => Boolean(note)) || '';

    let score: InspectionScore | null = null;
    if (scores.includes('fail')) score = 'fail';
    else if (scores.includes('pass')) score = 'pass';
    else if (scores.includes('na')) score = 'na';

    const rating =
      ratings.length > 0 ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10 : null;

    return { score, rating, notes };
  };

  // Group items by category
  const groupedItems = inspection?.items.reduce<Record<string, InspectionItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {}) ?? {};

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 skeleton rounded" />
        <div className="h-48 skeleton rounded-xl" />
        <div className="h-96 skeleton rounded-xl" />
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="text-center py-16">
        <p className="text-surface-500">Inspection not found</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/inspections')}>
          Back to Inspections
        </Button>
      </div>
    );
  }

  const isEditable = inspection.status === 'scheduled' || inspection.status === 'in_progress';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/inspections')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="rounded-lg bg-primary-100 p-2.5 dark:bg-primary-900/30">
            <ClipboardCheck className="h-5 w-5 text-primary-700 dark:text-primary-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                {inspection.inspectionNumber}
              </h1>
              <Badge variant={getStatusVariant(inspection.status)}>
                {inspection.status.replace('_', ' ')}
              </Badge>
            </div>
            {inspection.template && (
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Template: {inspection.template.name}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditable && (
            <Button variant="secondary" size="sm" onClick={() => navigate(`/inspections/${id}/edit`)}>
              <Edit2 className="mr-1.5 h-4 w-4" />
              Edit
            </Button>
          )}
          {inspection.status === 'scheduled' && (
            <Button size="sm" onClick={handleStart}>
              <Play className="mr-1.5 h-4 w-4" />
              Start
            </Button>
          )}
          {isEditable && !completing && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCompleting(true)}
            >
              <CheckCircle className="mr-1.5 h-4 w-4" />
              Complete
            </Button>
          )}
          {inspection.status === 'completed' && inspection.items.some((item) => item.score === 'fail') && (
            <Button variant="secondary" size="sm" onClick={handleCreateReinspection} isLoading={reinspectionSaving}>
              Reinspect Failed Items
            </Button>
          )}
          {isEditable && (
            <Button variant="danger" size="sm" onClick={handleCancel}>
              <XCircle className="mr-1.5 h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400">Details</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-surface-400" />
                <span className="text-surface-700 dark:text-surface-300">{inspection.facility.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-surface-400" />
                <span className="text-surface-700 dark:text-surface-300">{inspection.inspectorUser.fullName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-surface-400" />
                <span className="text-surface-700 dark:text-surface-300">
                  {new Date(inspection.scheduledDate).toLocaleDateString()}
                </span>
              </div>
              {inspection.job && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-surface-400" />
                  <button
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                    onClick={() => navigate(`/jobs/${inspection.jobId}`)}
                  >
                    Job {inspection.job.jobNumber}
                  </button>
                </div>
              )}
              {inspection.appointment && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-surface-400" />
                  <button
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                    onClick={() => navigate(`/appointments/${inspection.appointment!.id}`)}
                  >
                    Linked Appointment
                  </button>
                  <Badge variant="info" className="text-xs">
                    {inspection.appointment.status}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400">Score</h3>
            {inspection.overallScore ? (
              <div className="text-center">
                <p className={`text-4xl font-bold ${getRatingColor(inspection.overallRating)}`}>
                  {parseFloat(inspection.overallScore).toFixed(0)}%
                </p>
                {inspection.overallRating && (
                  <p className={`text-sm font-medium capitalize mt-1 ${getRatingColor(inspection.overallRating)}`}>
                    {inspection.overallRating}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-center text-surface-400 text-sm">Not yet scored</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-500">Items</span>
                <span className="font-medium text-surface-700 dark:text-surface-300">{inspection.items.length}</span>
              </div>
              {inspection.status === 'completed' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-surface-500">Passed</span>
                    <span className="font-medium text-green-600">
                      {inspection.items.filter((i) => i.score === 'pass').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-500">Failed</span>
                    <span className="font-medium text-red-600">
                      {inspection.items.filter((i) => i.score === 'fail').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-500">N/A</span>
                    <span className="font-medium text-surface-400">
                      {inspection.items.filter((i) => i.score === 'na').length}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Notes */}
      {inspection.notes && (
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-2">Notes</h3>
            <p className="text-sm text-surface-700 dark:text-surface-300">{inspection.notes}</p>
          </div>
        </Card>
      )}
      {inspection.summary && (
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-2">Summary</h3>
            <p className="text-sm text-surface-700 dark:text-surface-300">{inspection.summary}</p>
          </div>
        </Card>
      )}

      {/* Completion form */}
      {completing && (
        <Card>
          <div className="p-4 space-y-4 border-2 border-primary-200 dark:border-primary-800 rounded-xl">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50">Complete Inspection</h3>
            <p className="text-sm text-surface-500">Score each area below using Hygieia Standard, then click Submit.</p>

            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="space-y-2">
                <h4 className="text-sm font-semibold text-surface-700 dark:text-surface-300 border-b border-surface-200 dark:border-surface-700 pb-1">
                  {category}
                </h4>
                {(() => {
                  const areaState = getAreaAggregate(items);
                  return (
                    <>
                      <div className="flex flex-wrap items-center gap-3 py-2 px-2 rounded hover:bg-surface-50 dark:hover:bg-surface-800/50">
                        <span className="flex-1 min-w-[240px] text-sm text-surface-700 dark:text-surface-300">
                          Hygieia Standard: clean, maintained, stocked, and safe.
                        </span>
                        <div className="flex items-center gap-1">
                          {(['pass', 'fail', 'na'] as InspectionScore[]).map((score) => (
                            <button
                              key={score}
                              onClick={() => updateAreaScores(items, 'score', score)}
                              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                areaState.score === score
                                  ? score === 'pass'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : score === 'fail'
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                      : 'bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-400'
                                  : 'bg-surface-100 text-surface-500 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-500 dark:hover:bg-surface-700'
                              }`}
                            >
                              {score.toUpperCase()}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((r) => (
                            <button
                              key={r}
                              onClick={() =>
                                updateAreaScores(items, 'rating', areaState.rating === r ? null : r)
                              }
                              className={`w-7 h-7 text-xs font-medium rounded-full transition-colors ${
                                areaState.rating === r
                                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                                  : 'bg-surface-100 text-surface-500 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700'
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Inspector guidance accordion */}
                      {areaGuidance[category] && areaGuidance[category].length > 0 && (
                        <div className="mt-2 px-2">
                          <InspectorGuidance
                            category={category}
                            guidanceItems={areaGuidance[category]}
                          />
                        </div>
                      )}
                      {/* Per-area notes */}
                      <div className="mt-2 px-2">
                        <textarea
                          className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
                          rows={2}
                          value={areaState.notes}
                          onChange={(e) => updateAreaScores(items, 'notes', e.target.value)}
                          placeholder={`Notes for ${category}...`}
                        />
                      </div>
                      {/* TODO: Add PhotoUploader component here for per-area photo capture (Cloudflare R2) */}
                    </>
                  );
                })()}
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Summary
              </label>
              <textarea
                className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
                rows={3}
                value={completionSummary}
                onChange={(e) => setCompletionSummary(e.target.value)}
                placeholder="Overall inspection summary..."
              />
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleComplete}>
                <CheckCircle className="mr-1.5 h-4 w-4" />
                Submit
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setCompleting(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Area checklist (read-only when completed) */}
      {!completing && inspection.items.length > 0 && (
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50 mb-4">
              Hygieia Area Checklist ({Object.keys(groupedItems).length} areas)
            </h3>
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="mb-4">
                <h4 className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">
                  {category}
                </h4>
                <div className="space-y-1">
                  {(() => {
                    const areaState = getAreaAggregate(items);
                    return (
                      <>
                        <div className="flex items-center justify-between py-2 px-3 rounded hover:bg-surface-50 dark:hover:bg-surface-800/50">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {areaState.score === 'pass' ? (
                              <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                            ) : areaState.score === 'fail' ? (
                              <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                            ) : areaState.score === 'na' ? (
                              <Minus className="h-4 w-4 shrink-0 text-surface-400" />
                            ) : (
                              <Clock className="h-4 w-4 shrink-0 text-surface-400" />
                            )}
                            <span className="text-sm text-surface-700 dark:text-surface-300 truncate">
                              Hygieia Standard area check
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {areaState.rating && (
                              <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                                {areaState.rating}/5
                              </span>
                            )}
                          </div>
                        </div>
                        {areaState.notes && (
                          <div className="mt-1 px-3 py-1.5 bg-surface-50 dark:bg-surface-800/40 rounded text-xs text-surface-600 dark:text-surface-400">
                            {areaState.notes}
                          </div>
                        )}
                        {/* TODO: Show photo thumbnails here when photo upload is implemented */}
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Corrective actions */}
      <Card>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
              Corrective Actions ({inspection.correctiveActions.length})
            </h3>
            {inspection.overallScore && (
              <span className="text-xs text-surface-500 dark:text-surface-400">
                Open: {inspection.correctiveActions.filter((action) => action.status === 'open' || action.status === 'in_progress').length}
              </span>
            )}
          </div>

          {inspection.status !== 'canceled' && (
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-surface-200 p-3 dark:border-surface-700 md:grid-cols-4">
              <input
                type="text"
                value={newAction.title}
                onChange={(e) => setNewAction((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Action title"
                className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 md:col-span-2"
              />
              <select
                value={newAction.severity}
                onChange={(e) =>
                  setNewAction((prev) => ({ ...prev, severity: e.target.value as InspectionCorrectiveActionSeverity }))
                }
                className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
              >
                <option value="critical">Critical</option>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
              </select>
              <input
                type="date"
                value={newAction.dueDate}
                onChange={(e) => setNewAction((prev) => ({ ...prev, dueDate: e.target.value }))}
                className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
              />
              <textarea
                value={newAction.description}
                onChange={(e) => setNewAction((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Description (optional)"
                rows={2}
                className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 md:col-span-3"
              />
              <div className="flex items-end justify-end">
                <Button size="sm" onClick={handleCreateAction} isLoading={actionSaving}>
                  Add Action
                </Button>
              </div>
            </div>
          )}

          {inspection.correctiveActions.length === 0 ? (
            <p className="text-sm text-surface-400">No corrective actions</p>
          ) : (
            <div className="space-y-2">
              {inspection.correctiveActions.map((action) => (
                <div key={action.id} className="rounded-lg border border-surface-200 p-3 dark:border-surface-700">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-surface-800 dark:text-surface-100">{action.title}</p>
                      {action.description && (
                        <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">{action.description}</p>
                      )}
                      {action.inspectionItem && (
                        <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                          Item: {action.inspectionItem.category} - {action.inspectionItem.itemText}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityVariant(action.severity)} size="sm">
                        {action.severity}
                      </Badge>
                      <Badge variant={getActionStatusVariant(action.status)} size="sm">
                        {action.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-surface-500 dark:text-surface-400">
                      Due: {action.dueDate ? new Date(action.dueDate).toLocaleDateString() : 'No due date'}
                    </div>
                    <div className="flex items-center gap-2">
                      {action.status === 'open' && (
                        <Button size="sm" variant="secondary" onClick={() => handleUpdateActionStatus(action.id, 'in_progress')}>
                          Start
                        </Button>
                      )}
                      {action.status === 'in_progress' && (
                        <Button size="sm" variant="secondary" onClick={() => handleUpdateActionStatus(action.id, 'resolved')}>
                          Resolve
                        </Button>
                      )}
                      {action.status === 'resolved' && (
                        <Button size="sm" onClick={() => handleUpdateActionStatus(action.id, 'verified')}>
                          Verify
                        </Button>
                      )}
                      {(action.status === 'resolved' || action.status === 'verified' || action.status === 'canceled') && (
                        <Button size="sm" variant="ghost" onClick={() => handleUpdateActionStatus(action.id, 'open')}>
                          Reopen
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Signoffs */}
      <Card>
        <div className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
            Signoffs ({inspection.signoffs.length})
          </h3>

          {inspection.status === 'completed' && (
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-surface-200 p-3 dark:border-surface-700 md:grid-cols-4">
              <select
                value={signoffForm.signerType}
                onChange={(e) => setSignoffForm((prev) => ({ ...prev, signerType: e.target.value as InspectionSignerType }))}
                className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
              >
                <option value="supervisor">Supervisor</option>
                <option value="client">Client</option>
              </select>
              <input
                type="text"
                value={signoffForm.signerName}
                onChange={(e) => setSignoffForm((prev) => ({ ...prev, signerName: e.target.value }))}
                placeholder="Signer name"
                className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
              />
              <input
                type="text"
                value={signoffForm.signerTitle}
                onChange={(e) => setSignoffForm((prev) => ({ ...prev, signerTitle: e.target.value }))}
                placeholder="Signer title (optional)"
                className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
              />
              <div className="flex items-end justify-end">
                <Button size="sm" onClick={handleCreateSignoff} isLoading={signoffSaving}>
                  Add Signoff
                </Button>
              </div>
              <textarea
                value={signoffForm.comments}
                onChange={(e) => setSignoffForm((prev) => ({ ...prev, comments: e.target.value }))}
                placeholder="Comments (optional)"
                rows={2}
                className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 md:col-span-4"
              />
            </div>
          )}

          {inspection.signoffs.length === 0 ? (
            <p className="text-sm text-surface-400">No signoffs recorded</p>
          ) : (
            <div className="space-y-2">
              {inspection.signoffs.map((signoff) => (
                <div key={signoff.id} className="rounded-lg border border-surface-200 p-3 dark:border-surface-700">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-surface-800 dark:text-surface-100">{signoff.signerName}</p>
                      <p className="text-xs text-surface-500 dark:text-surface-400">
                        {signoff.signerType} {signoff.signerTitle ? `- ${signoff.signerTitle}` : ''}
                      </p>
                    </div>
                    <span className="text-xs text-surface-500 dark:text-surface-400">
                      {new Date(signoff.signedAt).toLocaleString()}
                    </span>
                  </div>
                  {signoff.comments && (
                    <p className="mt-2 text-xs text-surface-600 dark:text-surface-300">{signoff.comments}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Activity timeline */}
      {inspection.activities.length > 0 && (
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50 mb-4">
              Activity
            </h3>
            <div className="space-y-3">
              {inspection.activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-surface-300 dark:bg-surface-600 shrink-0" />
                  <div>
                    <p className="text-sm text-surface-700 dark:text-surface-300">
                      <span className="font-medium">{activity.performedByUser?.fullName || 'System'}</span>
                      {' '}{activity.action.replace('_', ' ')} this inspection
                    </p>
                    <p className="text-xs text-surface-400 dark:text-surface-500">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default InspectionDetail;
