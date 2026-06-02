export function requireAuth(req, res, next) {
  if (req.session.user) {
    return next();
  }

  req.flash('error', 'Please login to continue.');
  return res.redirect('/login');
}

export function redirectIfAuthed(req, res, next) {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }

  return next();
}
