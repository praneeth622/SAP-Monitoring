import { Router } from 'express';
import { getMonitoringAreas, createMonitoringArea } from '../controllers/monitoringAreaController';

const router = Router();

router.get('/monitoring-areas', getMonitoringAreas);
router.post('/monitoring-areas', createMonitoringArea);

export default router;
