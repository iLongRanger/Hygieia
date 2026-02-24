import { prisma } from '../../lib/prisma';
import { getDefaultPricingSettings, getPricingSettingsById } from '../pricingSettingsService';
import type {
  FloorTypeMultipliers,
  ConditionMultipliers,
  TaskComplexityAddOns,
  TrafficMultipliers,
} from '../../schemas/pricingSettings';
import type { AreaCostBreakdown, FacilityPricingResult } from '../pricingCalculatorService';

export interface CalculatePerHourPricingOptions {
  facilityId: string;
  serviceFrequency: string;
  taskComplexity?: string;
  pricingPlanId?: string;
  workerCount?: number;
  subcontractorPercentageOverride?: number;
}

export interface PerHourAreaContext {
  id: string;
  name: string;
  squareFeet: number;
  quantity: number;
  floorType: string;
  conditionLevel: string;
  trafficLevel: string;
  roomCount: number;
  unitCount: number;
  fixtures: { fixtureTypeId: string; count: number; minutesPerItem: number }[];
  tasks: PerHourTaskContext[];
}

export interface PerHourTaskContext {
  id: string;
  cleaningFrequency: string;
  baseMinutes: number;
  perSqftMinutes: number;
  perUnitMinutes: number;
  perRoomMinutes: number;
  fixtureMinutes: Record<string, number>;
}

export async function calculatePerHourPricing(
  options: CalculatePerHourPricingOptions
): Promise<FacilityPricingResult> {
  const {
    facilityId,
    serviceFrequency,
    taskComplexity = 'standard',
    pricingPlanId,
    workerCount = 1,
  } = options;

  const pricingSettings = pricingPlanId
    ? await getPricingSettingsById(pricingPlanId)
    : await getDefaultPricingSettings();
  if (!pricingSettings) {
    throw new Error('No pricing plan found. Please configure pricing plans first.');
  }

  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    include: {
      areas: {
        where: { archivedAt: null },
        include: {
          areaType: true,
          fixtures: {
            include: {
              fixtureType: true,
            },
          },
        },
      },
    },
  });

  if (!facility) {
    throw new Error('Facility not found');
  }

  const facilityTasks = await prisma.facilityTask.findMany({
    where: {
      facilityId,
      archivedAt: null,
    },
    include: {
      taskTemplate: {
        include: {
          fixtureMinutes: {
            include: { fixtureType: true },
          },
        },
      },
      fixtureMinutes: {
        include: { fixtureType: true },
      },
    },
  });

  // Extract full cost settings (same as sqft strategy)
  const laborCostPerHour = Number(pricingSettings.laborCostPerHour);
  const laborBurdenPct = Number(pricingSettings.laborBurdenPercentage);
  const insurancePct = Number(pricingSettings.insurancePercentage);
  const adminOverheadPct = Number(pricingSettings.adminOverheadPercentage);
  const equipmentPct = Number(pricingSettings.equipmentPercentage);
  const supplyCostPct = Number(pricingSettings.supplyCostPercentage);
  const supplyCostPerSqFt = pricingSettings.supplyCostPerSqFt ? Number(pricingSettings.supplyCostPerSqFt) : null;
  const travelCostPerVisit = Number(pricingSettings.travelCostPerVisit);
  const targetProfitMargin = Number(pricingSettings.targetProfitMargin);
  const floorTypeMultipliers = pricingSettings.floorTypeMultipliers as FloorTypeMultipliers;
  const taskComplexityAddOns = pricingSettings.taskComplexityAddOns as TaskComplexityAddOns;
  const trafficMultipliers = pricingSettings.trafficMultipliers as TrafficMultipliers;
  const conditionMultipliers = pricingSettings.conditionMultipliers as ConditionMultipliers;
  const minimumMonthlyCharge = Number(pricingSettings.minimumMonthlyCharge);

  const buildingType = facility.buildingType || 'other';
  const taskAddOn = taskComplexityAddOns[taskComplexity as keyof TaskComplexityAddOns] ?? 0;

  // Group tasks by area
  const tasksByArea = new Map<string | null, typeof facilityTasks>();
  for (const task of facilityTasks) {
    const areaId = task.areaId ?? null;
    if (!tasksByArea.has(areaId)) {
      tasksByArea.set(areaId, []);
    }
    tasksByArea.get(areaId)!.push(task);
  }

  const areaContexts: PerHourAreaContext[] = facility.areas.map((area) => {
    const fixtures = area.fixtures.map((fixture) => ({
      fixtureTypeId: fixture.fixtureTypeId,
      count: fixture.count,
      minutesPerItem: Number(fixture.minutesPerItem) || 0,
    }));
    const tasks = buildPerHourTasks(tasksByArea.get(area.id) ?? []);
    return {
      id: area.id,
      name: area.name || area.areaType.name,
      squareFeet: Number(area.squareFeet) || 0,
      quantity: area.quantity || 1,
      floorType: area.floorType || 'vct',
      conditionLevel: area.conditionLevel || 'standard',
      trafficLevel: area.trafficLevel || 'medium',
      roomCount: area.roomCount || 0,
      unitCount: area.unitCount || 0,
      fixtures,
      tasks,
    };
  });

  // Handle facility-wide tasks (not assigned to any area)
  const facilityWideTasks = tasksByArea.get(null) ?? [];
  if (facilityWideTasks.length > 0) {
    const totalSquareFeet = facility.areas.reduce((sum, area) => {
      const sqFt = Number(area.squareFeet) || 0;
      const qty = area.quantity || 1;
      return sum + sqFt * qty;
    }, 0);

    areaContexts.push({
      id: 'facility-wide',
      name: 'Facility-Wide',
      squareFeet: totalSquareFeet,
      quantity: 1,
      floorType: 'vct',
      conditionLevel: 'standard',
      trafficLevel: 'medium',
      roomCount: 0,
      unitCount: 0,
      fixtures: [],
      tasks: buildPerHourTasks(facilityWideTasks),
    });
  }

  // Calculate per-area costs with full overhead stack
  const areaBreakdowns: AreaCostBreakdown[] = [];
  let totalSquareFeet = 0;
  let totalLaborCost = 0;
  let totalLaborHours = 0;
  let totalInsuranceCost = 0;
  let totalAdminOverheadCost = 0;
  let totalEquipmentCost = 0;
  let totalSupplyCost = 0;
  let highestMonthlyVisits = 0;

  for (const area of areaContexts) {
    const totalAreaSqFt = area.squareFeet * area.quantity;
    const totalRoomCount = area.roomCount * area.quantity;
    const totalUnitCount = area.unitCount * area.quantity;

    totalSquareFeet += totalAreaSqFt;

    const floorMultiplier = floorTypeMultipliers[area.floorType as keyof FloorTypeMultipliers] ?? 1.0;
    const conditionMultiplier = conditionMultipliers[area.conditionLevel as keyof ConditionMultipliers] ?? 1.0;
    const trafficMultiplier = trafficMultipliers?.[area.trafficLevel as keyof TrafficMultipliers] ?? 1.0;

    // Calculate monthly minutes per task using each task's own cleaning frequency
    let areaMonthlyMinutes = 0;
    let areaHighestMonthlyVisits = 0;

    for (const task of area.tasks) {
      let taskMinutesPerOccurrence = task.baseMinutes;
      taskMinutesPerOccurrence += task.perSqftMinutes * totalAreaSqFt;
      taskMinutesPerOccurrence += task.perUnitMinutes * totalUnitCount;
      taskMinutesPerOccurrence += task.perRoomMinutes * totalRoomCount;

      for (const fixture of area.fixtures) {
        const minutesPerFixture = task.fixtureMinutes[fixture.fixtureTypeId] ?? 0;
        taskMinutesPerOccurrence += minutesPerFixture * (fixture.count * area.quantity);
      }

      const taskMonthlyVisits = getMonthlyVisits(task.cleaningFrequency);
      areaMonthlyMinutes += taskMinutesPerOccurrence * taskMonthlyVisits;

      if (taskMonthlyVisits > areaHighestMonthlyVisits) {
        areaHighestMonthlyVisits = taskMonthlyVisits;
      }
    }

    // Add fixture base minutes (minutesPerItem) at the highest task frequency
    const itemMinutes = area.fixtures.reduce((sum, fixture) => {
      return sum + fixture.minutesPerItem * (fixture.count * area.quantity);
    }, 0);
    areaMonthlyMinutes += itemMinutes * areaHighestMonthlyVisits;

    if (areaHighestMonthlyVisits > highestMonthlyVisits) {
      highestMonthlyVisits = areaHighestMonthlyVisits;
    }

    const areaMonthlyHours = areaMonthlyMinutes / 60;

    // Apply multipliers to HOURS (not dollars) — industry-standard approach
    const adjustedMonthlyHours = areaMonthlyHours * floorMultiplier * conditionMultiplier * trafficMultiplier;

    // Cost stack (same as sqft strategy)
    const laborCostBase = adjustedMonthlyHours * laborCostPerHour;
    const laborBurden = laborCostBase * laborBurdenPct;
    const areaLaborCost = laborCostBase + laborBurden;
    const insuranceCost = areaLaborCost * insurancePct;
    const adminOverheadCost = areaLaborCost * adminOverheadPct;
    const equipmentCost = areaLaborCost * equipmentPct;

    let supplyCost: number;
    if (supplyCostPerSqFt !== null) {
      supplyCost = totalAreaSqFt * supplyCostPerSqFt;
    } else {
      const laborPlusOverhead = areaLaborCost + insuranceCost + adminOverheadCost + equipmentCost;
      supplyCost = laborPlusOverhead * supplyCostPct;
    }

    const areaMonthlyCost = areaLaborCost + insuranceCost + adminOverheadCost + equipmentCost + supplyCost;

    // Accumulate totals
    totalLaborHours += adjustedMonthlyHours;
    totalLaborCost += areaLaborCost;
    totalInsuranceCost += insuranceCost;
    totalAdminOverheadCost += adminOverheadCost;
    totalEquipmentCost += equipmentCost;
    totalSupplyCost += supplyCost;

    // Area monthly price with profit margin applied
    const areaMonthlyPrice = areaMonthlyCost / (1 - targetProfitMargin);

    areaBreakdowns.push({
      areaId: area.id,
      areaName: area.name,
      areaTypeName: area.name,
      squareFeet: totalAreaSqFt,
      floorType: area.floorType,
      conditionLevel: area.conditionLevel,
      quantity: area.quantity,
      laborHours: roundToTwo(adjustedMonthlyHours),
      laborCostBase: roundToTwo(laborCostBase),
      laborBurden: roundToTwo(laborBurden),
      totalLaborCost: roundToTwo(areaLaborCost),
      insuranceCost: roundToTwo(insuranceCost),
      adminOverheadCost: roundToTwo(adminOverheadCost),
      equipmentCost: roundToTwo(equipmentCost),
      supplyCost: roundToTwo(supplyCost),
      totalCostPerVisit: roundToTwo(areaHighestMonthlyVisits > 0 ? areaMonthlyCost / areaHighestMonthlyVisits : areaMonthlyCost),
      floorMultiplier,
      conditionMultiplier,
      pricePerVisit: roundToTwo(areaHighestMonthlyVisits > 0 ? areaMonthlyPrice / areaHighestMonthlyVisits : areaMonthlyPrice),
      monthlyVisits: areaHighestMonthlyVisits,
      monthlyPrice: roundToTwo(areaMonthlyPrice),
    });
  }

  // Add travel cost (flat per visit, not per area)
  const totalMonthlyCost = totalLaborCost + totalInsuranceCost + totalAdminOverheadCost +
    totalEquipmentCost + totalSupplyCost + (travelCostPerVisit * highestMonthlyVisits);

  const totalCostPerVisit = highestMonthlyVisits > 0
    ? totalMonthlyCost / highestMonthlyVisits
    : totalMonthlyCost;

  // Apply profit margin: Final Price = Cost / (1 - Margin)
  let subtotal = totalMonthlyCost / (1 - targetProfitMargin);
  const profitAmount = subtotal - totalMonthlyCost;

  // Apply task complexity add-on
  const taskComplexityAmount = subtotal * taskAddOn;
  let monthlyTotal = subtotal + taskComplexityAmount;

  // Apply minimum charge if needed
  const minimumApplied = monthlyTotal < minimumMonthlyCharge;
  if (minimumApplied) {
    monthlyTotal = minimumMonthlyCharge;
  }

  // Calculate subcontractor split
  const subcontractorPercentage = options.subcontractorPercentageOverride ?? Number(pricingSettings.subcontractorPercentage ?? 0.60);
  const subcontractorPayout = roundToTwo(monthlyTotal * subcontractorPercentage);
  const companyRevenue = roundToTwo(monthlyTotal - subcontractorPayout);

  // Use the highest monthly visits for the facility-level value
  // (serviceFrequency is still passed through for backward compat / display)
  const monthlyVisits = highestMonthlyVisits || getMonthlyVisits(serviceFrequency);

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
      totalTravelCost: roundToTwo(travelCostPerVisit * highestMonthlyVisits),
      totalSupplyCost: roundToTwo(totalSupplyCost),
      totalCostPerVisit: roundToTwo(totalCostPerVisit),
    },
    monthlyVisits,
    monthlyCostBeforeProfit: roundToTwo(totalMonthlyCost),
    profitAmount: roundToTwo(profitAmount),
    profitMarginApplied: targetProfitMargin,
    taskComplexityAddOn: taskAddOn,
    taskComplexityAmount: roundToTwo(taskComplexityAmount),
    subtotal: roundToTwo(subtotal),
    monthlyTotal: roundToTwo(monthlyTotal),
    minimumApplied,
    subcontractorPercentage,
    subcontractorPayout,
    companyRevenue,
    pricingPlanId: pricingSettings.id,
    pricingPlanName: pricingSettings.name,
  };
}

function buildPerHourTasks(tasks: any[]): PerHourTaskContext[] {
  return tasks.map((task) => {
    const template = task.taskTemplate;
    const baseMinutes = task.baseMinutesOverride ?? (template?.baseMinutes ?? 0);
    const perSqftMinutes = task.perSqftMinutesOverride ?? (template?.perSqftMinutes ?? 0);
    const perUnitMinutes = task.perUnitMinutesOverride ?? (template?.perUnitMinutes ?? 0);
    const perRoomMinutes = task.perRoomMinutesOverride ?? (template?.perRoomMinutes ?? 0);

    const templateFixtureMinutes: Record<string, number> = {};
    if (template?.fixtureMinutes) {
      for (const fixture of template.fixtureMinutes) {
        templateFixtureMinutes[fixture.fixtureTypeId] = Number(fixture.minutesPerFixture) || 0;
      }
    }

    const overrideFixtureMinutes: Record<string, number> = {};
    if (task.fixtureMinutes) {
      for (const fixture of task.fixtureMinutes) {
        overrideFixtureMinutes[fixture.fixtureTypeId] = Number(fixture.minutesPerFixture) || 0;
      }
    }

    const fixtureMinutes = {
      ...templateFixtureMinutes,
      ...overrideFixtureMinutes,
    };

    return {
      id: task.id,
      cleaningFrequency: task.cleaningFrequency || 'daily',
      baseMinutes: Number(baseMinutes) || 0,
      perSqftMinutes: Number(perSqftMinutes) || 0,
      perUnitMinutes: Number(perUnitMinutes) || 0,
      perRoomMinutes: Number(perRoomMinutes) || 0,
      fixtureMinutes,
    };
  });
}

function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

function getMonthlyVisits(frequency: string): number {
  const visitsMap: Record<string, number> = {
    '1x_week': 4.33,
    '2x_week': 8.67,
    '3x_week': 13,
    '4x_week': 17.33,
    '5x_week': 21.67,
    '7x_week': 30.33,
    daily: 30,
    weekly: 4.33,
    biweekly: 2.17,
    monthly: 1,
    quarterly: 0.33,
  };
  return visitsMap[frequency] || 4.33;
}
