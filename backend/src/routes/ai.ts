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

const SYSTEM_INSTRUCTION = "คุณคือ 'AssetHub Assistant' ผู้ช่วยอัจฉริยะสำหรับตอบคำถามเรื่องข้อมูลทรัพย์สินคอมพิวเตอร์ในระบบ ITSM ขององค์กร. หน้าที่ของคุณคือตอบคำถามด้วยความสุภาพ, แม่นยำ, และสั้นกระชับ. ถ้าผู้ใช้ถามข้อมูลที่ต้องค้นหาจากฐานข้อมูล ให้ใช้ฟังก์ชันที่กำหนด (search_assets หรือ get_asset_stats) เพื่อดึงข้อมูลจริงมาตอบเสมอ. ตอบเป็นภาษาไทย.";

router.post('/chat', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Invalid messages format' });
      return;
    }

    if (!apiKey) {
      res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
      return;
    }

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
      model: 'gemini-flash-latest',
      history,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: [assetSearchTool, getAssetStatsTool] }],
      },
    });

    let result = await chat.sendMessage({ message: lastMessage });
    const call = result.functionCalls?.[0];

    // If Gemini decides to call a function
    if (call) {
      let toolResult: any;

      if (call.name === 'search_assets') {
        const args = call.args as any;
        const filters: any = {};

        if (args.ownerName) filters.ownerName = { contains: args.ownerName, mode: 'insensitive' };
        if (args.department) filters.department = { contains: args.department, mode: 'insensitive' };
        if (args.assetType) filters.type = { contains: args.assetType, mode: 'insensitive' };
        if (args.serialNumber) filters.serialNo = { contains: args.serialNumber, mode: 'insensitive' };
        if (args.assetCode) filters.assetCode = { contains: args.assetCode, mode: 'insensitive' };
        if (args.status) filters.status = { contains: args.status, mode: 'insensitive' };

        toolResult = await prisma.asset.findMany({
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
      } else if (call.name === 'get_asset_stats') {
        const args = call.args as any;

        if (args.groupBy === 'status') {
          toolResult = await prisma.asset.groupBy({
            by: ['status'],
            _count: { id: true }
          });
        } else {
          toolResult = await prisma.asset.groupBy({
            by: ['type'],
            _count: { id: true }
          });
        }
      }

      // Send function result back to Gemini (SDK wraps this as a 'user' content)
      result = await chat.sendMessage({
        message: [{
          functionResponse: {
            name: call.name!,
            response: { result: toolResult }
          }
        }]
      });
    }

    // The model can occasionally end its turn on another function call instead of
    // text (e.g. a search with zero matches) — fall back rather than send a blank bubble.
    res.json({ text: result.text || 'ขออภัยครับ ไม่พบข้อมูลที่ตรงกับคำถามนี้ ลองระบุรหัสทรัพย์สิน, ชื่อผู้ถือครอง หรือรายละเอียดอื่นให้ชัดเจนขึ้นได้ไหมครับ' });

  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: 'Failed to process AI chat' });
  }
});

export default router;
