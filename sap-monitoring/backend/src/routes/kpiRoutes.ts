import { Router } from 'express';
import { getKpis, createKpi } from '../controllers/kpiController';

const router = Router();

router.get('/kpis', getKpis);
router.post('/kpis', createKpi);

export default router;
