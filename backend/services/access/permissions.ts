import type { UserRole } from '../../types/index.js';

interface PermissionRule {
  label: string;
  /** Roles that hold this permission over every employee. */
  orgWide: readonly UserRole[];
  /** Supervisors hold it over everyone below them in the reporting line. */
  reportingLine: boolean;
  /** Admin may grant it over specific employees. */
  grantable: boolean;
}

export const PERMISSIONS = {
  'attendance.view': {
    label: 'View attendance',
    orgWide: ['admin', 'hr'],
    reportingLine: true,
    grantable: true,
  },
  'taskReports.view': {
    label: 'View task reports',
    orgWide: ['admin', 'hr'],
    reportingLine: true,
    grantable: true,
  },
} as const satisfies Record<string, PermissionRule>;

export type Permission = keyof typeof PERMISSIONS;

export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Permission[];

export const GRANTABLE_PERMISSIONS = PERMISSION_KEYS.filter((key) => PERMISSIONS[key].grantable);

export type GrantablePermission = Permission;
