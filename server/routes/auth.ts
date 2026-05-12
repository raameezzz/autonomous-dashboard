import { Router, Request, Response, NextFunction } from 'express';

declare module 'express-session' {
  interface SessionData {
    user?: { email: string };
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session.user) return next();
  res.status(401).json({ error: 'unauthorized' });
}

const router = Router();

router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  const expectedEmail = process.env.ADMIN_EMAIL ?? 'admin@cloudways.com';
  const expectedPassword = process.env.ADMIN_PASSWORD ?? 'changeme';
  if (email === expectedEmail && password === expectedPassword) {
    req.session.user = { email };
    return res.json({ ok: true, user: { email } });
  }
  res.status(401).json({ ok: false, error: 'Invalid credentials' });
});

router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.clearCookie('cw.sid');
    res.json({ ok: true });
  });
});

router.get('/me', (req: Request, res: Response) => {
  if (req.session.user) return res.json({ user: req.session.user });
  res.status(401).json({ user: null });
});

export default router;
