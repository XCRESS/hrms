import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { useEmployees, useSetEmployeeSupervisor } from '@/hooks/queries';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { employeeDisplayName } from '@/components/hr/employeeDirectory/employeeName';
import type { Employee } from '@/types';

// Radix Select reserves "" for "no value", so "no supervisor" needs a sentinel.
const NO_SUPERVISOR = '__none__';

export default function ReportingLines() {
    const { toast } = useToast();
    const { data: employees = [], isLoading } = useEmployees({ status: 'active' });
    const setSupervisor = useSetEmployeeSupervisor();

    const [search, setSearch] = useState('');
    const [onlyUnassigned, setOnlyUnassigned] = useState(false);

    const sorted = [...employees].sort((a, b) => employeeDisplayName(a).localeCompare(employeeDisplayName(b)));
    const byId = new Map(sorted.map((e) => [e._id, e]));
    const reportCount = new Map<string, number>();
    for (const e of sorted) {
        if (e.supervisor) reportCount.set(e.supervisor, (reportCount.get(e.supervisor) ?? 0) + 1);
    }
    const hasSupervisor = (e: Employee) => !!e.supervisor && byId.has(e.supervisor);
    const assigned = sorted.filter(hasSupervisor).length;

    const needle = search.trim().toLowerCase();
    const visible = sorted.filter((e) => {
        if (onlyUnassigned && hasSupervisor(e)) return false;
        if (!needle) return true;
        return [employeeDisplayName(e), e.employeeId, e.department, e.position]
            .some((v) => v?.toLowerCase().includes(needle));
    });

    const handleChange = async (employee: Employee, value: string) => {
        const supervisorId = value === NO_SUPERVISOR ? null : value;
        try {
            await setSupervisor.mutateAsync({ employeeId: employee._id, supervisorId });
            const supervisor = supervisorId ? byId.get(supervisorId) : undefined;
            toast({
                variant: 'success',
                title: 'Reporting supervisor updated',
                description: supervisor
                    ? `${employeeDisplayName(employee)} now reports to ${employeeDisplayName(supervisor)}.`
                    : `${employeeDisplayName(employee)} has no reporting supervisor.`,
            });
        } catch (err) {
            toast({
                variant: 'destructive',
                title: 'Could not update reporting supervisor',
                description: err instanceof Error ? err.message : 'Action failed',
            });
        }
    };

    return (
        <section aria-labelledby="reporting-lines-heading" className="space-y-4">
            <div>
                <h2 id="reporting-lines-heading" className="text-base font-semibold text-foreground">
                    Reporting supervisors
                </h2>
                <p className="text-sm text-muted-foreground">
                    A supervisor sees attendance for everyone who reports to them, directly or through someone else.{' '}
                    {!isLoading && `${assigned} of ${sorted.length} employees have a supervisor.`}
                </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, ID, department"
                        aria-label="Search employees"
                        className="pl-9"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="only-unassigned"
                        checked={onlyUnassigned}
                        onCheckedChange={(checked) => setOnlyUnassigned(checked === true)}
                    />
                    <Label htmlFor="only-unassigned">Only without a supervisor</Label>
                </div>
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-border">
                {isLoading ? (
                    <p className="p-8 text-center text-muted-foreground">Loading employees...</p>
                ) : visible.length === 0 ? (
                    <div className="p-8 text-center">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                        <p className="text-muted-foreground">No employees match.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-border max-h-140 overflow-y-auto">
                        {visible.map((employee) => {
                            const reports = reportCount.get(employee._id) ?? 0;
                            const current = (hasSupervisor(employee) && employee.supervisor) || NO_SUPERVISOR;
                            const name = employeeDisplayName(employee);
                            return (
                                <li key={employee._id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-medium text-sm text-foreground truncate">{name}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {employee.employeeId}
                                            {employee.position && ` · ${employee.position}`}
                                            {reports > 0 && ` · supervises ${reports}`}
                                        </p>
                                    </div>
                                    <Select
                                        value={current}
                                        onValueChange={(value) => handleChange(employee, value)}
                                        disabled={setSupervisor.isPending}
                                    >
                                        <SelectTrigger className="w-full sm:w-64" aria-label={`Reporting supervisor for ${name}`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={NO_SUPERVISOR}>No supervisor</SelectItem>
                                            {sorted
                                                .filter((candidate) => candidate._id !== employee._id)
                                                .map((candidate) => (
                                                    <SelectItem key={candidate._id} value={candidate._id}>
                                                        {employeeDisplayName(candidate)} ({candidate.employeeId})
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </section>
    );
}
