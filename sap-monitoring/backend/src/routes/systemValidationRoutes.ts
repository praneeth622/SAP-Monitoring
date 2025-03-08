import { Router, RequestHandler } from 'express';
import { validateAndCreateSystem } from '../controllers/systemValidationController';

const router = Router();

router.post('/system-validation', validateAndCreateSystem as RequestHandler);

export default router;
