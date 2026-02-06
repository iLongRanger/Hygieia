import { prisma } from '../lib/prisma';
import { getDefaultPricingSettings, getPricingSettingsById } from './pricingSettingsService';
import type {
  FloorTypeMultipliers,
  FrequencyMultipliers,
  ConditionMultipliers,
  BuildingTypeMultipliers,
  TaskComplexityAddOns,
} from '../schemas/pricingSettings';

// Detailed cost breakdown for an area
export interface AreaCostBreakdown {
  areaId: string;
  areaName: string;
  areaTypeName: string;
  squareFeet: number;
  floorType: string;
  conditionLevel: string;
  quantity: number;

  // Labor breakdown
  laborHours: number;
  laborCostBase: number; // Raw hourly wage * hours
  laborBurden: number; // Payroll taxes, benefits
  totalLaborCost: number;

  // Overhead breakdown
  insuranceCost: number;
  adminOverheadCost: number;
  equipmentCost: number;

  // Supply cost
  supplyCost: number;

  // Cost totals (before profit)
  totalCostPerVisit: number;

  // Multipliers applied
  floorMultiplier: number;
  conditionMultiplier: number;

  // Final pricing
  pricePerVisit: number; // With multipliers, before frequency
  monthlyVisits: number;
  monthlyPrice: number; // Final price with profit margin
}

// Comprehensive facility pricing result
export interface FacilityPricingResult {
  facilityId: string;
  facilityName: string;
  buildingType: string;
  serviceFrequency: string;
  totalSquareFeet: number;

  // Per-area breakdowns
  areas: AreaCostBreakdown[];

  // Aggregate cost breakdown (per visit)
  costBreakdown: {
    totalLaborCost: number;
    totalLaborHours: number;
    totalInsuranceCost: number;
    totalAdminOverheadCost: number;
    totalEquipmentCost: number;
    totalTravelCost: number;
    totalSupplyCost: number;
    totalCostPerVisit: number;
  };

  // Monthly totals
  monthlyVisits: number;
  monthlyCostBeforeProfit: number;
  profitAmount: number;
  profitMarginApplied: number;

  // Building adjustment
  buildingMultiplier: number;
  buildingAdjustment: number;

  // Task complexity
  taskComplexityAddOn: number;
  taskComplexityAmount: number;

  // Final monthly price
  subtotal: number;
  monthlyTotal: number;
  minimumApplied: boolean;

  // Pricing source
  pricingPlanId: string;
  pricingPlanName: string;
}

export interface CalculatePricingOptions {
  facilityId: string;
  serviceFrequency: string; // e.g., '5x_week', '3x_week', 'weekly', etc.
  taskComplexity?: string; // e.g., 'standard', 'sanitization', 'biohazard'
  pricingPlanId?: string; // Optional: use a specific pricing plan instead of default
}

/**
 * Calculate comprehensive pricing for a facility including labor, overhead, supplies, and profit
 */
export async function calculateFacilityPricing(
  options: CalculatePricingOptions
): Promise<FacilityPricingResult> {
  const { facilityId, serviceFrequency, taskComplexity = 'standard', pricingPlanId } = options;

  const pricingSettings = pricingPlanId
    ? await getPricingSettingsById(pricingPlanId)
    : await getDefaultPricingSettings();
  if (!pricingSettings) {
    throw new Error('No pricing plan found. Please configure pricing plans first.');
  }

  // Get the facility with its areas
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    include: {
      areas: {
        where: { archivedAt: null },
        include: {
          areaType: true,
        },
      },
    },
  });

  if (!facility) {
    throw new Error('Facility not found');
  }

  // Extract pricing settings values
  const laborCostPerHour = Number(pricingSettings.laborCostPerHour);
  const laborBurdenPct = Number(pricingSettings.laborBurdenPercentage);
  const sqftPerLaborHour = Number(pricingSettings.sqftPerLaborHour);
  const insurancePct = Number(pricingSettings.insurancePercentage);
  const adminOverheadPct = Number(pricingSettings.adminOverheadPercentage);
  const travelCostPerVisit = Number(pricingSettings.travelCostPerVisit);
  const equipmentPct = Number(pricingSettings.equipmentPercentage);
  const supplyCostPct = Number(pricingSettings.supplyCostPercentage);
  const supplyCostPerSqFt = pricingSettings.supplyCostPerSqFt ? Number(pricingSettings.supplyCostPerSqFt) : null;
  const targetProfitMargin = Number(pricingSettings.targetProfitMargin);
  const minimumMonthlyCharge = Number(pricingSettings.minimumMonthlyCharge);

  // Extract multipliers
  const floorTypeMultipliers = pricingSettings.floorTypeMultipliers as FloorTypeMultipliers;
  const frequencyMultipliers = pricingSettings.frequencyMultipliers as FrequencyMultipliers;
  const buildingTypeMultipliers = pricingSettings.buildingTypeMultipliers as BuildingTypeMultipliers;
  const taskComplexityAddOns = pricingSettings.taskComplexityAddOns as TaskComplexityAddOns;
  const conditionMultipliers = pricingSettings.conditionMultipliers as ConditionMultipliers;

  const difficultyMultiplier = 1.0;

  // Get building type multiplier
  const buildingType = facility.buildingType || 'other';
  const buildingMultiplier = buildingTypeMultipliers[buildingType as keyof BuildingTypeMultipliers] ?? 1.0;

  // Get frequency multiplier (used to calculate monthly visits)
  const frequencyMultiplier = frequencyMultipliers[serviceFrequency as keyof FrequencyMultipliers] ?? 1.0;

  // Calculate monthly visits based on frequency
  const monthlyVisits = getMonthlyVisits(serviceFrequency);

  // Get task complexity add-on
  const taskAddOn = taskComplexityAddOns[taskComplexity as keyof TaskComplexityAddOns] ?? 0;

  // Calculate pricing for each area
  const areaBreakdowns: AreaCostBreakdown[] = [];
  let totalSquareFeet = 0;

  // Aggregate cost totals (per visit)
  let totalLaborCost = 0;
  let totalLaborHours = 0;
  let totalInsuranceCost = 0;
  let totalAdminOverheadCost = 0;
  let totalEquipmentCost = 0;
  let totalSupplyCost = 0;

  for (const area of facility.areas) {
    const squareFeet = Number(area.squareFeet) || 0;
    const quantity = area.quantity || 1;
    const totalAreaSqFt = squareFeet * quantity;
    totalSquareFeet += totalAreaSqFt;

    // Get multipliers for this area
    const floorType = area.floorType || 'vct';
    const floorMultiplier = floorTypeMultipliers[floorType as keyof FloorTypeMultipliers] ?? 1.0;
    const conditionLevel = area.conditionLevel || 'standard';
    const conditionMultiplier = conditionMultipliers[conditionLevel as keyof ConditionMultipliers] ?? 1.0;

    // Calculate labor hours based on square footage and productivity rate
    // Apply floor and condition multipliers to adjust labor time
    const baseLabortHours = totalAreaSqFt / sqftPerLaborHour;
    const adjustedLaborHours = baseLabortHours * floorMultiplier * conditionMultiplier;

    // Calculate labor costs
    const laborCostBase = adjustedLaborHours * laborCostPerHour;
    const laborBurden = laborCostBase * laborBurdenPct;
    const areaLaborCost = laborCostBase + laborBurden;

    // Calculate overhead costs (based on labor cost)
    const insuranceCost = areaLaborCost * insurancePct;
    const adminOverheadCost = areaLaborCost * adminOverheadPct;
    const equipmentCost = areaLaborCost * equipmentPct;

    // Calculate supply cost
    let supplyCost: number;
    if (supplyCostPerSqFt !== null) {
      // Use flat rate per sq ft if specified
      supplyCost = totalAreaSqFt * supplyCostPerSqFt;
    } else {
      // Use percentage of labor + overhead
      const laborPlusOverhead = areaLaborCost + insuranceCost + adminOverheadCost + equipmentCost;
      supplyCost = laborPlusOverhead * supplyCostPct;
    }

    // Total cost per visit for this area (before profit)
    const totalCostPerVisit = areaLaborCost + insuranceCost + adminOverheadCost + equipmentCost + supplyCost;

    // Apply difficulty multiplier from pricing rule
    const adjustedCostPerVisit = totalCostPerVisit * difficultyMultiplier;

    // Calculate monthly price with profit margin
    // Formula: Monthly Price = (Cost per Visit * Monthly Visits) / (1 - Profit Margin)
    const monthlyCost = adjustedCostPerVisit * monthlyVisits;
    const monthlyPriceWithProfit = monthlyCost / (1 - targetProfitMargin);

    areaBreakdowns.push({
      areaId: area.id,
      areaName: area.name || area.areaType.name,
      areaTypeName: area.areaType.name,
      squareFeet: totalAreaSqFt,
      floorType,
      conditionLevel,
      quantity,
      laborHours: roundToTwo(adjustedLaborHours),
      laborCostBase: roundToTwo(laborCostBase),
      laborBurden: roundToTwo(laborBurden),
      totalLaborCost: roundToTwo(areaLaborCost),
      insuranceCost: roundToTwo(insuranceCost),
      adminOverheadCost: roundToTwo(adminOverheadCost),
      equipmentCost: roundToTwo(equipmentCost),
      supplyCost: roundToTwo(supplyCost),
      totalCostPerVisit: roundToTwo(adjustedCostPerVisit),
      floorMultiplier,
      conditionMultiplier,
      pricePerVisit: roundToTwo(adjustedCostPerVisit / (1 - targetProfitMargin)),
      monthlyVisits,
      monthlyPrice: roundToTwo(monthlyPriceWithProfit),
    });

    // Accumulate totals
    totalLaborCost += areaLaborCost;
    totalLaborHours += adjustedLaborHours;
    totalInsuranceCost += insuranceCost;
    totalAdminOverheadCost += adminOverheadCost;
    totalEquipmentCost += equipmentCost;
    totalSupplyCost += supplyCost;
  }

  // Add travel cost (flat per visit, not per area)
  const totalCostPerVisit = totalLaborCost + totalInsuranceCost + totalAdminOverheadCost +
    totalEquipmentCost + totalSupplyCost + travelCostPerVisit;

  // Calculate monthly totals
  const monthlyCostBeforeProfit = totalCostPerVisit * monthlyVisits * difficultyMultiplier;

  // Apply profit margin: Final Price = Cost / (1 - Margin)
  let subtotal = monthlyCostBeforeProfit / (1 - targetProfitMargin);
  const profitAmount = subtotal - monthlyCostBeforeProfit;

  // Apply building type multiplier
  const buildingAdjustment = subtotal * (buildingMultiplier - 1);
  subtotal += buildingAdjustment;

  // Apply task complexity add-on
  const taskComplexityAmount = subtotal * taskAddOn;
  let monthlyTotal = subtotal + taskComplexityAmount;

  // Apply minimum charge if needed
  const minimumApplied = monthlyTotal < minimumMonthlyCharge;
  if (minimumApplied) {
    monthlyTotal = minimumMonthlyCharge;
  }

  return {
    facilityId: facility.id,
    facilityName: facility.name,
    buildingType,
    serviceFrequency,
    totalSquareFeet,
    areas: areaBreakdowns,
    costBreakdown: {
      totalLaborCost: roundToTwo(totalLaborCost),
      totalLaborHours: roundToTwo(totalLaborHours),
      totalInsuranceCost: roundToTwo(totalInsuranceCost),
      totalAdminOverheadCost: roundToTwo(totalAdminOverheadCost),
      totalEquipmentCost: roundToTwo(totalEquipmentCost),
      totalTravelCost: roundToTwo(travelCostPerVisit),
      totalSupplyCost: roundToTwo(totalSupplyCost),
      totalCostPerVisit: roundToTwo(totalCostPerVisit),
    },
    monthlyVisits,
    monthlyCostBeforeProfit: roundToTwo(monthlyCostBeforeProfit),
    profitAmount: roundToTwo(profitAmount),
    profitMarginApplied: targetProfitMargin,
    buildingMultiplier,
    buildingAdjustment: roundToTwo(buildingAdjustment),
    taskComplexityAddOn: taskAddOn,
    taskComplexityAmount: roundToTwo(taskComplexityAmount),
    subtotal: roundToTwo(subtotal),
    monthlyTotal: roundToTwo(monthlyTotal),
    minimumApplied,
    pricingPlanId: pricingSettings.id,
    pricingPlanName: pricingSettings.name,
  };
}

/**
 * Calculate pricing for multiple frequencies to show comparison
 */
export async function calculateFacilityPricingComparison(
  facilityId: string,
  frequencies: string[] = ['1x_week', '2x_week', '3x_week', '5x_week'],
  pricingPlanId?: string
): Promise<{ frequency: string; monthlyTotal: number; monthlyVisits: number }[]> {
  const results = await Promise.all(
    frequencies.map(async (frequency) => {
      const pricing = await calculateFacilityPricing({
        facilityId,
        serviceFrequency: frequency,
        pricingPlanId,
      });
      return {
        frequency,
        monthlyTotal: pricing.monthlyTotal,
        monthlyVisits: pricing.monthlyVisits,
      };
    })
  );
  return results;
}

/**
 * Check if a facility is ready for pricing (has areas with square footage)
 */
export async function isFacilityReadyForPricing(facilityId: string): Promise<{
  isReady: boolean;
  reason?: string;
  areaCount: number;
  totalSquareFeet: number;
}> {
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    include: {
      areas: {
        where: { archivedAt: null },
        select: {
          id: true,
          squareFeet: true,
          quantity: true,
        },
      },
    },
  });

  if (!facility) {
    return {
      isReady: false,
      reason: 'Facility not found',
      areaCount: 0,
      totalSquareFeet: 0,
    };
  }

  const areaCount = facility.areas.length;

  if (areaCount === 0) {
    return {
      isReady: false,
      reason: 'Facility has no areas defined. Please add areas first.',
      areaCount: 0,
      totalSquareFeet: 0,
    };
  }

  const totalSquareFeet = facility.areas.reduce((sum: number, area: { squareFeet: any; quantity: number | null }) => {
    const sqFt = Number(area.squareFeet) || 0;
    const qty = area.quantity || 1;
    return sum + (sqFt * qty);
  }, 0);

  if (totalSquareFeet === 0) {
    return {
      isReady: false,
      reason: 'Areas have no square footage defined. Please add square footage to areas.',
      areaCount,
      totalSquareFeet: 0,
    };
  }

  return {
    isReady: true,
    areaCount,
    totalSquareFeet,
  };
}

/**
 * Get facility tasks grouped by area and frequency
 */
export async function getFacilityTasksGrouped(facilityId: string): Promise<{
  byArea: Map<string, { areaName: string; tasks: { name: string; frequency: string }[] }>;
  byFrequency: Map<string, { name: string; areaName: string }[]>;
}> {
  const facilityTasks = await prisma.facilityTask.findMany({
    where: {
      facilityId,
      archivedAt: null,
    },
    include: {
      taskTemplate: {
        select: {
          name: true,
        },
      },
      area: {
        select: {
          id: true,
          name: true,
          areaType: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: [
      { cleaningFrequency: 'asc' },
      { priority: 'asc' },
    ],
  });

  const byArea = new Map<string, { areaName: string; tasks: { name: string; frequency: string }[] }>();
  const byFrequency = new Map<string, { name: string; areaName: string }[]>();

  for (const task of facilityTasks) {
    const taskName = task.customName || task.taskTemplate?.name || 'Unnamed Task';
    const areaId = task.area?.id || 'facility-wide';
    const areaName = task.area?.name || task.area?.areaType?.name || 'Facility-Wide';
    const frequency = task.cleaningFrequency;

    // Group by area
    if (!byArea.has(areaId)) {
      byArea.set(areaId, { areaName, tasks: [] });
    }
    byArea.get(areaId)!.tasks.push({ name: taskName, frequency });

    // Group by frequency
    if (!byFrequency.has(frequency)) {
      byFrequency.set(frequency, []);
    }
    byFrequency.get(frequency)!.push({ name: taskName, areaName });
  }

  return { byArea, byFrequency };
}

/**
 * Generate proposal services from facility pricing
 * Creates one service line per area with tasks listed in description
 */
export async function generateProposalServicesFromFacility(
  facilityId: string,
  serviceFrequency: string,
  pricingPlanId?: string
): Promise<{
  serviceName: string;
  serviceType: string;
  frequency: string;
  monthlyPrice: number;
  description: string;
  includedTasks: string[];
}[]> {
  const pricing = await calculateFacilityPricing({
    facilityId,
    serviceFrequency,
    pricingPlanId,
  });

  // Get facility tasks grouped by area
  const { byArea } = await getFacilityTasksGrouped(facilityId);

  const frequencyLabel = getFrequencyLabel(serviceFrequency);
  const services: {
    serviceName: string;
    serviceType: string;
    frequency: string;
    monthlyPrice: number;
    description: string;
    includedTasks: string[];
  }[] = [];

  // If no tasks defined, fall back to default behavior
  if (byArea.size === 0) {
    const areaDescriptions = pricing.areas.map(
      (area) => `${area.areaName} (${area.squareFeet} sq ft)`
    );

    return [
      {
        serviceName: `${frequencyLabel} Cleaning Service`,
        serviceType: mapFrequencyToServiceType(serviceFrequency),
        frequency: mapFrequencyToProposalFrequency(serviceFrequency),
        monthlyPrice: pricing.monthlyTotal,
        description: `Includes: ${areaDescriptions.join(', ')}`,
        includedTasks: [
          'Vacuum/mop all floors',
          'Empty trash receptacles',
          'Clean and sanitize restrooms',
          'Dust surfaces',
          'Wipe down high-touch areas',
        ],
      },
    ];
  }

  // Create one service line per area with tasks in description
  const areaPriceTotal = pricing.areas.reduce(
    (sum, area) => sum + Number(area.monthlyPrice || 0),
    0
  );
  const targetMonthlyTotal = pricing.monthlyTotal;
  const applyScaling = areaPriceTotal > 0 && targetMonthlyTotal > 0;
  const scalingFactor = applyScaling ? targetMonthlyTotal / areaPriceTotal : 0;
  let scaledMonthlySum = 0;

  for (const areaPricing of pricing.areas) {
    const areaTasks = byArea.get(areaPricing.areaId);

    // Build task list grouped by frequency for this area
    const tasksByFreq: Record<string, string[]> = {};
    if (areaTasks) {
      for (const task of areaTasks.tasks) {
        if (!tasksByFreq[task.frequency]) {
          tasksByFreq[task.frequency] = [];
        }
        tasksByFreq[task.frequency].push(task.name);
      }
    }

    // Build description with tasks grouped by frequency
    const descriptionParts: string[] = [
      `${areaPricing.squareFeet} sq ft ${areaPricing.floorType} flooring`,
    ];

    const frequencyOrder = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual'];
    const frequencyLabels: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      biweekly: 'Bi-Weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      annual: 'Yearly',
      as_needed: 'As Needed',
    };

    for (const freq of frequencyOrder) {
      if (tasksByFreq[freq] && tasksByFreq[freq].length > 0) {
        descriptionParts.push(`${frequencyLabels[freq] || freq}: ${tasksByFreq[freq].join(', ')}`);
      }
    }

    // Collect all task names for includedTasks array
    const allTasks = areaTasks?.tasks.map(t => t.name) || [];

    let scaledMonthlyPrice = areaPricing.monthlyPrice;
    if (applyScaling) {
      scaledMonthlyPrice = roundToTwo(areaPricing.monthlyPrice * scalingFactor);
      scaledMonthlySum += scaledMonthlyPrice;
    }

    services.push({
      serviceName: areaPricing.areaName,
      serviceType: mapFrequencyToServiceType(serviceFrequency),
      frequency: mapFrequencyToProposalFrequency(serviceFrequency),
      monthlyPrice: scaledMonthlyPrice,
      description: descriptionParts.join('\n'),
      includedTasks: allTasks,
    });
  }

  if (applyScaling && services.length > 0) {
    const adjustment = roundToTwo(targetMonthlyTotal - scaledMonthlySum);
    if (Math.abs(adjustment) >= 0.01) {
      const lastIndex = services.length - 1;
      services[lastIndex] = {
        ...services[lastIndex],
        monthlyPrice: roundToTwo(services[lastIndex].monthlyPrice + adjustment),
      };
    }
  }

  return services;
}

// Helper functions
function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Get number of visits per month based on service frequency
 */
function getMonthlyVisits(frequency: string): number {
  const visitsMap: Record<string, number> = {
    '1x_week': 4.33,
    '2x_week': 8.67,
    '3x_week': 13,
    '4x_week': 17.33,
    '5x_week': 21.67,
    daily: 30,
    weekly: 4.33,
    biweekly: 2.17,
    monthly: 1,
    quarterly: 0.33,
  };
  return visitsMap[frequency] || 4.33;
}

function getFrequencyLabel(frequency: string): string {
  const labels: Record<string, string> = {
    '1x_week': 'Weekly (1x)',
    '2x_week': 'Bi-Weekly (2x)',
    '3x_week': '3x Weekly',
    '4x_week': '4x Weekly',
    '5x_week': '5x Weekly',
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Bi-Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
  };
  return labels[frequency] || frequency;
}

function mapFrequencyToServiceType(frequency: string): string {
  const mapping: Record<string, string> = {
    '1x_week': 'weekly',
    '2x_week': 'weekly',
    '3x_week': 'weekly',
    '4x_week': 'weekly',
    '5x_week': 'daily',
    daily: 'daily',
    weekly: 'weekly',
    biweekly: 'biweekly',
    monthly: 'monthly',
    quarterly: 'quarterly',
  };
  return mapping[frequency] || 'monthly';
}

function mapFrequencyToProposalFrequency(frequency: string): string {
  const mapping: Record<string, string> = {
    '1x_week': 'weekly',
    '2x_week': 'weekly',
    '3x_week': 'weekly',
    '4x_week': 'weekly',
    '5x_week': 'weekly',
    daily: 'daily',
    weekly: 'weekly',
    biweekly: 'biweekly',
    monthly: 'monthly',
    quarterly: 'quarterly',
  };
  return mapping[frequency] || 'monthly';
}
