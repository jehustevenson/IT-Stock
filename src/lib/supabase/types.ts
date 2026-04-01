export type AssetStatus = 'Available' | 'Assigned' | 'Faulty' | 'Retired';
export type AssetCategory =
  | 'Laptop' | 'Desktop' | 'Monitor' | 'Printer'
  | 'Networking' | 'Accessory' | 'Server' | 'Phone';
export type AssignmentStatus = 'Active' | 'Returned' | 'Overdue';
export type AuditAction = 'Added' | 'Assigned' | 'Returned' | 'Updated' | 'Deleted' | 'Flagged';

export interface Database {
  public: {
    Tables: {
      assets: {
        Row: {
          id: string;
          asset_tag: string;
          name: string;
          category: AssetCategory;
          serial_number: string;
          purchase_date: string;
          status: AssetStatus;
          location: string;
          assigned_to: string | null;
          assigned_to_id: string | null;
          department: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['assets']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['assets']['Insert']>;
      };
      assignments: {
        Row: {
          id: string;
          asset_id: string;
          asset_tag: string;
          asset_name: string;
          category: AssetCategory;
          staff_name: string;
          staff_id: string;
          department: string;
          date_assigned: string;
          expected_return: string;
          status: AssignmentStatus;
          returned_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['assignments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['assignments']['Insert']>;
      };
      audit_logs: {
        Row: {
          id: string;
          timestamp: string;
          action: AuditAction;
          asset_tag: string;
          asset_name: string;
          performed_by: string;
          details: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id'>;
        Update: never;
      };
    };
  };
}

// Convenience aliases that match your existing component types
export type DBAsset      = Database['public']['Tables']['assets']['Row'];
export type DBAssignment = Database['public']['Tables']['assignments']['Row'];
export type DBAuditLog   = Database['public']['Tables']['audit_logs']['Row'];

// Mappers: DB snake_case → component camelCase
export function toAsset(row: DBAsset) {
  return {
    id:            row.id,
    assetTag:      row.asset_tag,
    name:          row.name,
    category:      row.category,
    serialNumber:  row.serial_number,
    purchaseDate:  row.purchase_date,
    status:        row.status,
    location:      row.location,
    assignedTo:    row.assigned_to  ?? undefined,
    assignedToId:  row.assigned_to_id ?? undefined,
    department:    row.department   ?? undefined,
    notes:         row.notes        ?? undefined,
  };
}

export function toAssignment(row: DBAssignment) {
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

export function toAuditLog(row: DBAuditLog) {
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
