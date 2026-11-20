import { formatIndianNumber } from './indianNumber';
import type { Company } from '@/types';

interface Earnings {
  basic: number;
  hra: number;
  conveyance: number;
  medical: number;
  lta: number;
  specialAllowance: number;
  mobileAllowance: number;
}

interface CustomDeduction {
  name: string;
  amount: number;
}

interface Deductions {
  incomeTax?: number;
  tds?: number;
  customDeductions?: CustomDeduction[];
}

interface EmployeeInfo {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  department?: string;
  position?: string;
  bankName?: string;
  bankAccountNumber?: string;
  panNumber?: string;
  joiningDate?: string;
}

interface SalarySlipForPDF {
  employeeId: string;
  year: number;
  month?: number;
  earnings: Earnings;
  deductions?: Deductions;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  netSalaryInWords?: string;
  employee?: EmployeeInfo;
}

interface LineItem {
  label: string;
  value: number;
}

const escapeHtml = (text: unknown): string => {
  if (text === null || text === undefined || text === '') return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
};

const formatDate = (value?: string): string => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (isNaN(date.getTime())) return 'N/A';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
};

const buildEarnings = (slip: SalarySlipForPDF): LineItem[] => [
  { label: 'Basic Salary', value: slip.earnings?.basic ?? 0 },
  { label: 'HRA', value: slip.earnings?.hra ?? 0 },
  { label: 'Conveyance Allowance', value: slip.earnings?.conveyance ?? 0 },
  { label: 'Medical Allowance', value: slip.earnings?.medical ?? 0 },
  { label: 'LTA', value: slip.earnings?.lta ?? 0 },
  { label: 'Special Allowance', value: slip.earnings?.specialAllowance ?? 0 },
  { label: 'Mobile Allowance', value: slip.earnings?.mobileAllowance ?? 0 },
];

const buildDeductions = (slip: SalarySlipForPDF): LineItem[] => {
  const custom = (slip.deductions?.customDeductions ?? [])
    .filter((d) => d.amount > 0)
    .map((d) => ({ label: d.name, value: d.amount }));
  return [...custom, { label: 'Income Tax', value: slip.deductions?.incomeTax ?? 0 }];
};

const renderRows = (items: LineItem[]): string =>
  items
    .map(
      (item) => `
        <div class="row">
          <div class="cell">${escapeHtml(item.label)}</div>
          <div class="cell amount">${formatIndianNumber(item.value)}</div>
        </div>`
    )
    .join('');

const renderDetail = (label: string, value: string): string => `
  <div class="detail">
    <span class="detail-label">${label}</span>
    <span class="detail-colon">:</span>
    <span class="detail-value">${value}</span>
  </div>`;

/**
 * Opens the salary slip in a new window and triggers the browser print dialog
 * (users save it as PDF from there).
 */
export const downloadSalarySlipPDF = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  slip: SalarySlipForPDF | any,
  employeeName: string,
  monthName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  employeeData: EmployeeInfo | any = null,
  companies: Company[] = []
): void => {
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    console.error('Failed to open print window. Please allow popups for this site.');
    return;
  }

  // Absolute URL: the print window is about:blank, so relative paths don't resolve.
  const companyLogo = `${window.location.origin}/cfg-logo.jpg`;

  const companyName: string = employeeData?.companyName || slip.employee?.companyName || '';
  const companyAddress = companies.find((c) => c.name.toLowerCase() === companyName.toLowerCase())?.address ?? '';

  const fallbackName = employeeData
    ? `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim()
    : slip.employee
      ? `${slip.employee.firstName || ''} ${slip.employee.lastName || ''}`.trim()
      : 'N/A';
  const pick = (key: keyof EmployeeInfo): string =>
    escapeHtml(employeeData?.[key] || slip.employee?.[key] || 'N/A');

  const safeEmployeeName = escapeHtml(employeeName?.trim() ? employeeName : fallbackName);
  const safePeriod = escapeHtml(`${monthName} ${slip.year}`.toUpperCase());
  const joiningDate = escapeHtml(formatDate(employeeData?.joiningDate || slip.employee?.joiningDate));

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Salary Slip - ${safeEmployeeName} - ${safePeriod}</title>
      <style>
        @page { size: A4 landscape; margin: 8mm; }

        :root {
          --navy: #0f2f7a;
          --blue: #1f63ad;
          --tint: #d6e9fb;
          --tint-soft: #eaf4fd;
          --line: #9cc7ee;
          --text: #1b2a4a;
        }

        * { box-sizing: border-box; }

        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          margin: 0;
          padding: 16px;
          color: var(--text);
          background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .slip { width: 1040px; margin: 0 auto; break-inside: avoid; }

        .header {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 84px;
          padding: 2px 200px 8px;
          border-bottom: 2px solid var(--navy);
          text-align: center;
        }
        .company-info { width: 100%; min-width: 0; }
        .company-name {
          margin: 0;
          font-size: 30px;
          font-weight: 700;
          color: var(--navy);
          white-space: nowrap;
          overflow: hidden;
        }
        .company-address {
          margin: 6px 0 0;
          font-size: 16px;
          line-height: 1.35;
          text-wrap: balance;
        }
        .logo {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 170px;
          height: 88px;
          object-fit: cover;
          mix-blend-mode: multiply;
        }

        .title-bar {
          margin-top: 12px;
          padding: 10px 16px;
          background: var(--tint);
          border-radius: 8px;
          font-size: 19px;
          font-weight: 700;
          color: var(--navy);
          letter-spacing: 0.3px;
        }

        .panel {
          margin-top: 10px;
          border: 1px solid var(--line);
          border-radius: 8px;
          overflow: hidden;
        }
        .panel-heading {
          padding: 7px 16px;
          background: var(--tint);
          font-size: 18px;
          font-weight: 700;
          color: var(--navy);
        }
        .details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 32px;
          padding: 8px 20px 10px;
        }
        .detail {
          display: grid;
          grid-template-columns: 150px 24px 1fr;
          padding: 3px 0;
          font-size: 15px;
        }
        .detail-label { font-weight: 700; color: var(--navy); }
        .detail-colon { color: var(--navy); }
        .detail-value { word-break: break-word; }

        .tables {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 12px;
        }
        .table {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--line);
          border-radius: 6px;
          overflow: hidden;
        }
        .table-title {
          padding: 7px 16px;
          background: var(--blue);
          color: #fff;
          font-size: 18px;
          font-weight: 700;
        }
        .row {
          display: grid;
          grid-template-columns: 1fr 200px;
          border-bottom: 1px solid #cfe3f6;
          font-size: 14.5px;
        }
        .cell { padding: 5px 16px; }
        .cell + .cell { border-left: 1px solid var(--line); }
        .amount { text-align: right; }
        .row.head {
          background: var(--tint-soft);
          font-weight: 700;
          color: var(--navy);
          font-size: 15px;
        }
        .rows { flex: 1; }
        .row.total {
          border-bottom: none;
          border-top: 1px solid var(--line);
          background: var(--tint);
          font-weight: 700;
          color: var(--navy);
          font-size: 15.5px;
        }

        .net {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 22px;
          margin-top: 14px;
          padding: 12px 16px;
          background: var(--tint);
          border-radius: 8px;
          font-size: 19px;
          font-weight: 700;
          color: var(--navy);
        }
        .net-divider { width: 2px; height: 28px; background: var(--navy); }

        .footnote {
          margin: 10px 0 0;
          text-align: center;
          font-size: 13px;
          color: var(--navy);
        }

        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="slip">
        <div class="header">
          <div class="company-info">
            <h1 class="company-name">${escapeHtml(companyName)}</h1>
            ${companyAddress ? `<p class="company-address">${escapeHtml(companyAddress)}</p>` : ''}
          </div>
          <img src="${companyLogo}" alt="" class="logo" onerror="this.style.display='none'">
        </div>

        <div class="title-bar">SALARY SLIP &ndash; ${safePeriod}</div>

        <div class="panel">
          <div class="panel-heading">Employee Details</div>
          <div class="details">
            <div>
              ${renderDetail('Employee ID', escapeHtml(slip.employeeId))}
              ${renderDetail('Department', pick('department'))}
              ${renderDetail('Position', pick('position'))}
              ${renderDetail('Bank Name', pick('bankName'))}
              ${renderDetail('Joining Date', joiningDate)}
            </div>
            <div>
              ${renderDetail('Name', safeEmployeeName)}
              ${renderDetail('A/C Number', pick('bankAccountNumber'))}
              ${renderDetail('PAN Number', pick('panNumber'))}
            </div>
          </div>
        </div>

        <div class="tables">
          <div class="table">
            <div class="table-title">EARNINGS</div>
            <div class="row head">
              <div class="cell">Earnings Component</div>
              <div class="cell amount">Amount (&#8377;)</div>
            </div>
            <div class="rows">${renderRows(buildEarnings(slip))}</div>
            <div class="row total">
              <div class="cell">Total Earnings</div>
              <div class="cell amount">${formatIndianNumber(slip.grossSalary)}</div>
            </div>
          </div>

          <div class="table">
            <div class="table-title">DEDUCTIONS</div>
            <div class="row head">
              <div class="cell">Deduction Component</div>
              <div class="cell amount">Amount (&#8377;)</div>
            </div>
            <div class="rows">${renderRows(buildDeductions(slip))}</div>
            <div class="row total">
              <div class="cell">Total Deductions</div>
              <div class="cell amount">${formatIndianNumber(slip.totalDeductions)}</div>
            </div>
          </div>
        </div>

        <div class="net">
          <span>NET SALARY</span>
          <span class="net-divider"></span>
          <span>&#8377;${formatIndianNumber(slip.netSalary)}</span>
        </div>

        <p class="footnote">This salary slip is system-generated and does not require signature.</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // A4 landscape minus 8mm margins leaves ~733px of height; long deduction
  // lists would otherwise push Net Salary onto a second page.
  const PRINTABLE_HEIGHT_PX = 720;
  const fitCompanyName = () => {
    const nameEl = printWindow.document.querySelector<HTMLElement>('.company-name');
    if (!nameEl) return;
    for (let size = 30; size >= 18 && nameEl.scrollWidth > nameEl.clientWidth; size--) {
      nameEl.style.fontSize = `${size}px`;
    }
  };

  const fitToSinglePage = () => {
    const slipEl = printWindow.document.querySelector<HTMLElement>('.slip');
    if (!slipEl) return;
    slipEl.style.zoom = '1';
    const scale = PRINTABLE_HEIGHT_PX / slipEl.scrollHeight;
    if (scale < 1) slipEl.style.zoom = String(Math.floor(scale * 100) / 100);
  };

  let printed = false;
  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    fitCompanyName();
    fitToSinglePage();
    printWindow.focus();
    printWindow.print();
  };

  printWindow.onload = () => setTimeout(triggerPrint, 300);
  setTimeout(() => {
    if (printWindow.document.readyState === 'complete') triggerPrint();
  }, 1000);
};
