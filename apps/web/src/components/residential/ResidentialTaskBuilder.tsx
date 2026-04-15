import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface Props {
  label: string;
  hint?: string;
  tasks: string[];
  onChange: (tasks: string[]) => void;
  placeholder?: string;
}

function normalizeTaskLabel(value: string) {
  return value.trim();
}

export default function ResidentialTaskBuilder({
  label,
  hint,
  tasks,
  onChange,
  placeholder = 'Add a cleaning task',
}: Props) {
  const [draft, setDraft] = useState('');

  const addTask = () => {
    const normalized = normalizeTaskLabel(draft);
    if (!normalized) {
      return;
    }

    if (tasks.some((task) => task.toLowerCase() === normalized.toLowerCase())) {
      setDraft('');
      return;
    }

    onChange([...tasks, normalized]);
    setDraft('');
  };

  const removeTask = (taskToRemove: string) => {
    onChange(tasks.filter((task) => task !== taskToRemove));
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-medium text-surface-900 dark:text-surface-100">{label}</div>
        {hint ? (
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{hint}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="Task"
            value={draft}
            placeholder={placeholder}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addTask();
              }
            }}
          />
        </div>
        <Button type="button" onClick={addTask} className="sm:mb-1">
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>

      {tasks.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tasks.map((task) => (
            <span
              key={task}
              className="inline-flex items-center gap-2 rounded-full border border-surface-200 bg-surface-50 px-3 py-1 text-sm text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
            >
              {task}
              <button
                type="button"
                aria-label={`Remove ${task}`}
                className="text-surface-400 transition hover:text-error-500"
                onClick={() => removeTask(task)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-surface-300 px-4 py-3 text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">
          No tasks added yet.
        </div>
      )}
    </div>
  );
}
