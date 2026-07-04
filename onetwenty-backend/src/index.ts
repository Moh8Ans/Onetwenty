import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import activitiesRouter from './routes/activities.js';
import categoriesRouter from './routes/categories.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/activities', activitiesRouter);
app.use('/api/categories', categoriesRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));