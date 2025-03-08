import { Router } from 'express';
import { getSystemStats } from '../controllers/systemStatsController';

const router = Router();

router.get('/system-stats', getSystemStats);

export default router;
