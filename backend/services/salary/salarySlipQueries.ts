import type { Types } from 'mongoose';

/** Employees only ever see finalized slips (Draft → Finalized gates visibility). */
export const salarySlipFilter = (employee: Types.ObjectId, { finalizedOnly, year }: { finalizedOnly: boolean; year?: number }) => ({
  employee,
  ...(finalizedOnly ? { status: 'finalized' } : {}),
  ...(year ? { year } : {}),
});
