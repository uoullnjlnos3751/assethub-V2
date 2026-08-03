import { Router, Request, Response } from 'express';
import { GoogleGenAI, FunctionDeclaration, Type } from '@google/genai';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. AI Chatbot will not work.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

// Pinned to an established model rather than the "-latest" alias: that alias
// tracks whatever Google just shipped, and brand-new models launch with very
// tight free-tier quotas (hit RESOURCE_EXHAUSTED at 20 requests/day on
// gemini-3.6-flash within a single afternoon of testing).
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

// Define Tools (Function Calling)
const assetSearchTool: FunctionDeclaration = {
  name: "search_assets",
  description: "ค้นหาข้อมูลคอมพิวเตอร์และทรัพย์สินจากฐานข้อมูล สามารถค้นหาด้วยรหัสทรัพย์สิน, ซีเรียลนัมเบอร์, ชื่อผู้ถือครอง, แผนก, ชนิด, หรือสถานะ",
  parameters: {
    type: Type.OBJECT,
    properties: {
      ownerName: { type: Type.STRING, description: "ชื่อหรือนามสกุลของผู้ถือครอง" },
      department: { type: Type.STRING, description: "ชื่อแผนกหรือฝ่าย" },
      status: { type: Type.STRING, description: "สถานะของทรัพย์สิน เช่น Available, InUse, Maintenance, Retired" },
      assetType: { type: Type.STRING, description: "ประเภท เช่น PC, Notebook, Monitor, Printer, UPS" },
      serialNumber: { type: Type.STRING, description: "หมายเลข Serial Number" },
      assetCode: { type: Type.STRING, description: "รหัสทรัพย์สิน (Asset Code)" },
    },
  },
};

const getAssetStatsTool: FunctionDeclaration = {
  name: "get_asset_stats",
  description: "สรุปจำนวนทรัพย์สินทั้งหมด แบ่งตามประเภท (assetType) หรือสถานะ (status)",
  parameters: {
    type: Type.OBJECT,
    properties: {
      groupBy: {
        type: Type.STRING,
        description: "จัดกลุ่มตามอะไร: 'status' หรือ 'assetType'"
      },
    },
    required: ["groupBy"],
  },
};

const getExpiringItemsTool: FunctionDeclaration = {
  name: "get_expiring_items",
  description: "ค้นหาสัญญา (Contract: ประกัน/MA/เช่า) หรือไลเซนส์ซอฟต์แวร์ (License) ที่ใกล้จะหมดอายุหรือหมดอายุไปแล้ว",
  parameters: {
    type: Type.OBJECT,
    properties: {
      itemType: { type: Type.STRING, description: "ชนิดที่ต้องการค้นหา: 'contract', 'license' หรือ 'all' (ค่าเริ่มต้นคือ all)" },
      daysAhead: { type: Type.NUMBER, description: "ค้นหาสิ่งที่จะหมดอายุภายในกี่วันข้างหน้า (ค่าเริ่มต้น 30 วัน)" },
    },
  },
};

const getOverduePMTool: FunctionDeclaration = {
  name: "get_overdue_pm",
  description: "ค้นหาทรัพย์สินที่ถึงกำหนดทำ PM (Preventive Maintenance) แล้วแต่ยังไม่ได้ทำ (เกินกำหนด)",
  parameters: { type: Type.OBJECT, properties: {} },
};

const getOverdueBorrowsTool: FunctionDeclaration = {
  name: "get_overdue_borrows",
  description: "ค้นหาทรัพย์สินที่ถูกยืมไปแล้วเกินกำหนดวันคืน (ยืมเกินกำหนด)",
  parameters: { type: Type.OBJECT, properties: {} },
};

const SYSTEM_INSTRUCTION = "คุณคือ 'AssetHub Assistant' ผู้ช่วยอัจฉริยะสำหรับตอบคำถามเรื่องข้อมูลทรัพย์สินคอมพิวเตอร์ในระบบ ITSM ขององค์กร. หน้าที่ของคุณคือตอบคำถามด้วยความสุภาพ, แม่นยำ, และสั้นกระชับ. ถ้าผู้ใช้ถามข้อมูลที่ต้องค้นหาจากฐานข้อมูล ให้ใช้ฟังก์ชันที่กำหนด (search_assets, get_asset_stats, get_expiring_items, get_overdue_pm, get_overdue_borrows) เพื่อดึงข้อมูลจริงมาตอบเสมอ ห้ามเดาข้อมูล. คุณตอบได้ทั้งเรื่องทรัพย์สิน, สัญญา/ไลเซนส์ที่ใกล้หมดอายุ, PM ที่เกินกำหนด, และการยืม-คืนที่เกินกำหนด. ตอบเป็นภาษาไทย.";

async function runTool(call: { name?: string; args?: unknown }): Promise<any> {
  if (call.name === 'search_assets') {
    const args = call.args as any;
    const filters: any = {};

    if (args.ownerName) filters.ownerName = { contains: args.ownerName, mode: 'insensitive' };
    if (args.department) filters.departmentId = { contains: args.department, mode: 'insensitive' };
    if (args.assetType) filters.type = { contains: args.assetType, mode: 'insensitive' };
    if (args.serialNumber) filters.serialNo = { contains: args.serialNumber, mode: 'insensitive' };
    if (args.assetCode) filters.assetCode = { contains: args.assetCode, mode: 'insensitive' };
    if (args.status) filters.status = { contains: args.status, mode: 'insensitive' };

    return prisma.asset.findMany({
      where: filters,
      take: 15,
      select: {
        assetCode: true,
        serialNo: true,
        type: true,
        ownerName: true,
        departmentId: true,
        status: true,
        warrantyEndDate: true
      }
    });
  }

  if (call.name === 'get_asset_stats') {
    const args = call.args as any;
    if (args.groupBy === 'status') {
      return prisma.asset.groupBy({ by: ['status'], _count: { id: true } });
    }
    return prisma.asset.groupBy({ by: ['type'], _count: { id: true } });
  }

  if (call.name === 'get_expiring_items') {
    const args = call.args as any;
    const itemType = args.itemType || 'all';
    const daysAhead = Number(args.daysAhead) > 0 ? Number(args.daysAhead) : 30;
    const cutoff = new Date(Date.now() + daysAhead * 86400000);
    const result: any = {};

    if (itemType === 'contract' || itemType === 'all') {
      result.contracts = await prisma.contract.findMany({
        where: { isActive: true, endDate: { lte: cutoff } },
        orderBy: { endDate: 'asc' },
        take: 15,
        select: { title: true, contractNo: true, contractType: true, vendor: true, endDate: true },
      });
    }
    if (itemType === 'license' || itemType === 'all') {
      result.licenses = await prisma.softwareLicense.findMany({
        where: { isActive: true, expiryDate: { lte: cutoff } },
        orderBy: { expiryDate: 'asc' },
        take: 15,
        select: { name: true, vendor: true, licenseType: true, totalSeats: true, expiryDate: true },
      });
    }
    return result;
  }

  if (call.name === 'get_overdue_pm') {
    const now = new Date();
    const runs = await prisma.pMRun.findMany({
      where: { status: { not: 'COMPLETED' }, plan: { endDate: { lt: now } } },
      include: {
        asset: { select: { assetCode: true, assetName: true, departmentId: true, ownerName: true } },
        plan: { select: { endDate: true } },
      },
      orderBy: { plan: { endDate: 'asc' } },
      take: 15,
    });
    return runs.map((r) => ({
      assetCode: r.asset?.assetCode,
      assetName: r.asset?.assetName,
      department: r.asset?.departmentId,
      owner: r.asset?.ownerName,
      pmDueDate: r.plan?.endDate,
    }));
  }

  if (call.name === 'get_overdue_borrows') {
    const now = new Date();
    const items = await prisma.borrowRequestItem.findMany({
      where: { itemStatus: { in: ['CheckedOut', 'PartiallyReturned'] }, dueDate: { lt: now } },
      include: {
        asset: { select: { assetCode: true, assetName: true } },
        request: { include: { requester: { select: { displayName: true, department: true } } } },
      },
      orderBy: { dueDate: 'asc' },
      take: 15,
    });
    return items.map((i) => ({
      assetCode: i.asset?.assetCode,
      assetName: i.asset?.assetName,
      borrowerName: i.request.requester.displayName,
      borrowerDepartment: i.request.requester.department,
      dueDate: i.dueDate,
      daysOverdue: i.dueDate ? Math.floor((now.getTime() - i.dueDate.getTime()) / 86400000) : 0,
    }));
  }

  return null;
}

// Streamed as Server-Sent Events so the chat UI can render tokens as they
// arrive instead of one long blank wait — function-calling round trips to
// Gemini run ~20-40s each here, which reads as "stuck" without this.
router.post('/chat', authenticate, async (req: Request, res: Response): Promise<void> => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'Invalid messages format' });
    return;
  }

  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data: Record<string, unknown>) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    // Convert our standard message format to Gemini's format
    const history = messages.slice(0, -1).map((m: any) => ({
      role: m.role === 'ai' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    // Gemini API requires the first message in history to be from 'user'
    if (history.length > 0 && history[0].role === 'model') {
      history.shift();
    }

    const lastMessage = messages[messages.length - 1].text;

    const chat = ai.chats.create({
      model: GEMINI_MODEL,
      history,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: [assetSearchTool, getAssetStatsTool, getExpiringItemsTool, getOverduePMTool, getOverdueBorrowsTool] }],
      },
    });

    let gotText = false;
    const calls: { name?: string; args?: unknown }[] = [];

    for await (const chunk of await chat.sendMessageStream({ message: lastMessage })) {
      if (chunk.text) { gotText = true; send({ type: 'chunk', text: chunk.text }); }
      if (chunk.functionCalls?.length) calls.push(...chunk.functionCalls);
    }

    // If Gemini decided to call one or more functions, run all of them and
    // stream the follow-up answer. A single question like "compare overdue
    // PM vs overdue borrows" can trigger several calls in one turn — only
    // acting on the first silently dropped the rest.
    if (calls.length > 0) {
      const responseParts = [];
      for (const call of calls) {
        send({ type: 'tool', name: call.name });
        const toolResult = await runTool(call);
        responseParts.push({ functionResponse: { name: call.name!, response: { result: toolResult } } });
      }

      for await (const chunk of await chat.sendMessageStream({ message: responseParts })) {
        if (chunk.text) { gotText = true; send({ type: 'chunk', text: chunk.text }); }
      }
    }

    // The model can occasionally end its turn on something other than text
    // (e.g. a zero-result search) — fall back rather than send a blank bubble.
    if (!gotText) {
      send({ type: 'chunk', text: 'ขออภัยครับ ไม่พบข้อมูลที่ตรงกับคำถามนี้ ลองระบุรหัสทรัพย์สิน, ชื่อผู้ถือครอง หรือรายละเอียดอื่นให้ชัดเจนขึ้นได้ไหมครับ' });
    }

    send({ type: 'done' });
    res.end();
  } catch (error) {
    console.error('AI Chat Error:', error);
    send({ type: 'error', message: 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ AI' });
    res.end();
  }
});

export default router;
