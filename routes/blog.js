import { Router } from 'express';
import { and, count, desc, eq } from 'drizzle-orm';
import slugify from 'slugify';
import { db } from '../db/index.js';
import { posts, users } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const PUBLIC_PAGE_SIZE = 5;

function getPage(value) {
  const page = Number.parseInt(value, 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

router.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', {
    title: 'Dashboard',
    appData: { user: req.session.user }
  });
});

router.get('/posts', async (req, res, next) => {
  try {
    const page = getPage(req.query.page);
    const offset = (page - 1) * PUBLIC_PAGE_SIZE;

    const [{ total }] = await db
      .select({ total: count(posts.id) })
      .from(posts)
      .where(eq(posts.published, true));

    const publicPosts = await db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        title: posts.title,
        slug: posts.slug,
        excerpt: posts.excerpt,
        createdAt: posts.createdAt,
        authorId: posts.authorId,
        authorName: users.name
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.published, true))
      .orderBy(desc(posts.createdAt))
      .limit(PUBLIC_PAGE_SIZE)
      .offset(offset);

    const totalPosts = Number(total);
    const totalPages = Math.max(1, Math.ceil(totalPosts / PUBLIC_PAGE_SIZE));

    res.render('posts', {
      title: 'Published posts',
      posts: publicPosts,
      pagination: {
        page,
        pageSize: PUBLIC_PAGE_SIZE,
        totalPosts,
        totalPages,
        hasPrevious: page > 1,
        hasNext: page < totalPages
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/posts/new', requireAuth, (req, res) => {
  res.render('new-post', {
    title: 'Create Post'
  });
});

router.post('/posts', requireAuth, async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();

    if (!title || !req.body.content) {
      req.flash('error', 'Title and content are required.');
      return res.redirect('/posts/new');
    }

    const baseSlug = slugify(title, { lower: true, strict: true }) || 'untitled';
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    await db.insert(posts).values({
      authorId: req.session.user.id,
      title,
      slug,
      excerpt: req.body.excerpt || '',
      content: req.body.content || '',
      published: true
    });

    req.flash('success', 'Post created.');
    return res.redirect('/posts');
  } catch (error) {
    return next(error);
  }
});

router.get('/posts/:id/edit', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [post] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, id), eq(posts.authorId, req.session.user.id)))
      .limit(1);

    if (!post) {
      return res.status(404).render('not-found', { title: 'Post not found' });
    }

    return res.render('edit-post', { title: 'Edit Post', post });
  } catch (error) {
    return next(error);
  }
});

router.post('/posts/:id/edit', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const title = String(req.body.title || '').trim();

    if (!title || !req.body.content) {
      req.flash('error', 'Title and content are required.');
      return res.redirect(`/posts/${id}/edit`);
    }

    const [post] = await db
      .update(posts)
      .set({
        title,
        excerpt: req.body.excerpt || '',
        content: req.body.content || '',
        published: true,
        updatedAt: new Date()
      })
      .where(and(eq(posts.id, id), eq(posts.authorId, req.session.user.id)))
      .returning({ slug: posts.slug });

    if (!post) {
      return res.status(404).render('not-found', { title: 'Post not found' });
    }

    req.flash('success', 'Post updated.');
    return res.redirect(`/posts/${post.slug}`);
  } catch (error) {
    return next(error);
  }
});

router.post('/posts/:id/delete', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await db.delete(posts).where(and(eq(posts.id, id), eq(posts.authorId, req.session.user.id)));
    req.flash('success', 'Post deleted.');
    return res.redirect('/posts');
  } catch (error) {
    return next(error);
  }
});

router.get('/posts/:slug', async (req, res, next) => {
  try {
    const [post] = await db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        title: posts.title,
        content: posts.content,
        excerpt: posts.excerpt,
        createdAt: posts.createdAt,
        authorName: users.name
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.slug, req.params.slug))
      .limit(1);

    if (!post) {
      return res.status(404).render('not-found', { title: 'Post not found' });
    }

    return res.render('post', { title: post.title, post });
  } catch (error) {
    return next(error);
  }
});

export default router;
