import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/auth.middleware';
import {
  getToppings, createTopping, updateTopping, toggleTopping,
  getFlavours, createFlavour, updateFlavour, toggleFlavour,
  getAddons, createAddon, updateAddon, toggleAddon,
  getDrinks, createDrink, updateDrink, toggleDrink,
  getMenuCatalog,
} from '../controllers/menu.controller';

const router = Router();
const supervisorPlus = requireRole(['SUPERVISOR', 'ADMIN']);

// Public catalog (POS)
router.get('/', requireAuth, getMenuCatalog);

// ── Toppings ──
router.get('/toppings', requireAuth, getToppings);
router.post('/toppings', requireAuth, supervisorPlus, createTopping);
router.patch('/toppings/:id', requireAuth, supervisorPlus, updateTopping);
router.patch('/toppings/:id/toggle', requireAuth, supervisorPlus, toggleTopping);

// ── Flavours ──
router.get('/flavours', requireAuth, getFlavours);
router.post('/flavours', requireAuth, supervisorPlus, createFlavour);
router.patch('/flavours/:id', requireAuth, supervisorPlus, updateFlavour);
router.patch('/flavours/:id/toggle', requireAuth, supervisorPlus, toggleFlavour);

// ── Add-ons ──
router.get('/addons', requireAuth, getAddons);
router.post('/addons', requireAuth, supervisorPlus, createAddon);
router.patch('/addons/:id', requireAuth, supervisorPlus, updateAddon);
router.patch('/addons/:id/toggle', requireAuth, supervisorPlus, toggleAddon);

// ── Drinks ──
router.get('/drinks', requireAuth, getDrinks);
router.post('/drinks', requireAuth, supervisorPlus, createDrink);
router.patch('/drinks/:id', requireAuth, supervisorPlus, updateDrink);
router.patch('/drinks/:id/toggle', requireAuth, supervisorPlus, toggleDrink);

export default router;
