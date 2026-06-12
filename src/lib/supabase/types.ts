// ─── Canonical shared types ───────────────────────────────────────────────────
// All domain types live here. mockData.ts is a deprecated shim.
// Never duplicate these elsewhere.

export type AssetStatus      = 'Available' | 'Assigned' | 'Faulty' | 'Retired';
export type AssetCategory    =
  | 'Laptop' | 'Desktop' | 'Monitor' | 'Printer'
  | 'Networking' | 'Accessory' | 'Server' | 'Phone'
  | 'iPad' | 'System Unit' | 'Interactive Screen';
export type AssignmentStatus = 'Active' | 'Returned' | 'Overdue';
export type WaybillStatus    =
  | 'Pending IT Approval' | 'Pending Security Approval' | 'Approved' | 'Rejected';
export type AuditAction      = 'Added' | 'Assigned' | 'Returned' | 'Updated' | 'Deleted' | 'Flagged';
export type SchoolSection    = 'Infant School' | 'Junior School' | 'Secondary School';

export const SCHOOLS: SchoolSection[] = [
  'Infant School',
  'Junior School',
  'Secondary School',
];

// ─── Supabase Database schema ─────────────────────────────────────────────────
// Shape must match @supabase/postgrest-js GenericSchema: each Table needs a
// Relationships array, and the schema needs Views / Functions (even if empty).

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: '12';
  };
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
          school:         SchoolSection | null;
          assigned_to:    string | null;
          assigned_to_id: string | null;
          department:     string | null;
          notes:          string | null;
          supplier:       string | null;
          purchase_cost:  number | null;
          created_at:     string;
          updated_at:     string;
        };
        Insert: Omit<Database['public']['Tables']['assets']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['assets']['Insert']>;
        Relationships: [];
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
        Insert: Omit<
          Database['public']['Tables']['assignments']['Row'],
          'id' | 'created_at' | 'updated_at' | 'returned_date' | 'notes'
        > & { returned_date?: string | null; notes?: string | null };
        Update: Partial<Database['public']['Tables']['assignments']['Insert']>;
        Relationships: [];
      };
      waybills: {
        Row: {
          id:                    string;
          waybill_no:            string;
          date:                  string;
          company_name:          string;
          company_address:       string | null;
          recipient_name:        string;
          expected_return:       string | null;
          status:                WaybillStatus;
          created_by:            string;
          it_approved_by:        string | null;
          it_approved_at:        string | null;
          security_approved_by:  string | null;
          security_approved_at:  string | null;
          rejected_by:           string | null;
          rejected_at:           string | null;
          rejection_reason:      string | null;
          created_at:            string;
        };
        Insert: Omit<
          Database['public']['Tables']['waybills']['Row'],
          'id' | 'created_at' | 'status' | 'it_approved_by' | 'it_approved_at'
          | 'security_approved_by' | 'security_approved_at'
          | 'rejected_by' | 'rejected_at' | 'rejection_reason'
        > & { status?: WaybillStatus };
        Update: Partial<Omit<Database['public']['Tables']['waybills']['Row'], 'id' | 'created_at'>>;
        Relationships: [];
      };
      waybill_items: {
        Row: {
          id:            string;
          waybill_id:    string;
          asset_id:      string | null;
          description:   string;
          serial_number: string | null;
          qty:           number;
          purpose:       string | null;
          position:      number;
        };
        Insert: Omit<Database['public']['Tables']['waybill_items']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['waybill_items']['Insert']>;
        Relationships: [];
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
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'timestamp'> &
          { timestamp?: string };
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ─── Convenience row aliases ──────────────────────────────────────────────────

export type DBAsset       = Database['public']['Tables']['assets']['Row'];
export type DBAssignment  = Database['public']['Tables']['assignments']['Row'];
export type DBAuditLog    = Database['public']['Tables']['audit_logs']['Row'];
export type DBWaybill     = Database['public']['Tables']['waybills']['Row'];
export type DBWaybillItem = Database['public']['Tables']['waybill_items']['Row'];

// ─── Waybill domain types ─────────────────────────────────────────────────────

export interface WaybillItem {
  id:            string;
  assetId?:      string;
  description:   string;
  serialNumber?: string;
  qty:           number;
  purpose?:      string;
  position:      number;
}

export interface Waybill {
  id:                  string;
  waybillNo:           string;
  date:                string;
  companyName:         string;
  companyAddress?:     string;
  recipientName:       string;
  expectedReturn?:     string;
  status:              WaybillStatus;
  createdBy:           string;
  itApprovedBy?:       string;
  itApprovedAt?:       string;
  securityApprovedBy?: string;
  securityApprovedAt?: string;
  rejectedBy?:         string;
  rejectedAt?:         string;
  rejectionReason?:    string;
  createdAt:           string;
  items:               WaybillItem[];
}

export function toWaybillItem(row: DBWaybillItem): WaybillItem {
  return {
    id:           row.id,
    assetId:      row.asset_id ?? undefined,
    description:  row.description,
    serialNumber: row.serial_number ?? undefined,
    qty:          row.qty,
    purpose:      row.purpose ?? undefined,
    position:     row.position,
  };
}

export function toWaybill(row: DBWaybill, items: DBWaybillItem[] = []): Waybill {
  return {
    id:                 row.id,
    waybillNo:          row.waybill_no,
    date:               row.date,
    companyName:        row.company_name,
    companyAddress:     row.company_address ?? undefined,
    recipientName:      row.recipient_name,
    expectedReturn:     row.expected_return ?? undefined,
    status:             row.status,
    createdBy:          row.created_by,
    itApprovedBy:       row.it_approved_by ?? undefined,
    itApprovedAt:       row.it_approved_at ?? undefined,
    securityApprovedBy: row.security_approved_by ?? undefined,
    securityApprovedAt: row.security_approved_at ?? undefined,
    rejectedBy:         row.rejected_by ?? undefined,
    rejectedAt:         row.rejected_at ?? undefined,
    rejectionReason:    row.rejection_reason ?? undefined,
    createdAt:          row.created_at,
    items:              [...items].sort((a, b) => a.position - b.position).map(toWaybillItem),
  };
}

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
  supplier?:     string;
  purchaseCost?: number;
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
    supplier:      row.supplier      ?? undefined,
    purchaseCost:  row.purchase_cost ?? undefined,
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