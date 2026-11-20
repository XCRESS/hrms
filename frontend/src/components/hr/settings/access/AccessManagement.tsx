import ReportingLines from './ReportingLines';
import AccessGrants from './AccessGrants';

export default function AccessManagement({ isAdmin }: { isAdmin: boolean }) {
    return (
        <div className="space-y-10">
            <ReportingLines />
            {isAdmin && <AccessGrants />}
        </div>
    );
}
