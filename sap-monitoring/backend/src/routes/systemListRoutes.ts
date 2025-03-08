import { Router } from 'express';
import { getSystemList } from '../controllers/systemListController';

const router = Router();

router.get('/systems', getSystemList);

export default router;
