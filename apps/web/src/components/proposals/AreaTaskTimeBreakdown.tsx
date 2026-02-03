import React, { useState, useEffect } from 'react';
import { Clock, ChevronDown, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  getFacilityTaskTimeBreakdown,
  type FacilityTaskTimeBreakdown,
  type AreaTimeBreakdown,
} from '../../lib/facilities';

interface AreaTaskTimeBreakdownProps {
  facilityId: string;
  workerCount: number;
}

const formatMinutes = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes.toFixed(1)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMins.toFixed(0)}m`;
};

const AreaRow: React.FC<{ area: AreaTimeBreakdown }> = ({ area }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-surface-700 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-surface-700/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
          <span className="font-medium text-white truncate">{area.name}</span>
          <span className="text-xs text-gray-400 flex-shrink-0">
            ({area.squareFeet.toLocaleString()} sqft, {area.floorType})
          </span>
        </div>
        <span className="text-sm font-medium text-amber-400 flex-shrink-0 ml-2">
          {formatMinutes(area.totalMinutes)}
        </span>
      </button>

      {expanded && area.tasks.length > 0 && (
        <div className="bg-surface-900/50 border-t border-surface-700">
          {area.tasks.map((task) => (
            <div
              key={task.taskId}
              className="flex items-center justify-between py-2 px-3 pl-9 text-sm"
            >
              <span className="text-gray-300">{task.taskName}</span>
              <span className="text-gray-400 font-mono text-xs">
                {formatMinutes(task.calculatedMinutes)}
              </span>
            </div>
          ))}
        </div>
      )}

      {expanded && area.tasks.length === 0 && (
        <div className="bg-surface-900/50 border-t border-surface-700 py-3 px-3 pl-9 text-sm text-gray-500">
          No tasks assigned to this area
        </div>
      )}
    </div>
  );
};

export const AreaTaskTimeBreakdown: React.FC<AreaTaskTimeBreakdownProps> = ({
  facilityId,
  workerCount,
}) => {
  const [breakdown, setBreakdown] = useState<FacilityTaskTimeBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBreakdown = async () => {
      if (!facilityId) {
        setBreakdown(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await getFacilityTaskTimeBreakdown(facilityId);
        setBreakdown(data);
      } catch (err) {
        console.error('Failed to fetch task time breakdown:', err);
        setError('Failed to load time breakdown');
      } finally {
        setLoading(false);
      }
    };

    fetchBreakdown();
  }, [facilityId]);

  if (loading) {
    return (
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading time breakdown...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!breakdown || breakdown.areas.length === 0) {
    return (
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
        <div className="flex items-center gap-2 text-gray-400">
          <Clock className="w-4 h-4" />
          <span className="text-sm">No tasks configured for this facility</span>
        </div>
      </div>
    );
  }

  const timePerWorker = breakdown.totalMinutes / workerCount;

  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-700 bg-surface-700/30">
        <Clock className="w-4 h-4 text-amber-400" />
        <span className="font-medium text-white text-sm">Estimated Time Breakdown</span>
      </div>

      {/* Area list */}
      <div className="max-h-[300px] overflow-y-auto">
        {breakdown.areas.map((area) => (
          <AreaRow key={area.id} area={area} />
        ))}
      </div>

      {/* Footer with totals */}
      <div className="px-4 py-3 border-t border-surface-700 bg-surface-700/30">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-300">Total per visit:</span>
          <span className="font-semibold text-white">
            {formatMinutes(breakdown.totalMinutes)} ({breakdown.totalHours.toFixed(2)} hours)
          </span>
        </div>
        {workerCount > 1 && (
          <div
            className={cn(
              'flex items-center justify-between text-sm mt-1.5 pt-1.5 border-t border-surface-600'
            )}
          >
            <span className="text-gray-400">
              Workers: <span className="text-white font-medium">{workerCount}</span>
            </span>
            <span className="text-gray-300">
              Time per worker:{' '}
              <span className="font-medium text-amber-400">{formatMinutes(timePerWorker)}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AreaTaskTimeBreakdown;
