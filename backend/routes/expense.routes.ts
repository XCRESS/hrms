import { Router } from 'express';
import {
  createExpense,
  updateExpense,
  getMyExpenses,
  getAllExpenses,
  updateExpenseStatus,
  bulkUpdateStatus,
  exportExpensesExcel
} from '../controllers/expense.controllers.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/zodValidation.middleware.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  reviewExpenseSchema,
  bulkExpenseStatusSchema,
} from '../validators/request.schemas.js';

const router: Router = Router();

// Employee routes
router.post('/request', authMiddleware(), validateBody(createExpenseSchema), createExpense);
router.get('/my', authMiddleware(), getMyExpenses);
router.put('/:id', authMiddleware(), validateBody(updateExpenseSchema), updateExpense);

// Admin/HR routes
router.get('/all', authMiddleware(['admin', 'hr']), getAllExpenses);
router.put('/:id/status', authMiddleware(['admin', 'hr']), validateBody(reviewExpenseSchema), updateExpenseStatus);
router.post('/bulk-status', authMiddleware(['admin', 'hr']), validateBody(bulkExpenseStatusSchema), bulkUpdateStatus);
router.get('/export', authMiddleware(['admin', 'hr']), exportExpensesExcel);

export default router;
