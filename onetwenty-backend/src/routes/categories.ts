import { Router } from 'express';
import { db } from '../db/index.js';
import { categories } from '../db/schema.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const result = await db.select().from(categories);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

export default router;