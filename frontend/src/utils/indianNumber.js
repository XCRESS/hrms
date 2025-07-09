/**
 * Format number according to Indian numeric system
 * @param {number} num - The number to format
 * @returns {string} - Formatted number string
 */
export const formatIndianNumber = (num) => {
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
 * @param {string} companyName - The company name
 * @returns {string} - Company address
 */
export const getCompanyAddress = (companyName) => {
  const addresses = {
    'Indra Financial Service Limited': 'C-756, Front Basement, New Friends Colony, South Delhi 110025',
    'Indra Financial Services Limited': 'C-756, Front Basement, New Friends Colony, South Delhi 110025',
    'Cosmos Financial Group': 'Unit No. 513, SKYE CORPORATE PARK, INDORE-452001, MP',
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
  if (lowerCaseName?.includes('cosmos')) {
    return 'Unit No. 513, SKYE CORPORATE PARK, INDORE-452001, MP';
  }
  if (lowerCaseName?.includes('sensible') || lowerCaseName?.includes('tax advisory')) {
    return 'B-495, 1st Floor, Nehru Ground, NIT, Faridabad, Haryana-121001';
  }
  
  // Default to first address if nothing matches
  return 'C-756, Front Basement, New Friends Colony, South Delhi 110025';
};