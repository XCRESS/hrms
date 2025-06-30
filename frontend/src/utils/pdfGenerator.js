export const downloadSalarySlipPDF = (slip, employeeName, monthName, employeeData = null) => {
  // Create a new window for PDF
  const printWindow = window.open('', '_blank');
  
  const companyLogo = '/cfg-logo.jpg'; // Logo from public folder
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Salary Slip - ${employeeName}</title>
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
            <h1 class="company-name">${employeeData?.companyName || slip.employee?.companyName || 'CFG Corporation'}</h1>
          </div>
          <div class="payslip-info">
            <h2 class="payslip-title">PAYSLIP</h2>
            <p class="period">${monthName} ${slip.year}</p>
          </div>
        </div>
        
        <!-- Employee Details -->
        <div class="employee-details">
          <h3>Employee Details</h3>
          <div class="employee-grid">
            <div class="employee-field">
              <span class="field-label">Employee ID:</span>
              <span class="field-value">${slip.employeeId}</span>
            </div>
            <div class="employee-field">
              <span class="field-label">Name:</span>
              <span class="field-value">${employeeName && employeeName.trim() !== '' ? employeeName : (employeeData ? `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim() : (slip.employee ? `${slip.employee.firstName || ''} ${slip.employee.lastName || ''}`.trim() : 'N/A'))}</span>
            </div>
            <div class="employee-field">
              <span class="field-label">Department:</span>
              <span class="field-value">${employeeData?.department || slip.employee?.department || 'N/A'}</span>
            </div>
            <div class="employee-field">
              <span class="field-label">Position:</span>
              <span class="field-value">${employeeData?.position || slip.employee?.position || 'N/A'}</span>
            </div>
            <div class="employee-field">
              <span class="field-label">Bank Name:</span>
              <span class="field-value">${employeeData?.bankName || slip.employee?.bankName || 'N/A'}</span>
            </div>
            <div class="employee-field">
              <span class="field-label">A/C Number:</span>
              <span class="field-value">${employeeData?.bankAccountNumber || slip.employee?.bankAccountNumber || 'N/A'}</span>
            </div>
            <div class="employee-field">
              <span class="field-label">Joining Date:</span>
              <span class="field-value">${(employeeData?.joiningDate || slip.employee?.joiningDate) ? new Date(employeeData?.joiningDate || slip.employee?.joiningDate).toLocaleDateString('en-IN') : 'N/A'}</span>
            </div>
            <div class="employee-field">
              <span class="field-label">PAN Number:</span>
              <span class="field-value">${employeeData?.panNumber || slip.employee?.panNumber || 'N/A'}</span>
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
                <td class="amount"><strong>₹${slip.grossSalary.toLocaleString()}</strong></td>
                <td><strong>TOTAL DEDUCTIONS</strong></td>
                <td class="amount"><strong>₹${slip.totalDeductions.toLocaleString()}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="net-salary">
            <strong>NET SALARY: ₹${slip.netSalary.toLocaleString()}</strong>
          </div>

          <div class="amount-words">
            <span class="amount-words-label">Amount in Words:</span>
            ${slip.netSalaryInWords}
          </div>
        </div>


      </div>
    </body>
    </html>
  `;
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Wait for images to load before printing
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };
};

// Helper function to generate salary rows - only show non-zero values
const generateSalaryRows = (slip) => {
  const earnings = [
    { label: 'Basic Salary', value: slip.earnings.basic },
    { label: 'HRA', value: slip.earnings.hra },
    { label: 'Conveyance Allowance', value: slip.earnings.conveyance },
    { label: 'Medical Allowance', value: slip.earnings.medical },
    { label: 'LTA', value: slip.earnings.lta },
    { label: 'Special Allowance', value: slip.earnings.specialAllowance },
    { label: 'Mobile Allowance', value: slip.earnings.mobileAllowance }
  ].filter(item => item.value > 0); // Only show non-zero earnings

  const deductions = [
    { label: 'Income Tax (TDS)', value: slip.deductions.incomeTax }
  ].filter(item => item.value > 0); // Only show non-zero deductions

  const maxRows = Math.max(earnings.length, deductions.length);
  let rows = '';

  for (let i = 0; i < maxRows; i++) {
    const earning = earnings[i];
    const deduction = deductions[i];
    
    rows += `
      <tr>
        <td>${earning ? earning.label : ''}</td>
        <td class="amount">${earning ? '₹' + earning.value.toLocaleString() : ''}</td>
        <td>${deduction ? deduction.label : ''}</td>
        <td class="amount">${deduction ? '₹' + deduction.value.toLocaleString() : ''}</td>
      </tr>
    `;
  }

  return rows;
}; 