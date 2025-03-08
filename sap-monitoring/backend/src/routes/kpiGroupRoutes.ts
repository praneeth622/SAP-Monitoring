import { Router } from 'express';
import { getKpiGroups, createKpiGroup } from '../controllers/kpiGroupController';

const router = Router();

router.get('/kpi-groups', getKpiGroups);
router.post('/kpi-groups', createKpiGroup);

export default router;
