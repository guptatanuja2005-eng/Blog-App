import { Router } from 'express';
import { and, count, desc, eq } from 'drizzle-orm';
import slugify from 'slugify';
import { db } from '../db/index.js';
import { posts } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const DASHBOARD_PAGE_SIZE = 8;

router.use(requireAuth);

function getPage(value) {
  const page = Number.parseInt(value, 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

router.get('/posts', async (req, res, next) => {
  try {
    const page = getPage(req.query.page);
    const offset = (page - 1) * DASHBOARD_PAGE_SIZE;

    const [{ total }] = await db
      .select({ total: count(posts.id) })
      .from(posts)
      .where(eq(posts.authorId, req.session.user.id));

    const rows = await db
      .select()
      .from(posts)
      .where(eq(posts.authorId, req.session.user.id))
      .orderBy(desc(posts.updatedAt))
      .limit(DASHBOARD_PAGE_SIZE)
      .offset(offset);

    const totalPosts = Number(total);
    const totalPages = Math.max(1, Math.ceil(totalPosts / DASHBOARD_PAGE_SIZE));

    res.json({
      posts: rows,
      pagination: {
        page,
        pageSize: DASHBOARD_PAGE_SIZE,
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

router.post('/posts', async (req, res, next) => {
  try {
    const title = String(req.body.title || 'Untitled draft').trim();
    const baseSlug = slugify(title, { lower: true, strict: true }) || 'untitled';
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const [post] = await db
      .insert(posts)
      .values({
        authorId: req.session.user.id,
        title,
        slug,
        excerpt: req.body.excerpt || '',
        content: req.body.content || '',
        published: Boolean(req.body.published)
      })
      .returning();

    res.status(201).json(post);
  } catch (error) {
    next(error);
  }
});

router.patch('/posts/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const title = String(req.body.title || 'Untitled draft').trim();

    const [post] = await db
      .update(posts)
      .set({
        title,
        excerpt: req.body.excerpt || '',
        content: req.body.content || '',
        published: Boolean(req.body.published),
        updatedAt: new Date()
      })
      .where(and(eq(posts.id, id), eq(posts.authorId, req.session.user.id)))
      .returning();

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    return res.json(post);
  } catch (error) {
    return next(error);
  }
});

router.delete('/posts/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await db.delete(posts).where(and(eq(posts.id, id), eq(posts.authorId, req.session.user.id)));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
