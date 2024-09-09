import Router from 'express';
import essaysRoutes from './essays.js';

const router = Router();

router.use('/essays', essaysRoutes);

export default router;