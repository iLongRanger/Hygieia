import { prisma } from '../../lib/prisma';
import { getDefaultPricingSettings, getPricingSettingsById } from '../pricingSettingsService';
import type {
  FloorTypeMultipliers,
  FrequencyMultipliers,
  ConditionMultipliers,
  BuildingTypeMultipliers,
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

  const hourlyRate = Number(pricingSettings.hourlyRate);
  const frequencyMultipliers = pricingSettings.frequencyMultipliers as FrequencyMultipliers;
  const floorTypeMultipliers = pricingSettings.floorTypeMultipliers as FloorTypeMultipliers;
  const buildingTypeMultipliers = pricingSettings.buildingTypeMultipliers as BuildingTypeMultipliers;
  const taskComplexityAddOns = pricingSettings.taskComplexityAddOns as TaskComplexityAddOns;
  const trafficMultipliers = pricingSettings.trafficMultipliers as TrafficMultipliers;
  const conditionMultipliers = pricingSettings.conditionMultipliers as ConditionMultipliers;

  const difficultyMultiplier = 1.0;

  const buildingType = facility.buildingType || 'other';
  const buildingMultiplier = buildingTypeMultipliers[buildingType as keyof BuildingTypeMultipliers] ?? 1.0;
  const frequencyMultiplier = frequencyMultipliers[serviceFrequency as keyof FrequencyMultipliers] ?? 1.0;
  const taskAddOn = taskComplexityAddOns[taskComplexity as keyof TaskComplexityAddOns] ?? 0;
  const minimumMonthlyCharge = Number(pricingSettings.minimumMonthlyCharge);

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

  const areaBreakdowns: AreaCostBreakdown[] = [];
  let totalSquareFeet = 0;
  let totalLaborHours = 0;
  let totalLaborCost = 0;

  for (const area of areaContexts) {
    const totalAreaSqFt = area.squareFeet * area.quantity;
    const totalRoomCount = area.roomCount * area.quantity;
    const totalUnitCount = area.unitCount * area.quantity;

    totalSquareFeet += totalAreaSqFt;

    const floorMultiplier = floorTypeMultipliers[area.floorType as keyof FloorTypeMultipliers] ?? 1.0;
    const conditionMultiplier = conditionMultipliers[area.conditionLevel as keyof ConditionMultipliers] ?? 1.0;
    const trafficMultiplier = trafficMultipliers?.[area.trafficLevel as keyof TrafficMultipliers] ?? 1.0;

    let totalMinutes = 0;
    for (const task of area.tasks) {
      let taskMinutes = task.baseMinutes;
      taskMinutes += task.perSqftMinutes * totalAreaSqFt;
      taskMinutes += task.perUnitMinutes * totalUnitCount;
      taskMinutes += task.perRoomMinutes * totalRoomCount;

      for (const fixture of area.fixtures) {
        const minutesPerFixture = task.fixtureMinutes[fixture.fixtureTypeId] ?? 0;
        taskMinutes += minutesPerFixture * (fixture.count * area.quantity);
      }

      totalMinutes += taskMinutes;
    }

    const itemMinutes = area.fixtures.reduce((sum, fixture) => {
      return sum + fixture.minutesPerItem * (fixture.count * area.quantity);
    }, 0);
    totalMinutes += itemMinutes;

    const areaHours = totalMinutes / 60;
    const laborCostBase = areaHours * hourlyRate;
    const adjustedLaborCost = laborCostBase * floorMultiplier * conditionMultiplier * trafficMultiplier;

    totalLaborHours += areaHours;
    totalLaborCost += adjustedLaborCost;

    areaBreakdowns.push({
      areaId: area.id,
      areaName: area.name,
      areaTypeName: area.name,
      squareFeet: totalAreaSqFt,
      floorType: area.floorType,
      conditionLevel: area.conditionLevel,
      quantity: area.quantity,
      laborHours: roundToTwo(areaHours),
      laborCostBase: roundToTwo(laborCostBase),
      laborBurden: 0,
      totalLaborCost: roundToTwo(adjustedLaborCost),
      insuranceCost: 0,
      adminOverheadCost: 0,
      equipmentCost: 0,
      supplyCost: 0,
      totalCostPerVisit: roundToTwo(adjustedLaborCost),
      floorMultiplier,
      conditionMultiplier,
      pricePerVisit: roundToTwo(adjustedLaborCost),
      monthlyVisits: getMonthlyVisits(serviceFrequency),
      monthlyPrice: roundToTwo(adjustedLaborCost * getMonthlyVisits(serviceFrequency)),
    });
  }

  let perVisitSubtotal = totalLaborCost * difficultyMultiplier;
  perVisitSubtotal *= buildingMultiplier;
  perVisitSubtotal *= frequencyMultiplier;

  const taskComplexityAmount = perVisitSubtotal * taskAddOn;
  let perVisitTotal = perVisitSubtotal + taskComplexityAmount;

  const monthlyVisits = getMonthlyVisits(serviceFrequency);
  let monthlyTotal = perVisitTotal * monthlyVisits;

  if (workerCount > 1) {
    monthlyTotal *= workerCount;
  }

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
      totalInsuranceCost: 0,
      totalAdminOverheadCost: 0,
      totalEquipmentCost: 0,
      totalTravelCost: 0,
      totalSupplyCost: 0,
      totalCostPerVisit: roundToTwo(perVisitTotal),
    },
    monthlyVisits,
    monthlyCostBeforeProfit: roundToTwo(perVisitTotal * monthlyVisits),
    profitAmount: 0,
    profitMarginApplied: 0,
    buildingMultiplier,
    buildingAdjustment: roundToTwo(perVisitSubtotal - (totalLaborCost * difficultyMultiplier)),
    taskComplexityAddOn: taskAddOn,
    taskComplexityAmount: roundToTwo(taskComplexityAmount),
    subtotal: roundToTwo(perVisitTotal),
    monthlyTotal: roundToTwo(monthlyTotal),
    minimumApplied,
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
    daily: 30,
    weekly: 4.33,
    biweekly: 2.17,
    monthly: 1,
    quarterly: 0.33,
  };
  return visitsMap[frequency] || 4.33;
}
