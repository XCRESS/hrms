/**
 * Format number according to Indian numeric system
 * @param num - The number to format
 * @returns Formatted number string
 */
export const formatIndianNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }

  // Round to 2 decimal places to avoid long decimals
  const roundedNum = Math.round(num * 100) / 100;
  const numStr = roundedNum.toString();
  const parts = numStr.split('.');
  let integerPart = parts[0];
  let decimalPart = parts[1];

  // Handle negative numbers
  const isNegative = integerPart.startsWith('-');
  if (isNegative) {
    integerPart = integerPart.substring(1);
  }

  // Apply Indian number formatting
  if (integerPart.length > 3) {
    const lastThree = integerPart.slice(-3);
    const remaining = integerPart.slice(0, -3);
    const formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
    integerPart = formatted;
  }

  let result = (isNegative ? '-' : '') + integerPart;
  if (decimalPart) {
    // Ensure exactly 2 decimal places for non-zero decimals
    if (decimalPart.length === 1) {
      decimalPart += '0';
    }
    result += '.' + decimalPart;
  }

  return result;
};

/**
 * Get company address based on company name
 * @param companyName - The company name
 * @returns Company address
 */
export const getCompanyAddress = (companyName: string): string => {
  const addresses: Record<string, string> = {
    'Indra Financial Services Limited': 'C-756, Front Basement, New Friends Colony, South Delhi 110025',
    'COSMOS INVESTIFIASSET MANAGEMENT LLP': 'Unit No. 513, SKYE CORPORATE PARK, INDORE-452001, MP',
    'SENSIBLE TAX ADVISORY LLP': 'B-495, 1st Floor, Nehru Ground, NIT, Faridabad, Haryana-121001'
  };

  // First try exact match
  if (addresses[companyName]) {
    return addresses[companyName];
  }

  // Try case-insensitive match
  const lowerCaseName = companyName?.toLowerCase();
  for (const [key, value] of Object.entries(addresses)) {
    if (key.toLowerCase() === lowerCaseName) {
      return value;
    }
  }

  // Try partial match for common variations
  if (lowerCaseName?.includes('indra') || lowerCaseName?.includes('financial service')) {
    return 'C-756, Front Basement, New Friends Colony, South Delhi 110025';
  }
  if (lowerCaseName?.includes('cosmos') || lowerCaseName?.includes('investifiasset') || lowerCaseName?.includes('management')) {
    return 'Unit No. 513, SKYE CORPORATE PARK, INDORE-452001, MP';
  }
  if (lowerCaseName?.includes('sensible') || lowerCaseName?.includes('tax advisory')) {
    return 'B-495, 1st Floor, Nehru Ground, NIT, Faridabad, Haryana-121001';
  }

  // Default to first address if nothing matches
  return 'C-756, Front Basement, New Friends Colony, South Delhi 110025';
};

/**
 * Convert a number to words in Indian currency format (Rupees)
 * @param num - The number to convert
 * @returns Number in words with "Rupees Only" suffix
 */
export const convertToWords = (num: number | null | undefined): string => {
  if (num === null || num === undefined || isNaN(num)) {
    return 'Zero Rupees Only';
  }

  if (num === 0) return 'Zero Rupees Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanHundred = (n: number): string => {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  };

  const convertLessThanThousand = (n: number): string => {
    if (n < 100) return convertLessThanHundred(n);
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanHundred(n % 100) : '');
  };

  // Round to nearest integer for words conversion
  let amount = Math.round(Math.abs(num));
  const isNegative = num < 0;
  let result = '';

  // Crores (1,00,00,000)
  if (amount >= 10000000) {
    result += convertLessThanHundred(Math.floor(amount / 10000000)) + ' Crore ';
    amount = amount % 10000000;
  }

  // Lakhs (1,00,000)
  if (amount >= 100000) {
    result += convertLessThanHundred(Math.floor(amount / 100000)) + ' Lakh ';
    amount = amount % 100000;
  }

  // Thousands (1,000)
  if (amount >= 1000) {
    result += convertLessThanHundred(Math.floor(amount / 1000)) + ' Thousand ';
    amount = amount % 1000;
  }

  // Hundreds and below
  if (amount > 0) {
    result += convertLessThanThousand(amount);
  }

  const prefix = isNegative ? 'Minus ' : '';
  return prefix + result.trim() + ' Rupees Only';
};
