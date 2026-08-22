import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { buildLiveFloorPlan, listSeatOwners, listFloorCandidates, deskGeometry } from '../services/floorPlanLive';

const router = express.Router();

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'floorplans');
// Ensure directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('ประเภทไฟล์ไม่รองรับ (รองรับเฉพาะไฟล์รูปภาพ)'));
  },
});

router.use(authenticate);

// Get all floor plans
router.get('/', async (req, res) => {
  try {
    const plans = await prisma.floorPlan.findMany({
      where: { isActive: true },
      orderBy: { floor: 'asc' },
      include: {
        _count: { select: { pins: true } }
      }
    });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch floor plans' });
  }
});

/**
 * แผนผังพร้อมอุปกรณ์ที่ประกอบจากข้อมูลจริง ณ ตอนเปิดดู
 *
 * ต้องมาก่อน "/:id" ไม่งั้น express จะจับ "owners" เป็น id แล้วตอบ 404
 */
router.get('/owners', async (req, res) => {
  try {
    const q = String(req.query.q ?? '').trim();
    const company = String(req.query.company ?? '').trim() || undefined;
    res.json(await listSeatOwners(prisma, q, company));
  } catch (error) {
    console.error('List seat owners error:', error);
    res.status(500).json({ error: 'Failed to list owners' });
  }
});

router.get('/:id/live', async (req, res) => {
  try {
    const parsedYear = Number(req.query.year);
    const year = Number.isInteger(parsedYear) ? parsedYear : new Date().getFullYear();
    const data = await buildLiveFloorPlan(prisma, Number(req.params.id), year);
    if (!data) return res.status(404).json({ error: 'Floor plan not found' });
    res.json(data);
  } catch (error) {
    console.error('Live floor plan error:', error);
    res.status(500).json({ error: 'Failed to build floor plan' });
  }
});

/**
 * บันทึกโซนทั้งแปลนในครั้งเดียว
 *
 * ต่างจากที่นั่งตรงที่ลบทิ้งทั้งชุดไม่ได้ — ที่นั่งอ้างถึง zoneId อยู่ ถ้าลบโซน
 * ที่นั่งจะหลุดออกจากตาราง (FK เป็น SET NULL) แล้วกลับไปลอยที่พิกัดเดิม
 * จึงอัปเดตทีละแถวและลบเฉพาะโซนที่หายไปจากรายการจริง ๆ
 */
router.put('/:id/zones', authorize('IT_ADMIN', 'SUPERADMIN'), async (req, res) => {
  try {
    const planId = Number(req.params.id);
    const rows = Array.isArray(req.body?.zones) ? req.body.zones : [];

    const codes = rows.map((r: any) => String(r?.code ?? '').trim().toUpperCase()).filter(Boolean);
    if (codes.length !== rows.length) return res.status(400).json({ error: 'ทุกโซนต้องมีรหัสแผนก' });
    const dup = codes.find((c: string, i: number) => codes.indexOf(c) !== i);
    if (dup) return res.status(400).json({ error: `มีโซนรหัส "${dup}" ซ้ำกัน` });

    const num = (v: any, min: number, max: number, dflt: number) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
    };

    await prisma.$transaction(async (tx) => {
      const existing = await tx.floorPlanZone.findMany({ where: { floorPlanId: planId } });
      const keep = new Set<number>();

      for (const [i, r] of rows.entries()) {
        const data = {
          code: String(r.code).trim().toUpperCase(),
          name: String(r.name ?? '').trim() || null,
          color: String(r.color ?? '').trim() || null,
          kind: r.kind === 'ROOM' ? 'ROOM' : 'DESKS',
          x: num(r.x, 0, 100, 0),
          y: num(r.y, 0, 100, 0),
          w: num(r.w, 0.5, 100, 10),
          h: num(r.h, 0.5, 100, 10),
          // ตารางใหญ่กว่านี้ช่องจะเล็กจนกดไม่โดน
          cols: Math.round(num(r.cols, 1, 20, 1)),
          rows: Math.round(num(r.rows, 1, 20, 1)),
          sortOrder: i,
        };
        const found = existing.find(z => z.id === Number(r.id))
          ?? existing.find(z => z.code === data.code);
        if (found) {
          keep.add(found.id);
          await tx.floorPlanZone.update({ where: { id: found.id }, data });
        } else {
          const made = await tx.floorPlanZone.create({ data: { ...data, floorPlanId: planId } });
          keep.add(made.id);
        }
      }

      const gone = existing.filter(z => !keep.has(z.id)).map(z => z.id);
      if (gone.length) await tx.floorPlanZone.deleteMany({ where: { id: { in: gone } } });

      // ย่อตารางลงแล้วที่นั่งที่อยู่ช่องท้าย ๆ จะชี้ไปยังโต๊ะที่ไม่มีอยู่แล้ว
      // เปลี่ยนโซนเป็น ROOM ก็เช่นกัน เพราะ ROOM ไม่มีโต๊ะเลย
      // ปล่อยให้หลุดกลับเป็นหมุดอิสระ ดีกว่าหายไปเฉย ๆ
      for (const z of await tx.floorPlanZone.findMany({ where: { floorPlanId: planId } })) {
        await tx.floorPlanSeat.updateMany({
          where: {
            zoneId: z.id,
            ...(z.kind === 'DESKS' ? { deskIndex: { gte: z.cols * z.rows } } : {}),
          },
          data: { zoneId: null, deskIndex: null },
        });
      }

      // ที่นั่งที่ยังเกาะโต๊ะอยู่ ต้องขยับตามกรอบโซนที่เพิ่งเปลี่ยน
      for (const z of await tx.floorPlanZone.findMany({ where: { floorPlanId: planId, kind: 'DESKS' } })) {
        const geo = deskGeometry(z);
        for (const s of await tx.floorPlanSeat.findMany({ where: { zoneId: z.id } })) {
          const d = s.deskIndex === null ? undefined : geo[s.deskIndex];
          if (d) await tx.floorPlanSeat.update({ where: { id: s.id }, data: { x: d.cx, y: d.cy } });
        }
      }
    });

    const parsedYear = Number(req.query.year);
    const year = Number.isInteger(parsedYear) ? parsedYear : new Date().getFullYear();
    res.json(await buildLiveFloorPlan(prisma, planId, year));
  } catch (error) {
    console.error('Update zones error:', error);
    res.status(500).json({ error: 'Failed to update zones' });
  }
});

/**
 * ลอกชุดโซนจากเทมเพลตลงบนแปลน
 *
 * ทับของเดิมทั้งชุด เพราะการใช้เทมเพลตคือการบอกว่า "เอาผังนี้" ไม่ใช่ "ผสมกับของเดิม"
 * ที่นั่งที่เคยเกาะโซนเก่าจะหลุดเป็นหมุดอิสระผ่าน FK ไม่ได้หายไป
 */
async function applyTemplate(db: typeof prisma, planId: number, templateId: number) {
  const t = await db.floorPlanTemplate.findUnique({ where: { id: templateId } });
  if (!t) throw new Error('ไม่พบเทมเพลต');
  const rows = Array.isArray(t.zones) ? (t.zones as any[]) : [];
  await db.$transaction(async (tx) => {
    await tx.floorPlanZone.deleteMany({ where: { floorPlanId: planId } });
    for (const [i, z] of rows.entries()) {
      await tx.floorPlanZone.create({
        data: {
          floorPlanId: planId,
          code: String(z.code ?? `Z${i + 1}`).trim().toUpperCase(),
          name: z.name ?? null,
          color: z.color ?? null,
          kind: z.kind === 'ROOM' ? 'ROOM' : 'DESKS',
          x: Number(z.x) || 0, y: Number(z.y) || 0,
          w: Number(z.w) || 10, h: Number(z.h) || 10,
          cols: Math.max(1, Math.round(Number(z.cols) || 1)),
          rows: Math.max(1, Math.round(Number(z.rows) || 1)),
          sortOrder: i,
        },
      });
    }
    if (t.aspect) {
      const plan = await tx.floorPlan.findUnique({ where: { id: planId }, select: { imageUrl: true } });
      if (!plan?.imageUrl) await tx.floorPlan.update({ where: { id: planId }, data: { aspect: t.aspect } });
    }
  });
}

/** เทมเพลตทั้งหมด พร้อมจำนวนโซนและโต๊ะ เพื่อให้เลือกได้โดยไม่ต้องเปิดดู */
router.get('/templates/list', async (_req, res) => {
  try {
    const list = await prisma.floorPlanTemplate.findMany({ orderBy: { name: 'asc' } });
    res.json(list.map(t => {
      const zones = Array.isArray(t.zones) ? (t.zones as any[]) : [];
      return {
        id: t.id, name: t.name, description: t.description, company: t.company, aspect: t.aspect,
        zoneCount: zones.length,
        deskCount: zones.reduce((n, z) => n + (z?.kind === 'ROOM' ? 0 : (Number(z?.cols) || 0) * (Number(z?.rows) || 0)), 0),
        createdBy: t.createdBy, updatedAt: t.updatedAt,
      };
    }));
  } catch (error) {
    console.error('List templates error:', error);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

/** บันทึกชุดโซนของแปลนนี้เป็นเทมเพลต — เก็บเฉพาะผัง ไม่เก็บคน */
router.post('/:id/save-template', authorize('IT_ADMIN', 'SUPERADMIN'), async (req: any, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'ต้องตั้งชื่อเทมเพลต' });

    const plan = await prisma.floorPlan.findUnique({
      where: { id: Number(req.params.id) },
      include: { zones: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
    });
    if (!plan) return res.status(404).json({ error: 'ไม่พบแปลน' });
    if (!plan.zones.length) return res.status(400).json({ error: 'แปลนนี้ยังไม่มีโซนให้บันทึก' });

    // เก็บเฉพาะรูปทรงของผัง ที่นั่งเป็นของชั้นนั้น ๆ ไม่ใช่ของเทมเพลต
    const zones = plan.zones.map(z => ({
      code: z.code, name: z.name, color: z.color, kind: z.kind,
      x: z.x, y: z.y, w: z.w, h: z.h, cols: z.cols, rows: z.rows,
    }));

    const data = {
      name,
      description: String(req.body?.description ?? '').trim() || null,
      company: plan.company,
      aspect: plan.aspect,
      zones,
      createdBy: req.user?.displayName || req.user?.username || null,
    };
    const saved = await prisma.floorPlanTemplate.upsert({
      where: { name }, create: data, update: data,
    });
    res.status(201).json(saved);
  } catch (error) {
    console.error('Save template error:', error);
    res.status(500).json({ error: 'Failed to save template' });
  }
});

/** ใช้เทมเพลตกับแปลนที่มีอยู่แล้ว */
router.post('/:id/apply-template', authorize('IT_ADMIN', 'SUPERADMIN'), async (req, res) => {
  try {
    const planId = Number(req.params.id);
    await applyTemplate(prisma, planId, Number(req.body?.templateId));
    const parsedYear = Number(req.query.year);
    const year = Number.isInteger(parsedYear) ? parsedYear : new Date().getFullYear();
    res.json(await buildLiveFloorPlan(prisma, planId, year));
  } catch (error: any) {
    console.error('Apply template error:', error);
    res.status(500).json({ error: error?.message || 'Failed to apply template' });
  }
});

router.delete('/templates/:tid', authorize('IT_ADMIN', 'SUPERADMIN'), async (req, res) => {
  try {
    await prisma.floorPlanTemplate.delete({ where: { id: Number(req.params.tid) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

/** คนที่ควรอยู่บนแปลนนี้ เตรียมไว้ให้กดวางเลยโดยไม่ต้องค้นทีละชื่อ */
router.get('/:id/candidates', async (req, res) => {
  try {
    const parsedYear = Number(req.query.year);
    const year = Number.isInteger(parsedYear) ? parsedYear : new Date().getFullYear();
    res.json(await listFloorCandidates(prisma, Number(req.params.id), year));
  } catch (error) {
    console.error('Floor candidates error:', error);
    res.status(500).json({ error: 'Failed to list candidates' });
  }
});

/**
 * บันทึกที่นั่งทั้งแปลนในครั้งเดียว
 *
 * แทนที่ทั้งชุดเหมือนที่ /pins ทำ เพราะหน้าจอแก้ไขทั้งแปลนแล้วค่อยกดบันทึก
 * ครั้งเดียว การส่งเฉพาะส่วนที่เปลี่ยนจะทำให้ทั้งสองฝั่งต้องตามสถานะกันเอง
 */
router.put('/:id/seats', authorize('IT_ADMIN', 'SUPERADMIN'), async (req, res) => {
  try {
    const planId = Number(req.params.id);
    const { seats } = req.body as { seats?: any[] };
    const rows = Array.isArray(seats) ? seats : [];

    // คนหนึ่งคนนั่งได้ที่เดียวต่อหนึ่งแปลน — ฐานข้อมูลมี unique index กันไว้อยู่แล้ว
    // แต่ตอบ 400 ให้ชัดดีกว่าปล่อยให้ล้มเป็น 500 ที่อ่านไม่ออก
    const owners = rows.map(r => String(r?.ownerName ?? '').trim().toLowerCase()).filter(Boolean);
    const dup = owners.find((o, i) => owners.indexOf(o) !== i);
    if (dup) return res.status(400).json({ error: `มีที่นั่งของ "${dup}" ซ้ำกันในแปลนนี้` });

    // สองคนนั่งโต๊ะเดียวกันไม่ได้ ฐานข้อมูลมี unique index กันไว้ แต่ตอบ 400
    // ให้อ่านรู้เรื่องดีกว่าปล่อยให้ล้มเป็น 500
    const desks = rows
      .filter(r => r?.zoneId != null && r?.deskIndex != null)
      .map(r => `${r.zoneId}:${r.deskIndex}`);
    const dupDesk = desks.find((d, i) => desks.indexOf(d) !== i);
    if (dupDesk) return res.status(400).json({ error: 'มีที่นั่งซ้อนกันอยู่บนโต๊ะเดียวกัน' });

    // ที่นั่งที่เกาะโต๊ะ ให้ x,y มาจากตารางของโซนเสมอ ไม่ใช่ค่าที่หน้าจอส่งมา —
    // โซนคือแหล่งความจริง หน้าจออาจส่งพิกัดเก่ามาถ้าโซนเพิ่งถูกขยับ
    const zones = await prisma.floorPlanZone.findMany({ where: { floorPlanId: planId } });
    const pos = new Map<string, { cx: number; cy: number }>();
    for (const z of zones) {
      for (const d of deskGeometry(z)) pos.set(`${z.id}:${d.index}`, { cx: d.cx, cy: d.cy });
    }

    await prisma.$transaction(async (tx) => {
      await tx.floorPlanSeat.deleteMany({ where: { floorPlanId: planId } });
      if (rows.length) {
        await tx.floorPlanSeat.createMany({
          data: rows.map(r => {
            const zoneId = r.zoneId == null ? null : Number(r.zoneId);
            const deskIndex = r.deskIndex == null ? null : Number(r.deskIndex);
            const snapped = zoneId !== null && deskIndex !== null
              ? pos.get(`${zoneId}:${deskIndex}`) : undefined;
            return {
              floorPlanId: planId,
              zoneId: snapped ? zoneId : null,
              deskIndex: snapped ? deskIndex : null,
              x: snapped ? snapped.cx : (Number(r.x) || 0),
              y: snapped ? snapped.cy : (Number(r.y) || 0),
              label: String(r.label ?? '').trim() || null,
              ownerName: String(r.ownerName ?? '').trim() || null,
              departmentId: String(r.departmentId ?? '').trim() || null,
              note: String(r.note ?? '').trim() || null,
            };
          }),
        });
      }
    });

    const parsedYear = Number(req.query.year);
    const year = Number.isInteger(parsedYear) ? parsedYear : new Date().getFullYear();
    res.json(await buildLiveFloorPlan(prisma, planId, year));
  } catch (error) {
    console.error('Update seats error:', error);
    res.status(500).json({ error: 'Failed to update seats' });
  }
});

// Get floor plan by ID (with pins and asset basic info)
router.get('/:id', async (req, res) => {
  try {
    const plan = await prisma.floorPlan.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        pins: {
          include: {
            asset: {
              select: {
                id: true,
                assetCode: true,
                assetName: true,
                type: true,
                ownerName: true,
                departmentId: true,
              }
            }
          }
        }
      }
    });
    if (!plan) return res.status(404).json({ error: 'Floor plan not found' });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch floor plan' });
  }
});

// Create new floor plan
/**
 * สร้างแปลนใหม่ — รูปไม่บังคับอีกต่อไป
 *
 * เดิมบังคับต้องแนบรูป การเปิดชั้นใหม่จึงต้องรอไฟล์จากฝ่ายอาคาร และทั้งระบบ
 * ค้างอยู่ที่แปลนเดียว ผังที่วาดเองใช้ผืนว่างกับสัดส่วนที่กำหนดแทน
 *
 * templateId เลือกได้ เพื่อลอกชุดโซนจากชั้นที่เคยจัดไว้แล้วมาเป็นจุดตั้งต้น
 */
router.post('/', authorize('IT_ADMIN', 'SUPERADMIN'), upload.single('image'), async (req, res) => {
  try {
    const { name, floor, building, company, aspect, templateId } = req.body;
    if (!String(name ?? '').trim()) return res.status(400).json({ error: 'ต้องมีชื่อแปลน' });

    const ratio = Number(aspect);
    const plan = await prisma.floorPlan.create({
      data: {
        name: String(name).trim(),
        floor: String(floor ?? '').trim(),
        building: building || null,
        company: company || null,
        imageUrl: req.file ? `/uploads/floorplans/${req.file.filename}` : null,
        aspect: req.file ? null : (Number.isFinite(ratio) && ratio > 0.2 && ratio < 5 ? ratio : 1.6),
      }
    });

    if (templateId) {
      await applyTemplate(prisma, plan.id, Number(templateId));
    }
    res.status(201).json(plan);
  } catch (error) {
    console.error('Create floor plan error:', error);
    res.status(500).json({ error: 'Failed to create floor plan' });
  }
});

// Update floor plan
router.put('/:id', authorize('IT_ADMIN', 'SUPERADMIN'), upload.single('image'), async (req, res) => {
  try {
    const { name, floor, building, company, isActive } = req.body;
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (floor !== undefined) updateData.floor = floor;
    if (building !== undefined) updateData.building = building;
    if (company !== undefined) updateData.company = company;
    if (isActive !== undefined) updateData.isActive = isActive === 'true' || isActive === true;
    const ratio = Number(req.body.aspect);
    if (Number.isFinite(ratio) && ratio > 0.2 && ratio < 5) updateData.aspect = ratio;

    if (req.file) {
      updateData.imageUrl = `/uploads/floorplans/${req.file.filename}`;
    }

    const plan = await prisma.floorPlan.update({
      where: { id: Number(req.params.id) },
      data: updateData
    });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update floor plan' });
  }
});

// Delete floor plan
router.delete('/:id', authorize('IT_ADMIN', 'SUPERADMIN'), async (req, res) => {
  try {
    await prisma.floorPlan.delete({
      where: { id: Number(req.params.id) }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete floor plan' });
  }
});

// Upsert pins for a floor plan
router.put('/:id/pins', authorize('IT_ADMIN', 'SUPERADMIN'), async (req, res) => {
  try {
    const planId = Number(req.params.id);
    const { pins } = req.body; // Array of { assetId, x, y, label }

    await prisma.$transaction(async (tx) => {
      // 1. Delete all existing pins
      await tx.floorPlanPin.deleteMany({
        where: { floorPlanId: planId }
      });

      // 2. Insert new pins
      if (pins && pins.length > 0) {
        await tx.floorPlanPin.createMany({
          data: pins.map((p: any) => ({
            floorPlanId: planId,
            assetId: p.assetId,
            x: p.x,
            y: p.y,
            label: p.label || null
          }))
        });
      }
    });

    const updatedPlan = await prisma.floorPlan.findUnique({
      where: { id: planId },
      include: {
        pins: {
          include: {
            asset: {
              select: {
                id: true,
                assetCode: true,
                assetName: true,
                type: true,
                ownerName: true,
                departmentId: true,
              }
            }
          }
        }
      }
    });

    res.json(updatedPlan);
  } catch (error) {
    console.error('Update pins error:', error);
    res.status(500).json({ error: 'Failed to update pins' });
  }
});

export default router;
