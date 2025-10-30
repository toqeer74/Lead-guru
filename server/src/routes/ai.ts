import { Router } from 'express';
import { authGuard } from '../middlewares/auth';
import { generateEmailPatterns, companySummary, scoreLead } from '../libs/leadAI';

const router = Router();

router.use(authGuard);

// POST /api/ai/email-patterns { firstName, lastName, domain }
router.post('/email-patterns', (req, res) => {
  const { firstName, lastName, domain } = req.body || {};
  if (!firstName || !lastName || !domain) {
    return res.status(400).json({ error: 'firstName, lastName, and domain are required' });
  }
  const patterns = generateEmailPatterns(firstName, lastName, domain);
  res.json({ patterns });
});

// POST /api/ai/company-info { domain }
router.post('/company-info', (req, res) => {
  const { domain } = req.body || {};
  if (!domain) return res.status(400).json({ error: 'domain is required' });
  const info = companySummary(domain);
  res.json({ info, sources: [] });
});

// POST /api/ai/strategy { firstName, lastName, companyName, role }
router.post('/strategy', (req, res) => {
  const { firstName, lastName, companyName, role } = req.body || {};
  if (!firstName || !lastName || !companyName) {
    return res.status(400).json({ error: 'firstName, lastName, and companyName are required' });
  }
  const score = scoreLead({ firstName, lastName, companyName, role });
  const text = [
    `Lead: ${firstName} ${lastName} (${role || 'N/A'}) at ${companyName}`,
    `Estimated score: ${score}/100`,
    '',
    'Outline:',
    '- Pain points: pipeline quality, manual prospecting',
    '- Value props: AI enrichment, personalized outreach',
    '- CTA: quick call to share examples',
  ].join('\n');
  res.json({ strategy: text, score });
});

export default router;

