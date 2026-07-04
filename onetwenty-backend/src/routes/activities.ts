import { Router } from 'express';
import { db } from '../db/index.js';
import { activities, categories } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function getUserId(req: any): string {
  return req.userId;
}

// CREATE — add a new activity
router.post('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { categoryId, title, pointsClaimed, eventDate, status } = req.body;

    if (!categoryId || !title || pointsClaimed == null) {
      return res.status(400).json({ error: 'categoryId, title, and pointsClaimed are required' });
    }

    const [newActivity] = await db.insert(activities).values({
      userId,
      categoryId,
      title,
      pointsClaimed,
      eventDate: eventDate ? new Date(eventDate) : null,
      status: status || 'draft',
    }).returning();

    res.status(201).json(newActivity);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

// LIST — all activities for the current user
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await db.select().from(activities).where(eq(activities.userId, userId));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// GET ONE — single activity by id (scoped to user)
router.get('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const id = Number(req.params.id);

    const [result] = await db.select().from(activities)
      .where(and(eq(activities.id, id), eq(activities.userId, userId)));

    if (!result) return res.status(404).json({ error: 'Activity not found' });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// UPDATE — edit an existing activity
router.put('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const id = Number(req.params.id);
    const { categoryId, title, pointsClaimed, eventDate, status } = req.body;

    const [updated] = await db.update(activities)
      .set({
        ...(categoryId && { categoryId }),
        ...(title && { title }),
        ...(pointsClaimed != null && { pointsClaimed }),
        ...(eventDate && { eventDate: new Date(eventDate) }),
        ...(status && { status }),
      })
      .where(and(eq(activities.id, id), eq(activities.userId, userId)))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Activity not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

// DELETE — remove an activity
router.delete('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const id = Number(req.params.id);

    const [deleted] = await db.delete(activities)
      .where(and(eq(activities.id, id), eq(activities.userId, userId)))
      .returning();

    if (!deleted) return res.status(404).json({ error: 'Activity not found' });
    res.json({ message: 'Deleted', activity: deleted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

export default router;