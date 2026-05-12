import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import session from 'express-session';
import authRouter, { requireAuth } from './routes/auth';
import intercomRouter from './routes/intercom';
import evalsRouter from './routes/evals';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(express.json({ limit: '1mb' }));
app.use(
  session({
    name: 'cw.sid',
    secret: process.env.SESSION_SECRET ?? 'dev-only-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.get('/api/config', (_req, res) =>
  res.json({
    intercom_configured: Boolean(process.env.INTERCOM_ACCESS_TOKEN && process.env.INTERCOM_TEAM_ID),
    anthropic_configured: Boolean(process.env.ANTHROPIC_API_KEY),
  }),
);

app.use('/api/auth', authRouter);
app.use('/api', requireAuth, intercomRouter);
app.use('/api', requireAuth, evalsRouter);

if (process.env.NODE_ENV === 'production') {
  const clientDir = path.resolve(__dirname, '../client');
  app.use(express.static(clientDir));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDir, 'index.html')));
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://localhost:${PORT}`);
});
