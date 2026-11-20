import mongoose, { Schema, type Types } from 'mongoose';
import { GRANTABLE_PERMISSIONS, type GrantablePermission } from '../services/access/permissions.js';

export interface IAccessGrant {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  permission: GrantablePermission;
  employees: Types.ObjectId[];
  grantedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/** Access to specific employees beyond the grantee's own reporting line. */
const accessGrantSchema = new Schema<IAccessGrant>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    permission: { type: String, enum: GRANTABLE_PERMISSIONS, required: true },
    employees: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    grantedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

accessGrantSchema.index({ user: 1, permission: 1 }, { unique: true });

const AccessGrant = mongoose.model<IAccessGrant>('AccessGrant', accessGrantSchema);

export default AccessGrant;
