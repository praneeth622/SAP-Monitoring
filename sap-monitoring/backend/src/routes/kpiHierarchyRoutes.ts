import { Router } from 'express';
import { getKpiHierarchy } from '../controllers/kpiHierarchyController';

const router = Router();

router.get('/kpi-hierarchy', getKpiHierarchy);

export default router;
