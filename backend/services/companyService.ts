import Company from '../models/Company.model.js';
import Employee from '../models/Employee.model.js';
import logger from '../utils/logger.js';

const LEGACY_COMPANIES = [
  { name: 'Indra Financial Services Limited', address: 'C-756, Front Basement, New Friends Colony, South Delhi 110025' },
  { name: 'COSMOS INVESTIFIASSET MANAGEMENT LLP', address: 'Unit No. 513, SKYE CORPORATE PARK, INDORE-452001, MP' },
  { name: 'SENSIBLE TAX ADVISORY LLP', address: 'B-495, 1st Floor, Nehru Ground, NIT, Faridabad, Haryana-121001' },
];

/**
 * Bootstraps the Company collection the first time it is empty, from the
 * companies that used to be a hardcoded enum plus any name already on an
 * employee. Never runs again once a single company exists, so HR deletions stick.
 */
export const ensureCompaniesSeeded = async (): Promise<void> => {
  try {
    await Company.syncIndexes();
    if (await Company.exists({})) return;

    const employeeCompanies = (await Employee.distinct('companyName')) as string[];
    const seeds = new Map(LEGACY_COMPANIES.map((c) => [c.name.toLowerCase(), c]));
    for (const name of employeeCompanies) {
      const trimmed = name?.trim();
      if (trimmed && !seeds.has(trimmed.toLowerCase())) {
        seeds.set(trimmed.toLowerCase(), { name: trimmed, address: '' });
      }
    }

    await Company.insertMany([...seeds.values()], { ordered: false });
    logger.info({ count: seeds.size }, 'Seeded companies');
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.warn({ err }, 'Failed to seed companies');
  }
};
