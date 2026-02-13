import { Router, Request, Response } from 'express';
import { getInvoiceByPublicToken } from '../services/invoiceService';

const router = Router();

// Get invoice by public token
router.get('/:token', async (req: Request, res: Response) => {
  const invoice = await getInvoiceByPublicToken(req.params.token);
  res.json({ data: invoice });
});

export default router;
