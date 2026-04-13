import type { Request, Response } from 'express';
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { verifyOwnership } from '../middleware/ownership';
import { UnauthorizedError } from '../middleware/errorHandler';
import { PERMISSIONS } from '../types';
import { validate } from '../middleware/validate';
import {
  listInvoicesSchema,
  createInvoiceSchema,
  updateInvoiceSchema,
  recordPaymentSchema,
  voidInvoiceSchema,
  generateFromContractSchema,
  batchGenerateSchema,
} from '../schemas/invoice';
import {
  listInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  sendInvoice,
  recordPayment,
  voidInvoice,
  generateInvoiceFromContract,
  batchGenerateInvoices,
  listInvoiceActivities,
  generateInvoicePublicToken,
} from '../services/invoiceService';
import { requireFrontendBaseUrl } from '../lib/appUrl';

const router: Router = Router();

router.use(authenticate);

function requireAuthenticatedUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }
  return req.user;
}

// List invoices
router.get(
  '/',
  requirePermission(PERMISSIONS.INVOICES_READ),
  validate(listInvoicesSchema),
  async (req: Request, res: Response) => {
    const {
      accountId, contractId, facilityId, status, overdue,
      dateFrom, dateTo, page, limit,
    } = req.query;
    const result = await listInvoices({
      accountId: accountId as string,
      contractId: contractId as string,
      facilityId: facilityId as string,
      status: status as string,
      overdue: overdue === 'true',
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  }
);

// Get invoice by ID
router.get('/:id', requirePermission(PERMISSIONS.INVOICES_READ), verifyOwnership({ resourceType: 'invoice' }), async (req: Request, res: Response) => {
  const invoice = await getInvoiceById(req.params.id);
  res.json({ data: invoice });
});

// Create invoice
router.post(
  '/',
  requirePermission(PERMISSIONS.INVOICES_WRITE),
  validate(createInvoiceSchema),
  async (req: Request, res: Response) => {
    const user = requireAuthenticatedUser(req);
    const input = {
      ...req.body,
      issueDate: new Date(req.body.issueDate),
      dueDate: new Date(req.body.dueDate),
      periodStart: req.body.periodStart ? new Date(req.body.periodStart) : null,
      periodEnd: req.body.periodEnd ? new Date(req.body.periodEnd) : null,
      createdByUserId: user.id,
    };
    const invoice = await createInvoice(input);
    res.status(201).json({ data: invoice });
  }
);

// Update invoice
router.patch(
  '/:id',
  requirePermission(PERMISSIONS.INVOICES_WRITE),
  verifyOwnership({ resourceType: 'invoice' }),
  validate(updateInvoiceSchema),
  async (req: Request, res: Response) => {
    const input = { ...req.body };
    if (input.issueDate) input.issueDate = new Date(input.issueDate);
    if (input.dueDate) input.dueDate = new Date(input.dueDate);
    const invoice = await updateInvoice(req.params.id, input);
    res.json({ data: invoice });
  }
);

// Send invoice
router.post('/:id/send', requirePermission(PERMISSIONS.INVOICES_WRITE), verifyOwnership({ resourceType: 'invoice' }), async (req: Request, res: Response) => {
  const user = requireAuthenticatedUser(req);
  const invoice = await sendInvoice(req.params.id, user.id);
  res.json({ data: invoice });
});

router.post(
  '/:id/public-link',
  requirePermission(PERMISSIONS.INVOICES_READ),
  verifyOwnership({ resourceType: 'invoice' }),
  async (req: Request, res: Response) => {
    const invoice = await getInvoiceById(req.params.id);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const frontendUrl = requireFrontendBaseUrl();
    const publicToken = await generateInvoicePublicToken(req.params.id);

    res.json({
      data: {
        publicUrl: `${frontendUrl}/i/${publicToken}`,
      },
    });
  }
);

// Record payment
router.post(
  '/:id/payments',
  requirePermission(PERMISSIONS.INVOICES_WRITE),
  verifyOwnership({ resourceType: 'invoice' }),
  validate(recordPaymentSchema),
  async (req: Request, res: Response) => {
    const user = requireAuthenticatedUser(req);
    const invoice = await recordPayment(req.params.id, {
      ...req.body,
      paymentDate: new Date(req.body.paymentDate),
      recordedByUserId: user.id,
    });
    res.json({ data: invoice });
  }
);

// Void invoice
router.post(
  '/:id/void',
  requirePermission(PERMISSIONS.INVOICES_ADMIN),
  verifyOwnership({ resourceType: 'invoice' }),
  validate(voidInvoiceSchema),
  async (req: Request, res: Response) => {
    const user = requireAuthenticatedUser(req);
    const invoice = await voidInvoice(req.params.id, user.id, req.body.reason);
    res.json({ data: invoice });
  }
);

// Generate from contract
router.post(
  '/generate-from-contract',
  requirePermission(PERMISSIONS.INVOICES_WRITE),
  validate(generateFromContractSchema),
  async (req: Request, res: Response) => {
    const user = requireAuthenticatedUser(req);
    const invoice = await generateInvoiceFromContract(
      req.body.contractId,
      new Date(req.body.periodStart),
      new Date(req.body.periodEnd),
      user.id,
      req.body.prorate ?? true
    );
    res.status(201).json({ data: invoice });
  }
);

// Batch generate
router.post(
  '/batch-generate',
  requirePermission(PERMISSIONS.INVOICES_ADMIN),
  validate(batchGenerateSchema),
  async (req: Request, res: Response) => {
    const user = requireAuthenticatedUser(req);
    const result = await batchGenerateInvoices(
      new Date(req.body.periodStart),
      new Date(req.body.periodEnd),
      user.id,
      req.body.prorate ?? true
    );
    res.json({ data: result });
  }
);

// Get activities
router.get('/:id/activities', requirePermission(PERMISSIONS.INVOICES_READ), verifyOwnership({ resourceType: 'invoice' }), async (req: Request, res: Response) => {
  const activities = await listInvoiceActivities(req.params.id);
  res.json({ data: activities });
});

export default router;
