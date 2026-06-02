import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { redirectIfAuthed } from '../middleware/auth.js';

const router = Router();
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

function getBaseUrl(req) {
  return process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
}

function getGoogleConfig(req) {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${getBaseUrl(req)}/auth/google/callback`
  };
}

router.get('/', (req, res) => {
  res.render('home', { title: 'Inkline Blog' });
});

router.get('/signup', redirectIfAuthed, (req, res) => {
  res.render('signup', { title: 'Create account' });
});

router.post('/signup', redirectIfAuthed, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password || password.length < 6) {
      req.flash('error', 'Name, email, and a 6 character password are required.');
      return res.redirect('/signup');
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase())
    });

    if (existing) {
      req.flash('error', 'That email already has an account.');
      return res.redirect('/signup');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db
      .insert(users)
      .values({ name, email: email.toLowerCase(), passwordHash, provider: 'local' })
      .returning({ id: users.id, name: users.name, email: users.email });

    req.session.user = user;
    req.flash('success', 'Welcome. Your workspace is ready.');
    return res.redirect('/dashboard');
  } catch (error) {
    return next(error);
  }
});

router.get('/login', redirectIfAuthed, (req, res) => {
  res.render('login', { title: 'Login' });
});

router.post('/login', redirectIfAuthed, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await db.query.users.findFirst({
      where: eq(users.email, String(email || '').toLowerCase())
    });

    if (user && !user.passwordHash) {
      req.flash('error', 'This account uses Google login. Continue with Google instead.');
      return res.redirect('/login');
    }

    if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/login');
    }

    req.session.user = { id: user.id, name: user.name, email: user.email };
    return res.redirect('/dashboard');
  } catch (error) {
    return next(error);
  }
});

router.get('/auth/google', redirectIfAuthed, (req, res) => {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig(req);

  if (!clientId || !clientSecret) {
    req.flash('error', 'Google OAuth is not configured yet.');
    return res.redirect('/login');
  }

  const state = crypto.randomBytes(24).toString('hex');
  req.session.oauthState = state;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state
  });

  return res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
});

router.get('/auth/google/callback', redirectIfAuthed, async (req, res, next) => {
  try {
    const { code, state } = req.query;

    if (!code || !state || state !== req.session.oauthState) {
      req.flash('error', 'Google login could not be verified.');
      return res.redirect('/login');
    }

    delete req.session.oauthState;

    const { clientId, clientSecret, redirectUri } = getGoogleConfig(req);
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      req.flash('error', 'Google login failed. Please try again.');
      return res.redirect('/login');
    }

    const tokens = await tokenResponse.json();
    const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    if (!profileResponse.ok) {
      req.flash('error', 'Could not read your Google profile.');
      return res.redirect('/login');
    }

    const profile = await profileResponse.json();
    const email = String(profile.email || '').toLowerCase();

    if (!email || !profile.email_verified) {
      req.flash('error', 'Google did not return a verified email address.');
      return res.redirect('/login');
    }

    let user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (user) {
      [user] = await db
        .update(users)
        .set({
          name: profile.name || user.name,
          provider: user.provider === 'local' ? user.provider : 'google',
          providerId: profile.sub,
          avatarUrl: profile.picture || user.avatarUrl,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id))
        .returning({ id: users.id, name: users.name, email: users.email });
    } else {
      [user] = await db
        .insert(users)
        .values({
          name: profile.name || email.split('@')[0],
          email,
          provider: 'google',
          providerId: profile.sub,
          avatarUrl: profile.picture || null
        })
        .returning({ id: users.id, name: users.name, email: users.email });
    }

    req.session.user = user;
    req.flash('success', 'Signed in with Google.');
    return res.redirect('/dashboard');
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

export default router;
