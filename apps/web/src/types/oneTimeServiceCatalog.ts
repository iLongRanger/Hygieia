export type OneTimeServiceType = string;
export type OneTimeUnitType = string;

export interface OneTimeServiceCatalogAddOn {
  id: string;
  name: string;
  code: string;
  price: number;
  defaultQuantity: number;
  isActive: boolean;
  sortOrder: number;
}

export interface OneTimeServiceCatalogItem {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  serviceType: OneTimeServiceType;
  unitType: OneTimeUnitType;
  baseRate: number;
  defaultQuantity: number;
  minimumCharge?: number | null;
  maxDiscountPercent: number;
  requiresSchedule: boolean;
  isActive: boolean;
  addOns: OneTimeServiceCatalogAddOn[];
}

export interface CreateOneTimeServiceCatalogItemInput {
  name: string;
  code: string;
  description?: string | null;
  serviceType: OneTimeServiceType;
  unitType: OneTimeUnitType;
  baseRate: number;
  defaultQuantity?: number;
  minimumCharge?: number | null;
  maxDiscountPercent?: number;
  requiresSchedule?: boolean;
  isActive?: boolean;
  addOns?: Array<{
    id?: string;
    name: string;
    code: string;
    price: number;
    defaultQuantity?: number;
    isActive?: boolean;
    sortOrder?: number;
  }>;
}

export type UpdateOneTimeServiceCatalogItemInput = Partial<CreateOneTimeServiceCatalogItemInput>;
