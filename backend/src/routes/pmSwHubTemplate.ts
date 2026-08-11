import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('IT_ADMIN', 'SUPERADMIN'));

// Get all templates
router.get('/', async (req, res) => {
  try {
    const templates = await prisma.pMSwHubTemplate.findMany({
      include: {
        _count: {
          select: { items: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get the active template (legacy support)
router.get('/active', async (req, res) => {
  try {
    const template = await prisma.pMSwHubTemplate.findFirst({
      where: { isActive: true },
      include: {
        items: {
          orderBy: { order: 'asc' }
        }
      }
    });
    res.json(template);
  } catch (error) {
    console.error('Error fetching active template:', error);
    res.status(500).json({ error: 'Failed to fetch active template' });
  }
});

// Get specific template
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await prisma.pMSwHubTemplate.findUnique({
      where: { id: Number(id) },
      include: {
        items: {
          orderBy: { order: 'asc' }
        }
      }
    });
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create or Update template and its items
router.post('/save', async (req, res) => {
  try {
    const { id, name, description, items, isActive } = req.body;

    let template;

    if (id) {
      // Update existing
      template = await prisma.pMSwHubTemplate.update({
        where: { id: Number(id) },
        data: { name, description, isActive: isActive ?? true }
      });
    } else {
      // Create new
      template = await prisma.pMSwHubTemplate.create({
        data: {
          name: name || `Template ${Date.now()}`,
          description: description || '',
          isActive: isActive ?? true
        }
      });
    }

    // If this one is active, deactivate others (only one active at a time for simplicity in forms)
    if (template.isActive) {
      await prisma.pMSwHubTemplate.updateMany({
        where: { id: { not: template.id } },
        data: { isActive: false }
      });
    }

    // Replace items
    await prisma.pMSwHubTemplateItem.deleteMany({
      where: { templateId: template.id }
    });

    if (items && items.length > 0) {
      await prisma.pMSwHubTemplateItem.createMany({
        data: items.map((item: any, index: number) => ({
          templateId: template!.id,
          group: item.group,
          key: item.key || `key_${index}_${Date.now()}`,
          label: item.label,
          type: item.type || 'boolean',
          required: item.required || false,
          order: index
        }))
      });
    }

    const updatedTemplate = await prisma.pMSwHubTemplate.findUnique({
      where: { id: template.id },
      include: {
        items: { orderBy: { order: 'asc' } }
      }
    });

    res.json(updatedTemplate);
  } catch (error) {
    console.error('Error saving template:', error);
    res.status(500).json({ error: 'Failed to save template' });
  }
});

// Delete template
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.pMSwHubTemplate.delete({
      where: { id: Number(id) }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;
