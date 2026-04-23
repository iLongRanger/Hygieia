import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';

export interface JourneyAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface JourneyStepperProps {
  title: string;
  description?: string;
  stages: readonly { id: string; label: string }[];
  currentStageId: string | null;
  isLost?: boolean;
  lostLabel?: string;
  nextStep: string;
  primaryAction?: JourneyAction;
  secondaryActions?: JourneyAction[];
  tertiaryAction?: JourneyAction;
  propertySwitcher?: ReactNode;
}

export function AccountJourneyStepper({
  title,
  description,
  stages,
  currentStageId,
  isLost,
  lostLabel,
  nextStep,
  primaryAction,
  secondaryActions = [],
  tertiaryAction,
  propertySwitcher,
}: JourneyStepperProps) {
  const currentIndex = currentStageId
    ? stages.findIndex((stage) => stage.id === currentStageId)
    : -1;

  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">{description}</p>
          ) : null}
        </div>
        {propertySwitcher}
      </div>

      <StepperRail stages={stages} currentIndex={currentIndex} isLost={Boolean(isLost)} />

      <div
        className={cn(
          'rounded-xl border p-4',
          isLost
            ? 'border-warning-200 bg-warning-50/60 dark:border-warning-800 dark:bg-warning-900/20'
            : 'border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-900/40'
        )}
      >
        <div className="text-xs uppercase tracking-wide text-surface-500">
          {isLost ? lostLabel || 'Needs attention' : 'Next step'}
        </div>
        <p className="mt-1 text-sm text-surface-900 dark:text-surface-100">{nextStep}</p>
        {(primaryAction || secondaryActions.length > 0 || tertiaryAction) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {primaryAction && (
              <Button size="sm" onClick={primaryAction.onClick} disabled={primaryAction.disabled}>
                {primaryAction.label}
              </Button>
            )}
            {secondaryActions.map((action) => (
              <Button
                key={action.label}
                size="sm"
                variant="outline"
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.label}
              </Button>
            ))}
            {tertiaryAction && (
              <button
                type="button"
                onClick={tertiaryAction.onClick}
                className="ml-auto text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                {tertiaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

interface StepperRailProps {
  stages: readonly { id: string; label: string }[];
  currentIndex: number;
  isLost: boolean;
}

function StepperRail({ stages, currentIndex, isLost }: StepperRailProps) {
  return (
    <>
      <ol className="hidden gap-1 sm:grid" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
        {stages.map((stage, index) => {
          const state = getStepState(index, currentIndex, isLost);
          return (
            <li key={stage.id} className="flex flex-col items-center text-center">
              <div className="flex w-full items-center">
                <span
                  className={cn(
                    'h-0.5 flex-1',
                    index === 0 ? 'bg-transparent' : getConnectorClass(state, getStepState(index - 1, currentIndex, isLost))
                  )}
                />
                <StepDot state={state} index={index} />
                <span
                  className={cn(
                    'h-0.5 flex-1',
                    index === stages.length - 1
                      ? 'bg-transparent'
                      : getConnectorClass(state, getStepState(index + 1, currentIndex, isLost))
                  )}
                />
              </div>
              <span
                className={cn(
                  'mt-2 text-xs font-medium leading-tight',
                  state === 'current' ? 'text-primary-600 dark:text-primary-300' : '',
                  state === 'complete' ? 'text-surface-900 dark:text-surface-100' : '',
                  state === 'upcoming' ? 'text-surface-500 dark:text-surface-400' : '',
                  state === 'lost' ? 'text-warning-700 dark:text-warning-400' : ''
                )}
              >
                {stage.label}
              </span>
            </li>
          );
        })}
      </ol>

      <ol className="flex flex-col gap-0 sm:hidden">
        {stages.map((stage, index) => {
          const state = getStepState(index, currentIndex, isLost);
          const isLast = index === stages.length - 1;
          return (
            <li key={stage.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <StepDot state={state} index={index} />
                {!isLast && (
                  <span
                    className={cn(
                      'w-0.5 flex-1 min-h-[1.5rem]',
                      getConnectorClass(state, getStepState(index + 1, currentIndex, isLost))
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  'pb-4 text-sm',
                  state === 'current' ? 'font-semibold text-primary-600 dark:text-primary-300' : '',
                  state === 'complete' ? 'text-surface-900 dark:text-surface-100' : '',
                  state === 'upcoming' ? 'text-surface-500 dark:text-surface-400' : '',
                  state === 'lost' ? 'font-semibold text-warning-700 dark:text-warning-400' : ''
                )}
              >
                {stage.label}
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

type StepState = 'complete' | 'current' | 'upcoming' | 'lost';

function getStepState(index: number, currentIndex: number, isLost: boolean): StepState {
  if (currentIndex < 0) {
    return 'upcoming';
  }
  if (index < currentIndex) return 'complete';
  if (index === currentIndex) return isLost ? 'lost' : 'current';
  return 'upcoming';
}

function getConnectorClass(a: StepState, b: StepState) {
  const bothReached = (state: StepState) => state === 'complete' || state === 'current' || state === 'lost';
  if (bothReached(a) && bothReached(b)) {
    if (a === 'lost' || b === 'lost') {
      return 'bg-warning-400/70 dark:bg-warning-500/60';
    }
    return 'bg-primary-500 dark:bg-primary-500';
  }
  if (bothReached(a) || bothReached(b)) {
    if (a === 'lost' || b === 'lost') {
      return 'bg-warning-300/70 dark:bg-warning-700/50';
    }
    return 'bg-gradient-to-r from-primary-500 to-surface-300 dark:to-surface-700';
  }
  return 'bg-surface-200 dark:bg-surface-700';
}

function StepDot({ state, index }: { state: StepState; index: number }) {
  const base = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold';
  if (state === 'complete') {
    return (
      <span className={cn(base, 'border-primary-500 bg-primary-500 text-white')}>
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (state === 'current') {
    return (
      <span
        className={cn(
          base,
          'border-primary-500 bg-white text-primary-600 ring-4 ring-primary-100 dark:bg-surface-900 dark:text-primary-300 dark:ring-primary-900/40'
        )}
      >
        {index + 1}
      </span>
    );
  }
  if (state === 'lost') {
    return (
      <span
        className={cn(
          base,
          'border-warning-500 bg-white text-warning-700 ring-4 ring-warning-100 dark:bg-surface-900 dark:text-warning-400 dark:ring-warning-900/40'
        )}
      >
        !
      </span>
    );
  }
  return (
    <span
      className={cn(
        base,
        'border-surface-300 bg-white text-surface-400 dark:border-surface-600 dark:bg-surface-900 dark:text-surface-500'
      )}
    >
      {index + 1}
    </span>
  );
}
