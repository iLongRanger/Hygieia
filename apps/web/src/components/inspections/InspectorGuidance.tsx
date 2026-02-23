import React, { useState } from 'react';
import { ChevronDown, ChevronRight, ClipboardCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

interface InspectorGuidanceProps {
  category: string;
  guidanceItems: string[];
}

export const InspectorGuidance: React.FC<InspectorGuidanceProps> = ({
  category,
  guidanceItems,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  if (guidanceItems.length === 0) return null;

  const toggleItem = (index: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="border border-surface-600 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-2 px-3 bg-surface-800/50 hover:bg-surface-700/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-sm">
          <ClipboardCheck className="w-4 h-4 text-brand-400" />
          <span className="text-gray-300">What to check</span>
          <span className="text-xs text-gray-500">
            ({checked.size}/{guidanceItems.length})
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {expanded && (
        <div className="px-3 py-2 space-y-1 bg-surface-800/30">
          {guidanceItems.map((item, index) => (
            <label
              key={index}
              className="flex items-center gap-2 py-1 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={checked.has(index)}
                onChange={() => toggleItem(index)}
                className="rounded border-surface-500 text-brand-500 focus:ring-brand-500 focus:ring-offset-0 bg-surface-700"
              />
              <span
                className={cn(
                  'text-sm transition-colors',
                  checked.has(index)
                    ? 'text-gray-500 line-through'
                    : 'text-gray-300 group-hover:text-gray-200'
                )}
              >
                {item}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};
