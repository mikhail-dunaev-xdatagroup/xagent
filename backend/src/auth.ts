import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import cookieSession from 'cookie-session';

type User = { id: string; name: string; email: string };

export function setupAuth(
  app: express.Express,
  opts: { isDev: boolean; frontendURL: string; backendURL: string; allowedEmailDomain?: string }
) {
  const allowedEmailDomain = opts.allowedEmailDomain ?? '@cx-labs.io';
  let currentUser: User | null = null;

  app.use(
    cookieSession({
      name: 'session',
      secret: process.env.SESSION_SECRET || 'dev-secret-key',
      maxAge: 1000 * 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: 'lax',
      secure: !opts.isDev,
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
        callbackURL: `${opts.backendURL}/api/auth/google/callback`,
      },
      (_accessToken, _refreshToken, profile, done) => {
        const email = profile.emails?.[0]?.value || '';
        if (!email.endsWith(allowedEmailDomain)) {
          return done(null, false);
        }
        const user: User = {
          id: profile.id,
          name: profile.displayName,
          email,
        };
        done(null, user);
      }
    )
  );

  app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  app.get(
    '/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: opts.frontendURL }),
    (req, res) => {
      currentUser = req.user as any;
      res.redirect(opts.frontendURL);
    }
  );

  app.get('/api/auth/logout', (req, res) => {
    currentUser = null;
    req.session = null;
    res.redirect(opts.frontendURL);
  });

  app.get('/api/auth/me', (_req, res) => {
    res.json({ user: currentUser });
  });
}

