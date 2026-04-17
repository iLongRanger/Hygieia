import type {
  CleaningFrequency,
  CreateAreaInput,
} from '../../types/facility';

export const BUILDING_TYPES = [
  { value: 'office', label: 'Office' },
  { value: 'medical', label: 'Medical' },
  { value: 'retail', label: 'Retail' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'educational', label: 'Educational' },
  { value: 'residential', label: 'Residential' },
  { value: 'mixed', label: 'Mixed Use' },
  { value: 'other', label: 'Other' },
];

export const RESIDENTIAL_BUILDING_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'single_family', label: 'House / Single Family' },
  { value: 'other', label: 'Other' },
];

const BUILDING_TYPE_LABELS = new Map(
  [...BUILDING_TYPES, ...RESIDENTIAL_BUILDING_TYPES].map((option) => [
    option.value,
    option.label,
  ])
);

export function formatBuildingTypeLabel(value: string | null | undefined): string {
  if (!value) return 'Not specified';
  return BUILDING_TYPE_LABELS.get(value) || value.replace(/_/g, ' ');
}

export const CONDITION_LEVELS = [
  { value: 'standard', label: 'Standard' },
  { value: 'medium', label: 'Medium Difficulty' },
  { value: 'hard', label: 'Hard/Heavy Traffic' },
];

export const TRAFFIC_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export const FLOOR_TYPES = [
  { value: 'vct', label: 'VCT (Vinyl Composition Tile)' },
  { value: 'carpet', label: 'Carpet' },
  { value: 'hardwood', label: 'Hardwood' },
  { value: 'tile', label: 'Ceramic/Porcelain Tile' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'epoxy', label: 'Epoxy' },
];

export const CLEANING_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Yearly' },
  { value: 'as_needed', label: 'As Needed' },
];

export const CLEANING_FREQUENCY_VALUES = new Set(
  CLEANING_FREQUENCIES.map((frequency) => frequency.value)
);

export const ORDERED_CLEANING_FREQUENCIES = CLEANING_FREQUENCIES.map(
  (frequency) => frequency.value
) as CleaningFrequency[];

export function isCleaningFrequency(
  value: string
): value is CleaningFrequency {
  return CLEANING_FREQUENCY_VALUES.has(value);
}

export interface AreaTemplateTaskSelection {
  id: string;
  taskTemplateId: string | null;
  name: string;
  cleaningType: string;
  estimatedMinutes: number | null;
  baseMinutes: number;
  perSqftMinutes: number;
  perUnitMinutes: number;
  perRoomMinutes: number;
  include: boolean;
}

export type AreaItemInput = NonNullable<CreateAreaInput['fixtures']>[0];

export const TASK_SEQUENCE_RULES = [
  {
    weight: 10,
    patterns: [
      /trash|garbage|litter|empty|liner/i,
      /restock|refill|replenish|suppl(y|ies)|stock/i,
      /remove expired/i,
    ],
  },
  {
    weight: 20,
    patterns: [
      /dust|high dust/i,
      /vent|vents|light fixture|lights|ceiling fan/i,
      /blinds|sill|sills|racks|shelf|shelves/i,
    ],
  },
  {
    weight: 70,
    patterns: [
      /deep clean|deep-clean|deep extraction|extract/i,
      /carpet cleaning|shampoo/i,
    ],
  },
  {
    weight: 40,
    patterns: [/disinfect|sanitize|sanitise/i],
  },
  {
    weight: 30,
    patterns: [
      /glass|window|mirror/i,
      /wipe|wash|clean/i,
      /counter|desk|table|chair|appliance|fixture|door/i,
      /toilet|urinal|sink|shower/i,
      /furniture|wood surface|board/i,
    ],
  },
  {
    weight: 60,
    patterns: [
      /mop|wet mop|scrub|buff|strip|wax|refinish/i,
      /power wash|pressure wash/i,
      /floor.*polish|polish.*floor/i,
    ],
  },
  {
    weight: 50,
    patterns: [/vacuum|sweep|sweeping/i],
  },
  {
    weight: 80,
    patterns: [/inspect|check|pest|organize|organise/i, /filters|ducts/i],
  },
];
