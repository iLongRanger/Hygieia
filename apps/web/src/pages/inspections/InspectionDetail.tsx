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
} from '../../lib/inspections';
import type { InspectionDetail as InspectionDetailType, InspectionItem, InspectionStatus, InspectionScore } from '../../types/inspection';

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

const InspectionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inspection, setInspection] = useState<InspectionDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [itemScores, setItemScores] = useState<Record<string, { score: InspectionScore; rating: number | null; notes: string }>>({});
  const [completionSummary, setCompletionSummary] = useState('');

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

  const updateItemScore = (itemId: string, field: string, value: InspectionScore | number | string | null) => {
    setItemScores((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
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
            <p className="text-sm text-surface-500">Score each item below then click Submit.</p>

            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="space-y-2">
                <h4 className="text-sm font-semibold text-surface-700 dark:text-surface-300 border-b border-surface-200 dark:border-surface-700 pb-1">
                  {category}
                </h4>
                {items.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center gap-3 py-2 px-2 rounded hover:bg-surface-50 dark:hover:bg-surface-800/50">
                    <span className="flex-1 min-w-[200px] text-sm text-surface-700 dark:text-surface-300">
                      {item.itemText}
                    </span>
                    <div className="flex items-center gap-1">
                      {(['pass', 'fail', 'na'] as InspectionScore[]).map((score) => (
                        <button
                          key={score}
                          onClick={() => updateItemScore(item.id, 'score', score)}
                          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                            itemScores[item.id]?.score === score
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
                            updateItemScore(item.id, 'rating', itemScores[item.id]?.rating === r ? null : r)
                          }
                          className={`w-7 h-7 text-xs font-medium rounded-full transition-colors ${
                            itemScores[item.id]?.rating === r
                              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                              : 'bg-surface-100 text-surface-500 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
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

      {/* Checklist items (read-only when completed) */}
      {!completing && inspection.items.length > 0 && (
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50 mb-4">
              Checklist Items ({inspection.items.length})
            </h3>
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="mb-4">
                <h4 className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">
                  {category}
                </h4>
                <div className="space-y-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 px-3 rounded hover:bg-surface-50 dark:hover:bg-surface-800/50"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {item.score === 'pass' ? (
                          <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                        ) : item.score === 'fail' ? (
                          <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                        ) : item.score === 'na' ? (
                          <Minus className="h-4 w-4 shrink-0 text-surface-400" />
                        ) : (
                          <Clock className="h-4 w-4 shrink-0 text-surface-400" />
                        )}
                        <span className="text-sm text-surface-700 dark:text-surface-300 truncate">
                          {item.itemText}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.rating && (
                          <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                            {item.rating}/5
                          </span>
                        )}
                        {item.notes && (
                          <span className="text-xs text-surface-400 truncate max-w-[120px]" title={item.notes}>
                            {item.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

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
