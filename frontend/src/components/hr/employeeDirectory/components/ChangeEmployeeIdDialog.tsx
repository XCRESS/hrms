import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ChangeEmployeeIdDialog({
    open, onOpenChange, employeeName, currentId, isPending, onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employeeName: string;
    currentId: string;
    isPending: boolean;
    onSubmit: (employeeId: string) => void;
}) {
    const [value, setValue] = useState(currentId);
    const next = value.trim().toUpperCase();
    const unchanged = next === currentId;

    const close = (isOpen: boolean) => {
        if (!isOpen) setValue(currentId);
        onOpenChange(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Change employee ID</DialogTitle>
                    <DialogDescription>
                        {employeeName}&apos;s salary slips, documents, requests and login stay attached;
                        they are updated to the new ID.
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="space-y-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (next && !unchanged) onSubmit(next);
                    }}
                >
                    <Label htmlFor="new-employee-id">New employee ID</Label>
                    <Input
                        id="new-employee-id"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        autoFocus
                        autoComplete="off"
                    />
                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={() => close(false)} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending || !next || unchanged}>
                            {isPending ? 'Changing…' : 'Change ID'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
