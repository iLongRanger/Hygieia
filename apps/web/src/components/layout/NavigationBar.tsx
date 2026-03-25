import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface NavigationState {
  backLabel?: string;
  backPath?: string;
}

const NavigationBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as NavigationState | null;

  if (!state?.backPath) return null;

  const label = state.backLabel
    ? `Back to ${state.backLabel}`
    : 'Back';

  return (
    <div className="border-b border-surface-200 bg-surface-50 px-4 dark:border-surface-700 dark:bg-surface-800 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-10 max-w-7xl items-center">
        <button
          type="button"
          onClick={() => navigate(state.backPath!)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-100"
        >
          <ArrowLeft className="h-4 w-4" />
          {label}
        </button>
      </div>
    </div>
  );
};

export default NavigationBar;
