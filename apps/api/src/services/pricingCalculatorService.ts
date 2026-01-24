import { prisma } from '../lib/prisma';
import { getActivePricingSettings } from './pricingSettingsService';
import type {
  FloorTypeMultipliers,
  FrequencyMultipliers,
  ConditionMultipliers,
  BuildingTypeMultipliers,
  TaskComplexityAddOns,
} from '../schemas/pricingSettings';

export interface AreaPricingBreakdown {
  areaId: string;
  areaName: string;
  areaTypeName: string;
  squareFeet: number;
  floorType: string;
  conditionLevel: string;
  quantity: number;
  basePrice: number;
  floorMultiplier: number;
  conditionMultiplier: number;
  frequencyMultiplier: number;
  taskComplexityAddOn: number;
  priceBeforeFrequency: number;
  areaTotal: number;
}

export interface FacilityPricingResult {
  facilityId: string;
  facilityName: string;
  buildingType: string;
  buildingMultiplier: number;
  serviceFrequency: string;
  totalSquareFeet: number;
  areas: AreaPricingBreakdown[];
  subtotal: number;
  buildingAdjustment: number;
  monthlyTotal: number;
  minimumApplied: boolean;
  pricingSettingsId: string;
  pricingSettingsName: string;
}

export interface CalculatePricingOptions {
  facilityId: string;
  serviceFrequency: string; // e.g., '5x_week', '3x_week', 'weekly', etc.
  taskComplexity?: string; // e.g., 'standard', 'sanitization', 'biohazard'
}

/**
 * Calculate pricing for a facility based on its areas and the active pricing settings
 */
export async function calculateFacilityPricing(
  options: CalculatePricingOptions
): Promise<FacilityPricingResult> {
  const { facilityId, serviceFrequency, taskComplexity = 'standard' } = options;

  // Get the active pricing settings
  const pricingSettings = await getActivePricingSettings();
  if (!pricingSettings) {
    throw new Error('No active pricing settings found. Please configure pricing settings first.');
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

  // Extract multipliers from pricing settings
  const floorTypeMultipliers = pricingSettings.floorTypeMultipliers as FloorTypeMultipliers;
  const frequencyMultipliers = pricingSettings.frequencyMultipliers as FrequencyMultipliers;
  const conditionMultipliers = pricingSettings.conditionMultipliers as ConditionMultipliers;
  const buildingTypeMultipliers = pricingSettings.buildingTypeMultipliers as BuildingTypeMultipliers;
  const taskComplexityAddOns = pricingSettings.taskComplexityAddOns as TaskComplexityAddOns;

  const baseRatePerSqFt = Number(pricingSettings.baseRatePerSqFt);
  const minimumMonthlyCharge = Number(pricingSettings.minimumMonthlyCharge);

  // Get building type multiplier
  const buildingType = facility.buildingType || 'other';
  const buildingMultiplier = buildingTypeMultipliers[buildingType as keyof BuildingTypeMultipliers] ?? 1.0;

  // Get frequency multiplier
  const frequencyMultiplier = frequencyMultipliers[serviceFrequency as keyof FrequencyMultipliers] ?? 1.0;

  // Get task complexity add-on
  const taskAddOn = taskComplexityAddOns[taskComplexity as keyof TaskComplexityAddOns] ?? 0;

  // Calculate pricing for each area
  const areaPricingBreakdowns: AreaPricingBreakdown[] = [];
  let totalSquareFeet = 0;
  let subtotal = 0;

  for (const area of facility.areas) {
    const squareFeet = Number(area.squareFeet) || 0;
    const quantity = area.quantity || 1;
    const totalAreaSqFt = squareFeet * quantity;
    totalSquareFeet += totalAreaSqFt;

    // Get floor type multiplier
    const floorType = area.floorType || 'vct';
    const floorMultiplier = floorTypeMultipliers[floorType as keyof FloorTypeMultipliers] ?? 1.0;

    // Get condition multiplier
    const conditionLevel = area.conditionLevel || 'standard';
    const conditionMultiplier = conditionMultipliers[conditionLevel as keyof ConditionMultipliers] ?? 1.0;

    // Calculate base price (per service visit)
    const basePrice = totalAreaSqFt * baseRatePerSqFt;

    // Price with floor and condition multipliers (per service)
    const priceBeforeFrequency = basePrice * floorMultiplier * conditionMultiplier;

    // Monthly price with frequency and task complexity
    const monthlyPrice = priceBeforeFrequency * frequencyMultiplier * (1 + taskAddOn);

    areaPricingBreakdowns.push({
      areaId: area.id,
      areaName: area.name || area.areaType.name,
      areaTypeName: area.areaType.name,
      squareFeet: totalAreaSqFt,
      floorType,
      conditionLevel,
      quantity,
      basePrice: roundToTwo(basePrice),
      floorMultiplier,
      conditionMultiplier,
      frequencyMultiplier,
      taskComplexityAddOn: taskAddOn,
      priceBeforeFrequency: roundToTwo(priceBeforeFrequency),
      areaTotal: roundToTwo(monthlyPrice),
    });

    subtotal += monthlyPrice;
  }

  // Apply building type multiplier to subtotal
  const buildingAdjustment = subtotal * (buildingMultiplier - 1);
  let monthlyTotal = subtotal + buildingAdjustment;

  // Apply minimum charge if needed
  const minimumApplied = monthlyTotal < minimumMonthlyCharge;
  if (minimumApplied) {
    monthlyTotal = minimumMonthlyCharge;
  }

  return {
    facilityId: facility.id,
    facilityName: facility.name,
    buildingType,
    buildingMultiplier,
    serviceFrequency,
    totalSquareFeet,
    areas: areaPricingBreakdowns,
    subtotal: roundToTwo(subtotal),
    buildingAdjustment: roundToTwo(buildingAdjustment),
    monthlyTotal: roundToTwo(monthlyTotal),
    minimumApplied,
    pricingSettingsId: pricingSettings.id,
    pricingSettingsName: pricingSettings.name,
  };
}

/**
 * Calculate pricing for multiple frequencies to show comparison
 */
export async function calculateFacilityPricingComparison(
  facilityId: string,
  frequencies: string[] = ['1x_week', '2x_week', '3x_week', '5x_week']
): Promise<{ frequency: string; monthlyTotal: number }[]> {
  const results = await Promise.all(
    frequencies.map(async (frequency) => {
      const pricing = await calculateFacilityPricing({
        facilityId,
        serviceFrequency: frequency,
      });
      return {
        frequency,
        monthlyTotal: pricing.monthlyTotal,
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
  serviceFrequency: string
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
  });

  // Get facility tasks grouped by area
  const { byArea, byFrequency } = await getFacilityTasksGrouped(facilityId);

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

    services.push({
      serviceName: areaPricing.areaName,
      serviceType: mapFrequencyToServiceType(serviceFrequency),
      frequency: mapFrequencyToProposalFrequency(serviceFrequency),
      monthlyPrice: areaPricing.areaTotal,
      description: descriptionParts.join('\n'),
      includedTasks: allTasks,
    });
  }

  return services;
}

// Helper functions
function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
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
