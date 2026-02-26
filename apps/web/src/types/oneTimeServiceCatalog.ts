export type OneTimeServiceType = 'window_cleaning' | 'carpet_cleaning' | 'custom';
export type OneTimeUnitType = 'per_window' | 'per_sqft' | 'fixed';

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
