import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import {
  getUsers, createUser, updateUser, resetUserPassword, deleteUser,
  getBranch, updateBranch,
  getSystemConfig, updateSystemConfig,
} from '../controllers/settings.controller';

const router = Router();
const adminOnly = requireRole(['ADMIN']);

// ── Users (Admin only) ──
router.get('/users', requireAuth, adminOnly, getUsers);
router.post('/users', requireAuth, adminOnly, createUser);
router.patch('/users/:id', requireAuth, adminOnly, updateUser);
router.post('/users/:id/reset-password', requireAuth, adminOnly, resetUserPassword);
router.delete('/users/:id', requireAuth, adminOnly, deleteUser);

// ── Branch Info (Admin only) ──
router.get('/branch', requireAuth, adminOnly, getBranch);
router.patch('/branch', requireAuth, adminOnly, updateBranch);

// ── System Config (Admin only) ──
router.get('/system', requireAuth, adminOnly, getSystemConfig);
router.patch('/system', requireAuth, adminOnly, updateSystemConfig);

export default router;
