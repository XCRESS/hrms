import { ProfileField, type ProfileFieldType } from './ProfileField';
import { useCompanies, useDepartments } from '@/hooks/queries';
import type { Employee } from '@/types';

type FieldDef = {
    label: string;
    name: keyof Employee | string;
    type?: ProfileFieldType;
    options?: string[];
    readOnly?: boolean;
};

const GROUPS: { title: string; fields: FieldDef[] }[] = [
    {
        title: 'Contact & work',
        fields: [
            { label: 'Email', name: 'email', type: 'email' },
            { label: 'Phone', name: 'phone', type: 'tel' },
            { label: 'Employee ID', name: 'employeeId', readOnly: true },
            { label: 'Department', name: 'department', type: 'select' },
            { label: 'Position', name: 'position' },
            { label: 'Company', name: 'companyName', type: 'select' },
            { label: 'Employment type', name: 'employmentType', type: 'select', options: ['fulltime', 'intern', 'remote'] },
            { label: 'Joining date', name: 'joiningDate', type: 'date' },
            { label: 'Office', name: 'officeAddress', type: 'select', options: ['SanikColony', 'Indore', 'N.F.C.', 'Offsite'] },
            { label: 'Supervisor', name: 'reportingSupervisor' },
        ],
    },
    {
        title: 'Personal',
        fields: [
            { label: 'First name', name: 'firstName' },
            { label: 'Last name', name: 'lastName' },
            { label: 'Date of birth', name: 'dateOfBirth', type: 'date' },
            { label: 'Gender', name: 'gender', type: 'select', options: ['male', 'female', 'other'] },
            { label: 'Marital status', name: 'maritalStatus', type: 'select', options: ['single', 'married', 'divorced'] },
            { label: "Father's name", name: 'fatherName' },
            { label: "Father's phone", name: 'fatherPhone', type: 'tel' },
            { label: "Mother's name", name: 'motherName' },
            { label: "Mother's phone", name: 'motherPhone', type: 'tel' },
            { label: 'Address', name: 'address' },
            { label: 'Aadhaar', name: 'aadhaarNumber' },
            { label: 'PAN', name: 'panNumber' },
            { label: 'Emergency contact', name: 'emergencyContactName' },
            { label: 'Emergency number', name: 'emergencyContactNumber', type: 'tel' },
        ],
    },
    {
        title: 'Financial',
        fields: [
            { label: 'Bank', name: 'bankName' },
            { label: 'Account number', name: 'bankAccountNumber' },
            { label: 'IFSC', name: 'bankIFSCCode' },
            { label: 'Payment mode', name: 'paymentMode', type: 'select', options: ['Bank Transfer', 'Cheque', 'Cash'] },
        ],
    },
];

export function ProfileFields({
    employee, draft, isEditing, errors, onFieldChange,
}: {
    employee: Employee;
    draft: Partial<Employee> | null;
    isEditing: boolean;
    errors: Record<string, string>;
    onFieldChange: (name: string, value: string) => void;
}) {
    const source = (isEditing && draft ? draft : employee) as Record<string, unknown>;
    const { data: companies = [] } = useCompanies();
    const { data: departments = [] } = useDepartments();
    const companyOptions = companies.map((c) => c.name);
    if (employee.companyName && !companyOptions.includes(employee.companyName)) {
        companyOptions.push(employee.companyName);
    }
    const departmentOptions = [...departments];
    if (employee.department && !departmentOptions.includes(employee.department)) {
        departmentOptions.push(employee.department);
    }
    const dynamicOptions: Record<string, string[]> = {
        companyName: companyOptions,
        department: departmentOptions,
    };

    return (
        // Sections are full-width bands with fields in columns inside. Side by
        // side they can't work: their field counts differ too much.
        <div className="space-y-5">
            {GROUPS.map((group) => (
                <section
                    key={group.title}
                    className="overflow-hidden rounded-xl border border-border bg-card"
                >
                    <h3 className="border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {group.title}
                    </h3>
                    <dl className="grid grid-cols-1 gap-x-8 px-4 py-2 md:grid-cols-2 xl:grid-cols-3">
                        {group.fields.map((f) => (
                            <ProfileField
                                key={String(f.name)}
                                label={f.label}
                                name={String(f.name)}
                                value={source[String(f.name)]}
                                type={f.type}
                                options={dynamicOptions[String(f.name)] ?? f.options}
                                isEditing={isEditing && !f.readOnly}
                                error={errors[String(f.name)]}
                                onChange={onFieldChange}
                            />
                        ))}
                    </dl>
                </section>
            ))}
        </div>
    );
}
