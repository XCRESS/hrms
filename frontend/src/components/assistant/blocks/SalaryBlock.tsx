import { format } from 'date-fns';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateOrUpdateSalarySlip, useCreateOrUpdateSalaryStructure } from '@/hooks/queries/useSalary';
import type { SalarySlip, SalaryStructure } from '@/types';
import { cn } from '@/lib/utils';
import { EARNING_KEYS, EARNING_LABELS, type Earnings, type SalarySlipFields, type SalaryStructureFields } from '../types';
import { formatCell } from '../results/format';
import { type DraftEntry, lastOf } from './draftEntries';
import { useDraftVersions } from './useDraftVersions';
import { useDraftCommit, type CommitOutcome } from './useDraftActions';
import { DraftFrame } from './DraftFrame';
import { ConfirmBulk } from './ConfirmBulk';
import { Receipt } from './Receipt';

type Fields = SalaryStructureFields | SalarySlipFields;
const isSlip = (f: Fields): f is SalarySlipFields => 'month' in f;
const money = (n: number) => formatCell(n, 'currency');
const total = (e: Earnings) => EARNING_KEYS.reduce((sum, k) => sum + (Number(e[k]) || 0), 0);

function EarningsTable({ earnings, current, onChange }: { earnings: Earnings; current: Earnings | null; onChange: (e: Earnings) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">Component</th>
            {current && <th scope="col" className="px-3 py-2 text-right font-medium">Current</th>}
            <th scope="col" className="px-3 py-2 text-right font-medium">{current ? 'New' : 'Monthly'}</th>
          </tr>
        </thead>
        <tbody>
          {EARNING_KEYS.map((key) => {
            const changed = current !== null && Number(current[key]) !== Number(earnings[key]);
            return (
              <tr key={key} className="border-t border-border">
                <th scope="row" className="px-3 py-1.5 text-left font-normal">{EARNING_LABELS[key]}</th>
                {current && <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{money(current[key])}</td>}
                <td className={cn('px-2 py-1', changed && 'bg-accent')}>
                  <Input
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={earnings[key]}
                    aria-label={`${EARNING_LABELS[key]} amount`}
                    onChange={(e) => onChange({ ...earnings, [key]: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="h-8 text-right tabular-nums"
                  />
                </td>
              </tr>
            );
          })}
          <tr className="border-t border-border font-semibold">
            <th scope="row" className="px-3 py-2 text-left">Monthly gross</th>
            {current && <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{money(total(current))}</td>}
            <td className="px-3 py-2 text-right tabular-nums">{money(total(earnings))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function SalaryBlock({ entries }: { entries: DraftEntry[] }) {
  const latest = lastOf(entries);
  const versions = useDraftVersions(entries.map((e) => e.draft.fields as unknown as Fields));
  const fields = versions.current;
  const { commit, pending, error, receipt } = useDraftCommit(latest);
  const saveStructure = useCreateOrUpdateSalaryStructure();
  const saveSlip = useCreateOrUpdateSalarySlip();

  const slip = isSlip(fields);
  const period = slip ? format(new Date(fields.year, fields.month - 1, 1), 'MMMM yyyy') : '';
  const title = slip ? `Salary slip · ${fields.employeeName} · ${period}` : `Salary structure · ${fields.employeeName}`;
  if (receipt) return <Receipt receipt={receipt} title={title} />;

  const set = (patch: Partial<Fields>) => versions.edit({ ...fields, ...patch } as Fields);
  const issues = [...latest.draft.issues.filter((i) => !/fill in the earnings/i.test(i)), ...(Number(fields.earnings.basic) > 0 ? [] : ['Basic must be more than zero'])];

  const save = () =>
    commit(async (): Promise<CommitOutcome> => {
      if (isSlip(fields)) {
        const saved = await saveSlip.mutateAsync({
          employeeId: fields.employeeId,
          month: fields.month,
          year: fields.year,
          earnings: fields.earnings,
          deductions: { customDeductions: fields.customDeductions.filter((d) => d.name.trim() && d.amount > 0) },
          taxRegime: fields.taxRegime,
          enableTaxDeduction: fields.enableTaxDeduction,
        } as unknown as Partial<SalarySlip>);
        const net = (saved as Partial<SalarySlip> | undefined)?.netSalary;
        return {
          summary: `${period} slip saved as draft for ${fields.employeeName}${net !== undefined ? ` · net pay ${money(net)}` : ''}`,
          link: '/salary-slips',
          committedFields: { employeeId: fields.employeeId, month: fields.month, year: fields.year, gross: total(fields.earnings), net: net ?? null },
        };
      }
      await saveStructure.mutateAsync({ employeeId: fields.employeeId, earnings: fields.earnings } as unknown as Partial<SalaryStructure>);
      return {
        summary: `Salary structure updated for ${fields.employeeName} · monthly gross ${money(total(fields.earnings))}`,
        link: '/salary-structures',
        committedFields: { employeeId: fields.employeeId, earnings: fields.earnings },
      };
    });

  return (
    <DraftFrame
      anchorId={`draft-${latest.draft.draftId}`}
      title={title}
      subtitle={slip ? 'Tax and net pay are calculated when you save' : undefined}
      issues={issues}
      error={error}
      versions={versions}
      footer={
        <>
          <span className="mr-auto text-xs text-muted-foreground">Monthly gross {money(total(fields.earnings))}</span>
          <ConfirmBulk label={slip ? 'Save draft slip' : 'Save structure'} confirmLabel="Yes, save" warning="" requireSecondPress={false} disabled={issues.length > 0} pending={pending} onConfirm={save} />
        </>
      }
    >
      <EarningsTable earnings={fields.earnings} current={slip ? null : fields.current} onChange={(earnings) => set({ earnings })} />

      {isSlip(fields) && (
        <div className="space-y-3">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Other deductions</legend>
            {fields.customDeductions.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={d.name} placeholder="Name" aria-label={`Deduction ${i + 1} name`} onChange={(e) => set({ customDeductions: fields.customDeductions.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                <Input
                  type="number"
                  min={0}
                  value={d.amount}
                  aria-label={`Deduction ${i + 1} amount`}
                  className="w-32 text-right"
                  onChange={(e) => set({ customDeductions: fields.customDeductions.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) || 0 } : x)) })}
                />
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove deduction ${i + 1}`} onClick={() => set({ customDeductions: fields.customDeductions.filter((_, j) => j !== i) })}>
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => set({ customDeductions: [...fields.customDeductions, { name: '', amount: 0 }] })}>
              <Plus className="size-3.5" />
              Add deduction
            </Button>
          </fieldset>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label htmlFor={`${latest.draft.draftId}-regime`}>Tax regime</Label>
              <Select value={fields.taxRegime} onValueChange={(v) => set({ taxRegime: v as SalarySlipFields['taxRegime'] })}>
                <SelectTrigger id={`${latest.draft.draftId}-regime`} className="mt-1 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New regime</SelectItem>
                  <SelectItem value="old">Old regime</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <Checkbox checked={fields.enableTaxDeduction} onCheckedChange={(v) => set({ enableTaxDeduction: v === true })} />
              Deduct TDS
            </label>
          </div>
        </div>
      )}
    </DraftFrame>
  );
}
