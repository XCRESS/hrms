import type { Types } from 'mongoose';
import Employee from '../../models/Employee.model.js';
import AccessGrant from '../../models/AccessGrant.model.js';
import type { EmployeeScope, IAuthUser } from '../../types/index.js';
import { PERMISSIONS, type Permission } from './permissions.js';

const MAX_REPORTING_DEPTH = 20;

/** Everyone below `supervisorId` in the reporting line, direct and indirect. */
export async function getReportingTree(supervisorId: Types.ObjectId): Promise<Types.ObjectId[]> {
  const [result] = await Employee.aggregate<{ reports: { _id: Types.ObjectId }[] }>([
    { $match: { _id: supervisorId } },
    {
      $graphLookup: {
        from: Employee.collection.name,
        startWith: '$_id',
        connectFromField: '_id',
        connectToField: 'supervisor',
        as: 'reports',
        maxDepth: MAX_REPORTING_DEPTH,
      },
    },
    { $project: { 'reports._id': 1 } },
  ]);
  return (result?.reports ?? []).map((report) => report._id).filter((id) => !id.equals(supervisorId));
}

/** Reporting line plus explicit grants, or everyone for org-wide roles. */
export async function resolveScope(user: IAuthUser, permission: Permission): Promise<EmployeeScope> {
  const rule = PERMISSIONS[permission];
  if ((rule.orgWide as readonly string[]).includes(user.role)) return { kind: 'all' };

  const [tree, grant] = await Promise.all([
    rule.reportingLine && user.employee ? getReportingTree(user.employee) : Promise.resolve([]),
    rule.grantable
      ? AccessGrant.findOne({ user: user._id, permission }).select('employees').lean()
      : Promise.resolve(null),
  ]);

  const unique = new Map<string, Types.ObjectId>();
  for (const id of [...tree, ...(grant?.employees ?? [])]) unique.set(String(id), id);
  return { kind: 'some', ids: [...unique.values()] };
}

export function scopeIncludes(scope: EmployeeScope, employeeId: Types.ObjectId | string): boolean {
  if (scope.kind === 'all') return true;
  return scope.ids.some((id) => id.equals(employeeId));
}

/** Mongo filter on Employee `_id` for a scope. */
export function employeeScopeFilter(scope: EmployeeScope): { _id?: { $in: Types.ObjectId[] } } {
  return scope.kind === 'all' ? {} : { _id: { $in: scope.ids } };
}
