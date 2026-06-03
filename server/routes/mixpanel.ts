import { Router, Request, Response } from 'express';
import { getAutonomousSnapshot } from '../services/mixpanel';

const router = Router();

router.get('/mixpanel/autonomous', (_req: Request, res: Response) => {
  res.json(getAutonomousSnapshot());
});

export default router;
