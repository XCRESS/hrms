import type { Response } from 'express';
import mongoose, { type Types } from 'mongoose';
import AccessGrant from '../models/AccessGrant.model.js';
import Employee from '../models/Employee.model.js';
import User from '../models/User.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { formatResponse } from '../utils/response.js';
import { paramValue } from '../utils/helpers.js';
import type { IAuthRequest, UserRole } from '../types/index.js';
import type { TeamQuery, UpsertAccessGrantInput } from '../validators/access.schemas.js';
import { getValidatedQuery } from '../middlewares/zodValidation.middleware.js';
import { PERMISSIONS, PERMISSION_KEYS, employeeScopeFilter, resolveScope, type Permission } from '../services/access/index.js';

type ScopeSummary = { scope: 'all' } | { scope: 'team'; count: number } | { scope: 'none' };

export const getMyAccess = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const user = req.user!;
  const entries = await Promise.all(
    PERMISSION_KEYS.map(async (permission): Promise<[Permission, ScopeSummary]> => {
      const scope = await resolveScope(user, permission);
      if (scope.kind === 'all') return [permission, { scope: 'all' }];
      const count = scope.ids.length
        ? await Employee.countDocuments({ _id: { $in: scope.ids }, isActive: true })
        : 0;
      return [permission, count ? { scope: 'team', count } : { scope: 'none' }];
    })
  );

  res.json(formatResponse(true, 'Access retrieved', { permissions: Object.fromEntries(entries) }));
});

/** Active employees the caller can see for one permission; feeds team filters. */
export const getTeamMembers = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { permission } = getValidatedQuery<TeamQuery>(req);
  const scope = await resolveScope(req.user!, permission);

  const employees = scope.kind === 'some' && scope.ids.length === 0
    ? []
    : await Employee.find({ isActive: true, ...employeeScopeFilter(scope) })
      .select('_id employeeId firstName lastName department position')
      .sort({ firstName: 1, lastName: 1 })
      .lean();

  res.json(formatResponse(true, 'Team retrieved', { employees }));
});

interface PopulatedGrant {
  _id: Types.ObjectId;
  permission: Permission;
  user: { _id: Types.ObjectId; name: string; email: string; role: UserRole } | null;
  employees: { _id: Types.ObjectId; firstName: string; lastName: string; employeeId: string; isActive: boolean }[];
  grantedBy: { name: string } | null;
  updatedAt: Date;
}

export const listAccessGrants = asyncHandler(async (_req: IAuthRequest, res: Response) => {
  const grants = await AccessGrant.find()
    .populate('user', 'name email role')
    .populate('employees', 'firstName lastName employeeId isActive')
    .populate('grantedBy', 'name')
    .sort({ updatedAt: -1 })
    .lean<PopulatedGrant[]>();

  const data = grants
    .filter((grant) => grant.user)
    .map((grant) => ({
      _id: grant._id,
      permission: grant.permission,
      permissionLabel: PERMISSIONS[grant.permission].label,
      user: grant.user,
      employees: grant.employees.filter(Boolean),
      grantedBy: grant.grantedBy?.name ?? null,
      updatedAt: grant.updatedAt,
    }));

  res.json(formatResponse(true, 'Access grants retrieved', { grants: data }));
});

export const upsertAccessGrant = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { userId, permission, employeeIds } = req.body as UpsertAccessGrantInput;

  const user = await User.findById(userId).select('role isActive').lean();
  if (!user?.isActive) throw new NotFoundError('User not found or inactive');

  if ((PERMISSIONS[permission].orgWide as readonly string[]).includes(user.role)) {
    throw new ValidationError(`${user.role.toUpperCase()} users already have "${PERMISSIONS[permission].label}" for everyone`);
  }

  if (employeeIds.length === 0) {
    await AccessGrant.deleteOne({ user: userId, permission });
    res.json(formatResponse(true, 'Access removed', null));
    return;
  }

  const unique = [...new Set(employeeIds)];
  const found = await Employee.countDocuments({ _id: { $in: unique } });
  if (found !== unique.length) throw new ValidationError('Some selected employees no longer exist');

  const grant = await AccessGrant.findOneAndUpdate(
    { user: userId, permission },
    { employees: unique, grantedBy: req.user!._id },
    { upsert: true, new: true, runValidators: true }
  ).lean();

  res.json(formatResponse(true, 'Access saved', grant));
});

export const deleteAccessGrant = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const id = paramValue(req.params.id);
  if (!id || !mongoose.isValidObjectId(id)) throw new ValidationError('Grant is required');

  const result = await AccessGrant.deleteOne({ _id: id });
  if (result.deletedCount === 0) throw new NotFoundError('Access grant not found');

  res.json(formatResponse(true, 'Access removed', null));
});
