export interface User {
  id: string
  email: string
  fullName: string
  role: 'owner' | 'admin' | 'manager' | 'cleaner'
  tenantId: string
}

export interface Lead {
  id: string
  companyName: string | null
  contactName: string
  primaryEmail: string | null
  status: string
  tenantId: string
}

export interface Account {
  id: string
  name: string
  type: 'commercial' | 'residental'
  tenantId: string
}

export interface Facility {
  id: string
  name: string
  accountId: string
  squareFeet: number | null
  tenantId: string
}
