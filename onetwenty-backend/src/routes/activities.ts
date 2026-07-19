import { Router } from 'express';
import { db } from '../db/index.js';
import { activities, categories, sharedCapLedger } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { matchCategoryCandidates } from '../services/matchCategory.js';
import { classifyCertificate } from '../services/extractCertificate.js';
import { computeRawPoints, applyCapsAndLedger } from '../services/scoringEngine.js';
import { SHARED_CAP_CEILINGS } from '../config/sharedCapCeilings.js';
import { validateSpecialConditions } from '../services/validateSpecialConditions.js';

const router = Router();
router.use(requireAuth);

function getUserId(req: any): string {
  return req.userId;
}

// CREATE — add a new activity (legacy manual-entry path, kept for now)
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

// STEP 1 — extract + propose candidates. No DB write yet.
router.post('/extract', async (req, res) => {
  try {
    const { fileUrl, mimeType } = req.body;
    if (!fileUrl) return res.status(400).json({ error: 'fileUrl is required' });

    const allCategories = await db.select().from(categories);
    const result = await classifyCertificate(fileUrl, mimeType, allCategories);

    if (result.extractionFailed) {
      return res.json({ extracted: result, candidates: [] });
    }

    const mappedCandidates = result.candidates
      .map((c: { srNo: string; confidence: number; reasoning: string }) => {
        const category = allCategories.find((cat: any) => cat.srNo === c.srNo);
        return category ? { category, confidence: c.confidence, reasoning: c.reasoning } : null;
      })
      .filter((c: any): c is NonNullable<typeof c> => c !== null);

    const candidates = mappedCandidates.length > 0
    ? mappedCandidates
    : await matchCategoryCandidates({ title: result.title ?? '', issuingOrg: result.issuingOrg ?? '' });

    res.json({ extracted: result, candidates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Extraction failed' });
  }
});

// STEP 2 — student-confirmed submission. This is what actually scores and writes.
router.post('/confirm', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { categoryId, title, issuingOrg, eventDate, startDate, endDate, level, achievementStatus, tierKey, hours, evidenceFileUrl, extractionRaw, matchConfidence } = req.body;

    if (!categoryId || !title) {
      return res.status(400).json({ error: 'categoryId and title are required' });
    }

    const [category] = await db.select().from(categories).where(eq(categories.id, categoryId));
    if (!category) return res.status(404).json({ error: 'Category not found' });

    // eligibility check — must happen before scoring, since a failed condition
    // means this submission shouldn't be written or scored at all
    const validation = validateSpecialConditions(category, { title, issuingOrg, startDate, endDate, matchConfidence });
    if (validation.status === 'failed') {
      return res.status(422).json({ error: 'Eligibility check failed', reason: validation.reason });
    }

    // per_unit_capped needs to know how much of THIS category's own cap is already used
    // (separate from shared_cap_ledger, which tracks cross-category group ceilings)
    let priorInstancesTotal = 0;
    if (category.scoringType === 'per_unit_capped') {
      const priorRows = await db.select().from(activities)
        .where(and(eq(activities.userId, userId), eq(activities.categoryId, categoryId)));
      priorInstancesTotal = priorRows
        .filter(a => a.status !== 'sfa_rejected')
        .reduce((sum, a) => sum + (a.computedPoints ?? 0), 0);
    }

    const rawPoints = computeRawPoints(category, { level, achievementStatus, tierKey, hours, priorInstancesTotal });

    let ledgerRow;
    let currentLedgerTotal = 0;
    if (category.sharedCapGroup) {
      [ledgerRow] = await db.select().from(sharedCapLedger)
        .where(and(eq(sharedCapLedger.userId, userId), eq(sharedCapLedger.sharedCapGroup, category.sharedCapGroup)));
      currentLedgerTotal = ledgerRow?.totalAwarded ?? 0;
    }

    const { awarded, ledgerAfter } = applyCapsAndLedger(category, rawPoints, currentLedgerTotal);

    const [newActivity] = await db.insert(activities).values({
      userId, categoryId, title,
      pointsClaimed: rawPoints,
      computedPoints: awarded,
      level, achievementStatus,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      validationStatus: validation.status,
      validationNotes: validation.reason,
      status: 'pending_review', // always pending — SFA sign-off is mandatory, no auto-approve path
      eventDate: eventDate ? new Date(eventDate) : null,
      evidenceFileUrl, extractionRaw,
    }).returning();

    if (category.sharedCapGroup) {
      if (ledgerRow) {
        await db.update(sharedCapLedger).set({ totalAwarded: ledgerAfter }).where(eq(sharedCapLedger.id, ledgerRow.id));
      } else {
        await db.insert(sharedCapLedger).values({ userId, sharedCapGroup: category.sharedCapGroup, totalAwarded: ledgerAfter });
      }
    }

    res.status(201).json(newActivity);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to score and submit activity' });
  }
});
// added to activities.ts, alongside /extract and /confirm
router.post('/preview-score', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { categoryId, level, achievementStatus, tierKey, hours } = req.body;

    const [category] = await db.select().from(categories).where(eq(categories.id, categoryId));
    if (!category) return res.status(404).json({ error: 'Category not found' });

    let priorInstancesTotal = 0;
    if (category.scoringType === 'per_unit_capped') {
      const priorRows = await db.select().from(activities)
        .where(and(eq(activities.userId, userId), eq(activities.categoryId, categoryId)));
      priorInstancesTotal = priorRows
        .filter(a => a.status !== 'sfa_rejected')
        .reduce((sum, a) => sum + (a.computedPoints ?? 0), 0);
    }

    const rawPoints = computeRawPoints(category, { level, achievementStatus, tierKey, hours, priorInstancesTotal });

    let currentLedgerTotal = 0;
    if (category.sharedCapGroup) {
      const [ledgerRow] = await db.select().from(sharedCapLedger)
        .where(and(eq(sharedCapLedger.userId, userId), eq(sharedCapLedger.sharedCapGroup, category.sharedCapGroup)));
      currentLedgerTotal = ledgerRow?.totalAwarded ?? 0;
    }

    const { awarded, cappedFromRaw } = applyCapsAndLedger(category, rawPoints, currentLedgerTotal);
    const groupCeiling = category.sharedCapGroup ? SHARED_CAP_CEILINGS[category.sharedCapGroup] : null;

    res.json({ rawPoints, awarded, cappedFromRaw, groupCeiling, groupUsedBefore: currentLedgerTotal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Preview failed' });
  }
});

// route additions to activities.ts
import multer from 'multer';
import { uploadCertificate, getSignedUrl } from '../services/supabaseStorage.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!req.file) return res.status(400).json({ error: 'file is required' });

    const path = await uploadCertificate(userId, req.file.buffer, req.file.originalname, req.file.mimetype);
    const signedUrl = await getSignedUrl(path);

    res.json({ path, signedUrl, mimeType: req.file.mimetype });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;