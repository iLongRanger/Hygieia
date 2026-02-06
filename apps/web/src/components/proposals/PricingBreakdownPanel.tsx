import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  TrendingUp,
  Layers,
} from 'lucide-react';
import type { FacilityPricingResult, AreaCostBreakdown } from '../../lib/pricing';

interface PricingBreakdownPanelProps {
  pricing: FacilityPricingResult;
}

const fmt = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

const MultiplierBadge: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  if (value === 1) return null;
  const isIncrease = value > 1;
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-mono ${
        isIncrease
          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
      }`}
    >
      {label} {value.toFixed(2)}x
    </span>
  );
};

const AreaBreakdownRow: React.FC<{ area: AreaCostBreakdown }> = ({ area }) => {
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
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          )}
          <span className="font-medium text-white text-sm truncate">{area.areaName}</span>
          <span className="text-xs text-gray-500 flex-shrink-0">
            {area.squareFeet.toLocaleString()} sqft
          </span>
        </div>
        <span className="text-sm font-medium text-white flex-shrink-0 ml-2">
          {fmt(area.monthlyPrice)}
        </span>
      </button>

      {expanded && (
        <div className="bg-surface-900/50 border-t border-surface-700 px-3 py-3 pl-8 space-y-2 text-xs">
          {/* Multipliers */}
          <div className="flex flex-wrap gap-1.5 pb-2 border-b border-surface-700">
            <span className="text-gray-500 text-xs">Multipliers:</span>
            <MultiplierBadge label="Floor" value={area.floorMultiplier} />
            <MultiplierBadge label="Cond." value={area.conditionMultiplier} />
            {area.floorMultiplier === 1 && area.conditionMultiplier === 1 && (
              <span className="text-gray-500 text-xs italic">none applied</span>
            )}
          </div>

          {/* Labor */}
          <div>
            <div className="text-gray-400 font-medium mb-1">Labor</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-gray-300">
              <span>Hours:</span>
              <span className="text-right font-mono">{area.laborHours.toFixed(2)} hrs</span>
              <span>Base Cost:</span>
              <span className="text-right font-mono">{fmt(area.laborCostBase)}</span>
              <span>Burden:</span>
              <span className="text-right font-mono">{fmt(area.laborBurden)}</span>
              <span className="font-medium text-white">Total Labor:</span>
              <span className="text-right font-mono font-medium text-white">{fmt(area.totalLaborCost)}</span>
            </div>
          </div>

          {/* Overhead */}
          <div>
            <div className="text-gray-400 font-medium mb-1">Overhead</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-gray-300">
              <span>Insurance:</span>
              <span className="text-right font-mono">{fmt(area.insuranceCost)}</span>
              <span>Admin:</span>
              <span className="text-right font-mono">{fmt(area.adminOverheadCost)}</span>
              <span>Equipment:</span>
              <span className="text-right font-mono">{fmt(area.equipmentCost)}</span>
            </div>
          </div>

          {/* Supplies */}
          <div className="grid grid-cols-2 gap-x-4 text-gray-300">
            <span>Supplies:</span>
            <span className="text-right font-mono">{fmt(area.supplyCost)}</span>
          </div>

          {/* Per-visit / Monthly */}
          <div className="pt-2 border-t border-surface-700">
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-gray-300">
              <span>Cost/Visit:</span>
              <span className="text-right font-mono">{fmt(area.totalCostPerVisit)}</span>
              <span>Price/Visit:</span>
              <span className="text-right font-mono">{fmt(area.pricePerVisit)}</span>
              <span>Visits/Month:</span>
              <span className="text-right font-mono">{area.monthlyVisits}</span>
              <span className="font-medium text-white">Monthly:</span>
              <span className="text-right font-mono font-medium text-white">{fmt(area.monthlyPrice)}</span>
            </div>
          </div>

          {/* Meta */}
          <div className="pt-1 text-gray-500 flex gap-3">
            <span>Floor: {area.floorType}</span>
            <span>Condition: {area.conditionLevel}</span>
            {area.quantity > 1 && <span>Qty: {area.quantity}</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export const PricingBreakdownPanel: React.FC<PricingBreakdownPanelProps> = ({ pricing }) => {
  const [visible, setVisible] = useState(true);
  const [areasExpanded, setAreasExpanded] = useState(true);

  return (
    <div className="bg-surface-800 rounded-xl border border-amber-500/20 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="w-full flex items-center justify-between px-4 py-3 bg-amber-500/10 hover:bg-amber-500/15 transition-colors"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-amber-300 text-sm">Internal Pricing Breakdown</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-400/70 uppercase tracking-wider">Not visible to client</span>
          {visible ? (
            <EyeOff className="w-4 h-4 text-amber-400/50" />
          ) : (
            <Eye className="w-4 h-4 text-amber-400/50" />
          )}
        </div>
      </button>

      {visible && (
        <div className="divide-y divide-surface-700">
          {/* Facility Summary */}
          <div className="px-4 py-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Facility:</span>
              <span className="text-white font-medium">{pricing.facilityName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Building Type:</span>
              <span className="text-white capitalize">{pricing.buildingType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Area:</span>
              <span className="text-white">{pricing.totalSquareFeet.toLocaleString()} sqft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Frequency:</span>
              <span className="text-white">{pricing.serviceFrequency} ({pricing.monthlyVisits} visits/mo)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Pricing Source:</span>
              <span className="text-gray-300 text-xs">{pricing.pricingPlanName}</span>
            </div>
          </div>

          {/* Per-Area Breakdowns */}
          {pricing.areas.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setAreasExpanded(!areasExpanded)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-700/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">
                    Area Breakdown ({pricing.areas.length} areas)
                  </span>
                </div>
                {areasExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {areasExpanded && (
                <div className="max-h-[400px] overflow-y-auto">
                  {pricing.areas.map((area) => (
                    <AreaBreakdownRow key={area.areaId} area={area} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Aggregate Cost Per Visit */}
          <div className="px-4 py-3">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Cost Per Visit (Aggregate)
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-300">
                <span>Labor ({pricing.costBreakdown.totalLaborHours.toFixed(2)} hrs):</span>
                <span className="font-mono">{fmt(pricing.costBreakdown.totalLaborCost)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Insurance:</span>
                <span className="font-mono">{fmt(pricing.costBreakdown.totalInsuranceCost)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Admin Overhead:</span>
                <span className="font-mono">{fmt(pricing.costBreakdown.totalAdminOverheadCost)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Equipment:</span>
                <span className="font-mono">{fmt(pricing.costBreakdown.totalEquipmentCost)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Travel:</span>
                <span className="font-mono">{fmt(pricing.costBreakdown.totalTravelCost)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Supplies:</span>
                <span className="font-mono">{fmt(pricing.costBreakdown.totalSupplyCost)}</span>
              </div>
              <div className="flex justify-between text-white font-medium pt-1 border-t border-surface-700">
                <span>Total Cost/Visit:</span>
                <span className="font-mono">{fmt(pricing.costBreakdown.totalCostPerVisit)}</span>
              </div>
            </div>
          </div>

          {/* Monthly Calculation Steps */}
          <div className="px-4 py-3">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Monthly Calculation
            </div>
            <div className="space-y-2 text-sm">
              {/* Step 1: Cost x Visits */}
              <div className="flex justify-between text-gray-300">
                <span>
                  {fmt(pricing.costBreakdown.totalCostPerVisit)} x {pricing.monthlyVisits} visits
                </span>
                <span className="font-mono">{fmt(pricing.monthlyCostBeforeProfit)}</span>
              </div>

              {/* Step 2: Profit Margin */}
              <div className="flex justify-between text-gray-300">
                <span>
                  ÷ (1 - {pct(pricing.profitMarginApplied)}) profit margin
                </span>
                <span className="font-mono text-emerald-400">+{fmt(pricing.profitAmount)}</span>
              </div>
              <div className="flex justify-between text-white font-medium pl-2 border-l-2 border-surface-600">
                <span>Subtotal before adjustments:</span>
                <span className="font-mono">
                  {fmt(pricing.monthlyCostBeforeProfit + pricing.profitAmount)}
                </span>
              </div>

              {/* Step 3: Building Multiplier */}
              {pricing.buildingMultiplier !== 1 && (
                <div className="flex justify-between text-gray-300">
                  <span className="flex items-center gap-1.5">
                    <MultiplierBadge label="Building" value={pricing.buildingMultiplier} />
                    <span className="capitalize">({pricing.buildingType})</span>
                  </span>
                  <span className="font-mono text-amber-400">
                    {pricing.buildingAdjustment >= 0 ? '+' : ''}{fmt(pricing.buildingAdjustment)}
                  </span>
                </div>
              )}
              {pricing.buildingMultiplier === 1 && (
                <div className="flex justify-between text-gray-500 text-xs">
                  <span>Building type multiplier ({pricing.buildingType}):</span>
                  <span>1.00x (no adjustment)</span>
                </div>
              )}

              {/* Step 4: Task Complexity */}
              {pricing.taskComplexityAddOn > 0 && (
                <div className="flex justify-between text-gray-300">
                  <span>Task complexity add-on ({pct(pricing.taskComplexityAddOn)}):</span>
                  <span className="font-mono text-amber-400">+{fmt(pricing.taskComplexityAmount)}</span>
                </div>
              )}
              {pricing.taskComplexityAddOn === 0 && (
                <div className="flex justify-between text-gray-500 text-xs">
                  <span>Task complexity add-on:</span>
                  <span>0% (standard)</span>
                </div>
              )}

              {/* Step 5: Minimum */}
              {pricing.minimumApplied && (
                <div className="flex justify-between text-amber-400 text-xs">
                  <span>Minimum monthly charge applied</span>
                </div>
              )}

              {/* Final */}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-surface-600">
                <span className="text-white">Monthly Total:</span>
                <span className="text-emerald-400 font-mono">{fmt(pricing.monthlyTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingBreakdownPanel;
