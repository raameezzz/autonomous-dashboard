import { Router, Request, Response } from 'express';

// Anthropic-based AI evaluation is disabled. Fin's built-in conversation summary
// is surfaced via /api/conversations/closed instead.
const router = Router();

router.post('/evaluate', (_req: Request, res: Response) => {
  res.status(410).json({
    error: 'AI evaluation is disabled. Use /api/conversations/closed for Fin summaries.',
  });
});

export default router;
