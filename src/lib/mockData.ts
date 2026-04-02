export type AssetStatus = 'Available' | 'Assigned' | 'Faulty' | 'Retired';
export type AssetCategory =
  | 'Laptop' | 'Desktop' | 'Monitor' | 'Printer'
  | 'Networking' | 'Accessory' | 'Server' | 'Phone';
export type SchoolSection = 'Infant School' | 'Junior School' | 'Secondary School';

export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  category: AssetCategory;
  serialNumber: string;
  purchaseDate: string;
  status: AssetStatus;
  location: string;
  school?: SchoolSection;
  assignedTo?: string;
  assignedToId?: string;
  department?: string;
  notes?: string;
}

export interface Assignment {
  id: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  category: AssetCategory;
  staffName: string;
  staffId: string;
  department: string;
  dateAssigned: string;
  expectedReturn: string;
  status: 'Active' | 'Returned' | 'Overdue';
  returnedDate?: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'Added' | 'Assigned' | 'Returned' | 'Updated' | 'Deleted' | 'Flagged';
  assetTag: string;
  assetName: string;
  performedBy: string;
  details: string;
}

export const SCHOOLS: SchoolSection[] = ['Infant School', 'Junior School', 'Secondary School'];

export const ASSETS: Asset[] = [];
export const ASSIGNMENTS: Assignment[] = [];
export const AUDIT_LOGS: AuditLog[] = [];