import { Router } from 'express';
import { authGuard } from '../middlewares/auth';

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  role?: string;
  status?: string;
  createdAt: string;
}

const leads: Record<string, Lead> = {};

const router = Router();

// Protect all lead routes with auth; change to selective if needed
router.use(authGuard);

router.get('/', (_req, res) => {
  res.json(Object.values(leads));
});

router.post('/', (req, res) => {
  const { firstName, lastName, email, companyName, role, status } = req.body || {};
  if (!firstName || !lastName || !email || !companyName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const id = crypto.randomUUID();
  const lead: Lead = {
    id,
    firstName,
    lastName,
    email,
    companyName,
    role,
    status,
    createdAt: new Date().toISOString(),
  };
  leads[id] = lead;
  res.status(201).json(lead);
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  const lead = leads[id];
  if (!lead) return res.status(404).json({ error: 'Not found' });
  res.json(lead);
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const lead = leads[id];
  if (!lead) return res.status(404).json({ error: 'Not found' });
  const updated = { ...lead, ...req.body } as Lead;
  leads[id] = updated;
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  if (!leads[id]) return res.status(404).json({ error: 'Not found' });
  delete leads[id];
  res.status(204).send();
});

export default router;

