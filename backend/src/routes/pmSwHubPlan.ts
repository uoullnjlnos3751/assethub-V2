import { Router, Request, Response, RequestHandler } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('IT_ADMIN', 'SUPERADMIN'));

// Get all SW/Hub Plans
const getAllPlans: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const plans = await prisma.pMSwHubPlan.findMany({
      include: {
        swHubs: {
          include: {
            items: true
          }
        },
        template: true
      },
      orderBy: [
        { year: 'desc' },
        { floor: 'asc' }
      ]
    });
    res.json(plans);
  } catch (error) {
    console.error('Error fetching SW/Hub plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
};

// Create new plan
const createPlan: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year, floor, period, startDate, endDate, technician, templateId } = req.body;
    const newPlan = await prisma.pMSwHubPlan.create({
      data: {
        year: Number(year),
        floor,
        period,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        technician,
        templateId: templateId ? Number(templateId) : null
      }
    });
    res.json(newPlan);
  } catch (error) {
    console.error('Error creating SW/Hub plan:', error);
    res.status(500).json({ error: 'Failed to create plan' });
  }
};

// Update plan
const updatePlan: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { year, floor, period, startDate, endDate, technician, status, templateId } = req.body;
    
    const updated = await prisma.pMSwHubPlan.update({
      where: { id: Number(id) },
      data: {
        year: Number(year),
        floor,
        period,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        technician,
        status,
        templateId: templateId !== undefined ? (templateId ? Number(templateId) : null) : undefined
      }
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating SW/Hub plan:', error);
    res.status(500).json({ error: 'Failed to update plan' });
  }
};

// Delete plan
const deletePlan: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.pMSwHubPlan.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting SW/Hub plan:', error);
    res.status(500).json({ error: 'Failed to delete plan' });
  }
};

router.get('/', getAllPlans);
router.post('/', createPlan);
router.put('/:id', updatePlan);
router.delete('/:id', deletePlan);

export default router;
