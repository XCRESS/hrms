import { formatIndianNumber, getCompanyAddress } from './indianNumber';

// Types for salary slip PDF generation
interface CustomDeduction {
  name: string;
  amount: number;
}

interface Earnings {
  basic: number;
  hra: number;
  conveyance: number;
  medical: number;
  lta: number;
  specialAllowance: number;
  mobileAllowance: number;
}

interface Deductions {
  incomeTax: number;
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

interface SalarySlip {
  employeeId: string;
  year: number;
  earnings: Earnings;
  deductions: Deductions;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  netSalaryInWords: string;
  employee?: EmployeeInfo;
}

// Sanitize HTML to prevent XSS attacks
const escapeHtml = (text: unknown): string => {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
};

export const downloadSalarySlipPDF = (
  slip: SalarySlip,
  employeeName: string,
  monthName: string,
  employeeData: EmployeeInfo | null = null
): void => {
  // Create a new window for PDF
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    console.error('Failed to open print window. Please allow popups for this site.');
    return;
  }

  const companyLogo = '/cfg-logo.jpg'; // Logo from public folder

  // Get company name and address
  const companyName = employeeData?.companyName || slip.employee?.companyName || 'Indra Financial Services Limited';
  const companyAddress = getCompanyAddress(companyName);

  // Sanitize all user-provided data
  const safeCompanyName = escapeHtml(companyName);
  const safeCompanyAddress = escapeHtml(companyAddress);
  const safeEmployeeName = escapeHtml(employeeName && employeeName.trim() !== '' ? employeeName : (employeeData ? `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim() : (slip.employee ? `${slip.employee.firstName || ''} ${slip.employee.lastName || ''}`.trim() : 'N/A')));
  const safeMonthName = escapeHtml(monthName);
  const safeEmployeeId = escapeHtml(slip.employeeId);
  const safeDepartment = escapeHtml(employeeData?.department || slip.employee?.department || 'N/A');
  const safePosition = escapeHtml(employeeData?.position || slip.employee?.position || 'N/A');
  const safeBankName = escapeHtml(employeeData?.bankName || slip.employee?.bankName || 'N/A');
  const safeBankAccountNumber = escapeHtml(employeeData?.bankAccountNumber || slip.employee?.bankAccountNumber || 'N/A');
  const safePanNumber = escapeHtml(employeeData?.panNumber || slip.employee?.panNumber || 'N/A');
  const safeNetSalaryInWords = escapeHtml(slip.netSalaryInWords);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Salary Slip - ${safeEmployeeName}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
          line-height: 1.4;
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
          border: 2px solid #000;
          padding: 0;
        }

        .header {
          display: flex;
          align-items: center;
          padding: 20px;
          border-bottom: 2px solid #000;
          background-color: #f8f9fa;
        }

        .logo {
          width: 80px;
          height: 80px;
          margin-right: 20px;
          border-radius: 8px;
        }

        .company-info {
          flex: 1;
        }

        .company-name {
          font-size: 24px;
          font-weight: bold;
          margin: 0;
          color: #2c3e50;
        }

        .company-address {
          font-size: 14px;
          color: #7f8c8d;
          margin: 5px 0 0 0;
          line-height: 1.3;
        }

        .payslip-info {
          text-align: right;
        }

        .payslip-title {
          font-size: 20px;
          font-weight: bold;
          margin: 0;
          color: #e74c3c;
        }

        .period {
          font-size: 16px;
          margin: 5px 0 0 0;
          color: #7f8c8d;
        }

        .employee-details {
          padding: 20px;
          background-color: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
        }

        .employee-details h3 {
          margin: 0 0 15px 0;
          font-size: 18px;
          color: #2c3e50;
          border-bottom: 1px solid #bdc3c7;
          padding-bottom: 5px;
        }

        .employee-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }

        .employee-field {
          display: flex;
        }

        .field-label {
          font-weight: bold;
          width: 120px;
          color: #34495e;
        }

        .field-value {
          color: #2c3e50;
        }

        .salary-section {
          padding: 20px;
        }

        .salary-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          background-color: #fff;
        }

        .salary-table th {
          background-color: #34495e;
          color: white;
          padding: 12px 8px;
          text-align: left;
          font-weight: bold;
        }

        .salary-table td {
          border: 1px solid #dee2e6;
          padding: 10px 8px;
        }

        .salary-table tbody tr:nth-child(even) {
          background-color: #f8f9fa;
        }

        .earnings-header {
          background-color: #27ae60 !important;
        }

        .deductions-header {
          background-color: #e74c3c !important;
        }

        .amount {
          text-align: right;
          font-weight: 500;
        }

        .total-row {
          font-weight: bold;
          background-color: #ecf0f1 !important;
          border-top: 2px solid #34495e;
        }

        .net-salary {
          background-color: #2c3e50;
          color: white;
          padding: 15px 20px;
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          margin: 20px 0;
        }

        .amount-words {
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          padding: 15px 20px;
          margin-top: 20px;
          border-radius: 5px;
        }

        .amount-words-label {
          font-weight: bold;
          color: #2c3e50;
          display: block;
          margin-bottom: 5px;
        }



        @media print {
          body { margin: 0; padding: 0; }
          .container { border: none; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <img src="${companyLogo}" alt="Company Logo" class="logo" onerror="this.style.display='none'">
          <div class="company-info">
            <h1 class="company-name">${safeCompanyName}</h1>
            ${safeCompanyAddress ? `<p class="company-address">${safeCompanyAddress}</p>` : ''}
          </div>
          <div class="payslip-info">
            <h2 class="payslip-title">PAYSLIP</h2>
            <p class="period">${safeMonthName} ${slip.year}</p>
          </div>
        </div>

        <!-- Employee Details -->
        <div class="employee-details">
          <h3>Employee Details</h3>
          <div class="employee-grid">
            <div class="employee-field">
              <span class="field-label">Employee ID:</span>
              <span class="field-value">${safeEmployeeId}</span>
            </div>
            <div class="employee-field">
              <span class="field-label">Name:</span>
              <span class="field-value">${safeEmployeeName}</span>
            </div>
            <div class="employee-field">
              <span class="field-label">Department:</span>
              <span class="field-value">${safeDepartment}</span>
            </div>
            <div class="employee-field">
              <span class="field-label">Position:</span>
              <span class="field-value">${safePosition}</span>
            </div>
            <div class="employee-field">
              <span class="field-label">Bank Name:</span>
              <span class="field-value">${safeBankName}</span>
            </div>
            <div class="employee-field">
              <span class="field-label">A/C Number:</span>
              <span class="field-value">${safeBankAccountNumber}</span>
            </div>
            <div class="employee-field">
              <span class="field-label">Joining Date:</span>
              <span class="field-value">${(employeeData?.joiningDate || slip.employee?.joiningDate) ? new Date(employeeData?.joiningDate || slip.employee?.joiningDate).toLocaleDateString('en-IN') : 'N/A'}</span>
            </div>
            <div class="employee-field">
              <span class="field-label">PAN Number:</span>
              <span class="field-value">${safePanNumber}</span>
            </div>
          </div>
        </div>

        <!-- Salary Table -->
        <div class="salary-section">
          <table class="salary-table">
            <thead>
              <tr>
                <th class="earnings-header">EARNINGS</th>
                <th class="earnings-header">AMOUNT (₹)</th>
                <th class="deductions-header">DEDUCTIONS</th>
                <th class="deductions-header">AMOUNT (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${generateSalaryRows(slip)}
              <tr class="total-row">
                <td><strong>GROSS SALARY</strong></td>
                <td class="amount"><strong>₹${formatIndianNumber(slip.grossSalary)}</strong></td>
                <td><strong>TOTAL DEDUCTIONS</strong></td>
                <td class="amount"><strong>₹${formatIndianNumber(slip.totalDeductions)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="net-salary">
            <strong>NET SALARY: ₹${formatIndianNumber(slip.netSalary)}</strong>
          </div>

          <div class="amount-words">
            <span class="amount-words-label">Amount in Words:</span>
            ${safeNetSalaryInWords}
          </div>
        </div>


      </div>
    </body>
    </html>
  `;

  // Security: Use blob URL instead of document.write to prevent XSS vulnerabilities
  // This approach creates an isolated document that cannot execute scripts
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const blobURL = URL.createObjectURL(blob);

  printWindow.location.href = blobURL;

  // Wait for content to load before printing, then cleanup
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      // Cleanup blob URL after a delay to ensure print dialog has opened
      setTimeout(() => URL.revokeObjectURL(blobURL), 1000);
    }, 500);
  };
};

// Helper function to generate salary rows - only show non-zero values
const generateSalaryRows = (slip: SalarySlip): string => {
  // Helper to escape HTML in the row generation context
  const escapeHtml = (text: unknown): string => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  };

  interface EarningDeductionItem {
    label: string;
    value: number;
  }

  const earnings: EarningDeductionItem[] = [
    { label: 'Basic Salary', value: slip.earnings.basic },
    { label: 'HRA', value: slip.earnings.hra },
    { label: 'Conveyance Allowance', value: slip.earnings.conveyance },
    { label: 'Medical Allowance', value: slip.earnings.medical },
    { label: 'LTA', value: slip.earnings.lta },
    { label: 'Special Allowance', value: slip.earnings.specialAllowance },
    { label: 'Mobile Allowance', value: slip.earnings.mobileAllowance }
  ].filter(item => item.value > 0); // Only show non-zero earnings

  // Build deductions array including custom deductions
  const deductions: EarningDeductionItem[] = [];

  // Add custom deductions first (sanitize custom names to prevent XSS)
  if (slip.deductions.customDeductions && slip.deductions.customDeductions.length > 0) {
    slip.deductions.customDeductions.forEach(customDeduction => {
      if (customDeduction.amount > 0) {
        deductions.push({
          label: escapeHtml(customDeduction.name),
          value: customDeduction.amount
        });
      }
    });
  }

  // Add income tax if greater than 0
  if (slip.deductions.incomeTax > 0) {
    deductions.push({
      label: 'Income Tax (TDS)',
      value: slip.deductions.incomeTax
    });
  }

  const maxRows = Math.max(earnings.length, deductions.length);
  let rows = '';

  for (let i = 0; i < maxRows; i++) {
    const earning = earnings[i];
    const deduction = deductions[i];

    rows += `
      <tr>
        <td>${earning ? earning.label : ''}</td>
        <td class="amount">${earning ? '₹' + formatIndianNumber(earning.value) : ''}</td>
        <td>${deduction ? deduction.label : ''}</td>
        <td class="amount">${deduction ? '₹' + formatIndianNumber(deduction.value) : ''}</td>
      </tr>
    `;
  }

  return rows;
};
