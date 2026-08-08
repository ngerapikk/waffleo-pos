import { Router } from 'express';
import { getChannels } from '../controllers/channel.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', requireAuth, getChannels);

export default router;
