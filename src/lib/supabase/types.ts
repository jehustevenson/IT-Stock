// ─── Canonical shared types ───────────────────────────────────────────────────
// All domain types live here. mockData.ts re-exports from this file.
// Never duplicate these elsewhere.

export type AssetStatus      = 'Available' | 'Assigned' | 'Faulty' | 'Retired';
export type AssetCategory    =
  | 'Laptop' | 'Desktop' | 'Monitor' | 'Printer'
  | 'Networking' | 'Accessory' | 'Server' | 'Phone';
export type AssignmentStatus = 'Active' | 'Returned' | 'Overdue';
export type AuditAction      = 'Added' | 'Assigned' | 'Returned' | 'Updated' | 'Deleted' | 'Flagged';
export type SchoolSection    = 'Infant School' | 'Junior School' | 'Secondary School';

export const SCHOOLS: SchoolSection[] = [
  'Infant School',
  'Junior School',
  'Secondary School',
];

// ─── Supabase Database schema ─────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      assets: {
        Row: {
          id:             string;
          asset_tag:      string;
          name:           string;
          category:       AssetCategory;
          serial_number:  string;
          purchase_date:  string;
          status:         AssetStatus;
          location:       string;
          school:         SchoolSection | null;   // FIX: was missing from schema
          assigned_to:    string | null;
          assigned_to_id: string | null;
          department:     string | null;
          notes:          string | null;
          created_at:     string;
          updated_at:     string;
        };
        Insert: Omit<Database['public']['Tables']['assets']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['assets']['Insert']>;
      };
      assignments: {
        Row: {
          id:              string;
          asset_id:        string;
          asset_tag:       string;
          asset_name:      string;
          category:        AssetCategory;
          staff_name:      string;
          staff_id:        string;
          department:      string;
          date_assigned:   string;
          expected_return: string;
          status:          AssignmentStatus;
          returned_date:   string | null;
          notes:           string | null;
          created_at:      string;
          updated_at:      string;
        };
        Insert: Omit<Database['public']['Tables']['assignments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['assignments']['Insert']>;
      };
      audit_logs: {
        Row: {
          id:           string;
          timestamp:    string;
          action:       AuditAction;
          asset_tag:    string;
          asset_name:   string;
          performed_by: string;
          details:      string;
        };
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id'>;
        Update: never;
      };
    };
  };
}

// ─── Convenience row aliases ──────────────────────────────────────────────────

export type DBAsset      = Database['public']['Tables']['assets']['Row'];
export type DBAssignment = Database['public']['Tables']['assignments']['Row'];
export type DBAuditLog   = Database['public']['Tables']['audit_logs']['Row'];

// ─── App-level domain interfaces ──────────────────────────────────────────────

export interface Asset {
  id:            string;
  assetTag:      string;
  name:          string;
  category:      AssetCategory;
  serialNumber:  string;
  purchaseDate:  string;
  status:        AssetStatus;
  location:      string;
  school?:       SchoolSection;
  assignedTo?:   string;
  assignedToId?: string;
  department?:   string;
  notes?:        string;
}

export interface Assignment {
  id:             string;
  assetId:        string;
  assetTag:       string;
  assetName:      string;
  category:       AssetCategory;
  staffName:      string;
  staffId:        string;
  department:     string;
  dateAssigned:   string;
  expectedReturn: string;
  status:         AssignmentStatus;
  returnedDate?:  string;
  notes?:         string;
}

export interface AuditLog {
  id:          string;
  timestamp:   string;
  action:      AuditAction;
  assetTag:    string;
  assetName:   string;
  performedBy: string;
  details:     string;
}

// ─── Mappers: DB snake_case → camelCase ───────────────────────────────────────

export function toAsset(row: DBAsset): Asset {
  return {
    id:            row.id,
    assetTag:      row.asset_tag,
    name:          row.name,
    category:      row.category,
    serialNumber:  row.serial_number,
    purchaseDate:  row.purchase_date,
    status:        row.status,
    location:      row.location,
    school:        row.school        ?? undefined,
    assignedTo:    row.assigned_to   ?? undefined,
    assignedToId:  row.assigned_to_id ?? undefined,
    department:    row.department    ?? undefined,
    notes:         row.notes         ?? undefined,
  };
}

export function toAssignment(row: DBAssignment): Assignment {
  return {
    id:             row.id,
    assetId:        row.asset_id,
    assetTag:       row.asset_tag,
    assetName:      row.asset_name,
    category:       row.category,
    staffName:      row.staff_name,
    staffId:        row.staff_id,
    department:     row.department,
    dateAssigned:   row.date_assigned,
    expectedReturn: row.expected_return,
    status:         row.status,
    returnedDate:   row.returned_date ?? undefined,
    notes:          row.notes         ?? undefined,
  };
}

export function toAuditLog(row: DBAuditLog): AuditLog {
  return {
    id:          row.id,
    timestamp:   row.timestamp,
    action:      row.action,
    assetTag:    row.asset_tag,
    assetName:   row.asset_name,
    performedBy: row.performed_by,
    details:     row.details,
  };
}