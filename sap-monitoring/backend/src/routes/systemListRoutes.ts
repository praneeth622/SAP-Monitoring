import { Router } from 'express';
import { getSystemList, deleteSystem } from '../controllers/systemListController';

const router = Router();

router.get('/systems', getSystemList);
router.delete('/systems/:id', deleteSystem);

export default router;
