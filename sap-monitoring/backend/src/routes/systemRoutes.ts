import { Router } from 'express';
import { getSystems, createSystem } from '../controllers/systemController';

const router = Router();

router.get('/systems', getSystems);
router.post('/systems', createSystem);

export default router;
