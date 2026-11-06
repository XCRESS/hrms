export type Cell = string | number | null;
export type ColumnKind = 'text' | 'number' | 'currency' | 'date' | 'time' | 'hours' | 'status';
export interface ColumnSpec { key: string; label: string; kind: ColumnKind }
export interface TileFilter { column: string; equals: string }
export interface Tile {
  key: string;
  label: string;
  value: number;
  kind?: ColumnKind;
  tone?: 'neutral' | 'positive' | 'warning' | 'negative';
  filter?: TileFilter;
  sumOf?: string;
}
export interface ChartSpec { type: 'bar' | 'line' | 'donut'; x: string; series: { key: string; label: string }[] }
export interface ResultView {
  kind: 'result';
  title: string;
  subtitle?: string;
  columns: ColumnSpec[];
  rows: Record<string, Cell>[];
  tiles?: Tile[];
  chart?: ChartSpec;
  defaultView: 'table' | 'chart';
  link?: { label: string; href: string };
  splitBy?: string;
}

export const BULK_CONFIRM_THRESHOLD = 20;

export type DraftKind =
  | 'announcement'
  | 'email'
  | 'holiday'
  | 'taskReportCheckout'
  | 'leave'
  | 'wfh'
  | 'regularization'
  | 'help'
  | 'approval'
  | 'salaryStructure'
  | 'salarySlip'
  | 'salaryBatch'
  | 'roleChange'
  | 'employeeStatus'
  | 'attendanceFix';

export interface Receipt {
  at: string;
  summary: string;
  link?: string | null;
  committedFields: Record<string, unknown>;
}

export interface Draft<F = Record<string, unknown>> {
  kind: 'draft';
  draftKind: DraftKind;
  draftId: string;
  revision: number;
  fields: F;
  issues: string[];
  notes?: string;
  alternatives?: { label: string; fields: Partial<F> }[];
  bulk?: { count: number; requiresSecondConfirm: boolean };
  receipt?: Receipt;
}

export interface AnnouncementFields { title: string; content: string; targetAudience: 'all' | 'employee' | 'hr' | 'admin' }
export interface Recipient { name: string; email: string }
export interface EmailFields {
  to: Recipient[];
  unresolved: { query: string; candidates: Recipient[] }[];
  subject: string;
  body: string;
  table?: { columns: { key: string; label: string }[]; rows: Record<string, Cell>[] } | null;
}
export interface HolidayFields { title: string; date: string; type: 'public' | 'optional' | 'restricted'; isOptional: boolean; description: string }
export interface TaskReportCheckoutFields { tasks: string[]; checkOut: boolean; date: string }
export interface LeaveFields { leaveType: 'full-day' | 'half-day'; startDate: string; endDate: string; reason: string }
export interface WFHFields { reason: string }
export interface RegularizationFields { date: string; requestedCheckIn: string; requestedCheckOut: string; reason: string }
export interface HelpFields { subject: string; description: string; category: string; priority: 'low' | 'medium' | 'high' }

export const EARNING_KEYS = ['basic', 'hra', 'conveyance', 'medical', 'lta', 'specialAllowance', 'mobileAllowance'] as const;
export type EarningKey = (typeof EARNING_KEYS)[number];
export type Earnings = Record<EarningKey, number>;
export const EARNING_LABELS: Record<EarningKey, string> = {
  basic: 'Basic',
  hra: 'HRA',
  conveyance: 'Conveyance',
  medical: 'Medical',
  lta: 'LTA',
  specialAllowance: 'Special allowance',
  mobileAllowance: 'Mobile allowance',
};
export interface SalaryStructureFields { employeeId: string; employeeName: string; earnings: Earnings; current: Earnings | null }
export interface SalarySlipFields {
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  earnings: Earnings;
  customDeductions: { name: string; amount: number }[];
  taxRegime: 'old' | 'new';
  enableTaxDeduction: boolean;
}

export interface ApprovalRow { id: string; employeeName: string; date: string; detail: string; preselected: boolean; flag?: string }
export interface ApprovalFields { domain: 'leave' | 'wfh' | 'regularization' | 'expense'; decision: 'approved' | 'rejected'; rows: ApprovalRow[] }
export interface SalaryBatchRow { employeeId: string; employeeName: string; preselected: boolean; flag?: string }
export interface SalaryBatchFields { action: 'generate' | 'publish' | 'unpublish'; month: number; year: number; taxRegime: 'old' | 'new'; enableTaxDeduction: boolean; rows: SalaryBatchRow[] }

type Role = 'admin' | 'hr' | 'employee';
export interface RoleChangeFields { userId: string; name: string; email: string; fromRole: Role; toRole: Role }
export interface EmployeeStatusFields { employeeObjId: string; name: string; employeeId: string; fromActive: boolean; toActive: boolean }

export interface AttendanceFixRow { recordId: string; date: string; checkIn: string; preselected: boolean; flag?: string }
export interface AttendanceFixFields { employeeName: string; checkOutTime: string; rows: AttendanceFixRow[] }

export interface FileResult {
  kind: 'file';
  id: string;
  name: string;
  mediaType: string;
  size: number;
  description: string;
  preview?: ResultView;
}

export const isFileResult = (value: unknown): value is FileResult => (value as Partial<FileResult> | null)?.kind === 'file';
export const isToolError = (value: unknown): value is { kind: 'error'; message: string } => (value as { kind?: string } | null)?.kind === 'error';

export const isResultView = (value: unknown): value is ResultView => (value as Partial<ResultView> | null)?.kind === 'result';
export const isDraft = (value: unknown): value is Draft => (value as Partial<Draft> | null)?.kind === 'draft';
