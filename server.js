import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import flash from 'connect-flash';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.js';
import blogRoutes from './routes/blog.js';
import apiRoutes from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    }
  })
);
app.use(flash());

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.messages = {
    error: req.flash('error'),
    success: req.flash('success')
  };
  res.locals.viteDevServer = process.env.VITE_DEV_SERVER || '';
  next();
});

app.use(authRoutes);
app.use(blogRoutes);
app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).render('not-found', { title: 'Not found' });
});

app.use((error, req, res, next) => {
  console.error(error);
  if (req.path.startsWith('/api')) {
    return res.status(500).json({ message: 'Something went wrong.' });
  }

  req.flash('error', 'Something went wrong. Please try again.');
  return res.redirect('/');
});

app.listen(port, () => {
  console.log(`Blog app running at http://localhost:${port}`);
});
