import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import cookieSession from 'cookie-session';
import { askVertex } from './vertexClient';

const app = express();
app.use(express.json());

const isDev = process.env.NODE_ENV !== 'production';
const frontendURL = isDev ? 'http://localhost:5173/' : '/';
const backendURL = isDev ? 'http://localhost:8080' : '';

let currentUser: { id: string; name: string; email: string } | null = null;

app.use(
  cookieSession({
    name: 'session',
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    maxAge: 1000 * 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: 'lax',
    secure: !isDev,
  })
);

app.use((req, _res, next) => {
  if (req.session && !req.session.regenerate) {
    req.session.regenerate = (cb: () => void) => cb();
  }
  if (req.session && !req.session.save) {
    req.session.save = (cb: () => void) => cb();
  }
  next();
});

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user: any, done) => done(null, user));

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: `${backendURL}/api/auth/google/callback`,
    },
    (_accessToken, _refreshToken, profile, done) => {
      const user = {
        id: profile.id,
        name: profile.displayName,
        email: profile.emails?.[0]?.value || '',
      };
      done(null, user);
    }
  )
);

app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get(
  '/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: frontendURL }),
  (req, res) => {
    currentUser = req.user as any;
    res.redirect(frontendURL);
  }
);

app.get('/api/auth/logout', (req, res) => {
  currentUser = null;
  req.session = null;
  res.redirect(frontendURL);
});

app.get('/api/auth/me', (_req, res) => {
  res.json({ user: currentUser });
});

const publicPath = path.join(__dirname, '..', 'public');
const hasPublic = fs.existsSync(publicPath);
if (hasPublic) {
  app.use(express.static(publicPath));
}

app.post('/ask', async (req, res) => {
  try {
    const question = req.body?.question;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'question must be a string' });
    }

    const answer = await askVertex(question);

    res.json({ answer });
  } catch (err) {
    console.error('Error in /ask:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

if (hasPublic) {
  const sendIndex = (_req: express.Request, res: express.Response) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  };
  app.get('/', sendIndex);
  app.get('/{*path}', sendIndex);
}

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log('Server listening on port', port);
});
