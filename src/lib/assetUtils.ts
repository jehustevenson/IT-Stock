import type { AssetCategory, SchoolSection } from '@/lib/supabase/types';

export const CATEGORIES: AssetCategory[] = [
  'Laptop', 'Desktop', 'Monitor', 'Printer',
  'Networking', 'Accessory', 'Server', 'Phone',
  'iPad', 'System Unit', 'Interactive Screen',
];

export const SCHOOL_PREFIX: Record<SchoolSection, string> = {
  'Infant School':    'INF',
  'Junior School':    'JUN',
  'Secondary School': 'SEC',
};

export const CATEGORY_CODE: Record<AssetCategory, string> = {
  Laptop:     'LT',
  Desktop:    'DT',
  Monitor:    'MN',
  Printer:    'PR',
  Networking: 'NW',
  Accessory:  'AC',
  Server:        'SV',
  Phone:         'PH',
  'iPad':                'IP',
  'System Unit':         'SU',
  'Interactive Screen':  'IS',
};

export const SCHOOL_COLORS: Record<SchoolSection, string> = {
  'Infant School':    'peer-checked:bg-pink-600 peer-checked:border-pink-600 peer-checked:text-white',
  'Junior School':    'peer-checked:bg-violet-600 peer-checked:border-violet-600 peer-checked:text-white',
  'Secondary School': 'peer-checked:bg-teal-600 peer-checked:border-teal-600 peer-checked:text-white',
};

/** School-specific department options — replaces the generic corporate list */
export const SCHOOL_DEPARTMENTS = [
  'Nursery',
  'Reception',
  'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6',
  'Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13',
  'Administration',
  'IT Department',
  'Science Department',
  'Mathematics Department',
  'English Department',
  'Library',
  'Pastoral Care',
  'Senior Leadership',
];

export function generateTag(school: SchoolSection, category: AssetCategory): string {
  const prefix = SCHOOL_PREFIX[school];
  const code   = CATEGORY_CODE[category];
  const num    = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}-${code}-${num}`;
}

/** Convert a filtered Asset array to a CSV string and trigger a browser download. */
export function exportAssetsCSV(
  assets: import('@/lib/supabase/types').Asset[],
  filename = 'assets-export.csv'
): void {
  const headers = [
    'Asset Tag', 'Name', 'Category', 'Serial Number',
    'Purchase Date', 'Status', 'School', 'Location',
    'Assigned To', 'Staff ID', 'Department', 'Notes',
    'Supplier', 'Purchase Cost',
  ];

  const rows = assets.map((a) => [
    a.assetTag,
    a.name,
    a.category,
    a.serialNumber,
    a.purchaseDate,
    a.status,
    a.school ?? '',
    a.location,
    a.assignedTo   ?? '',
    a.assignedToId ?? '',
    a.department   ?? '',
    (a.notes ?? '').replace(/"/g, '""'),
    (a.supplier ?? '').replace(/"/g, '""'),
    a.purchaseCost ?? '',
  ].map((v) => `"${v}"`).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}