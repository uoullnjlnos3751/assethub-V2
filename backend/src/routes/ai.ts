import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI, FunctionDeclaration, Schema, SchemaType } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. AI Chatbot will not work.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

// Define Tools (Function Calling)
const assetSearchTool: FunctionDeclaration = {
  name: "search_assets",
  description: "ค้นหาข้อมูลคอมพิวเตอร์และทรัพย์สินจากฐานข้อมูล สามารถค้นหาด้วยรหัสทรัพย์สิน, ซีเรียลนัมเบอร์, ชื่อผู้ถือครอง, แผนก, ชนิด, หรือสถานะ",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      ownerName: { type: SchemaType.STRING, description: "ชื่อหรือนามสกุลของผู้ถือครอง" },
      department: { type: SchemaType.STRING, description: "ชื่อแผนกหรือฝ่าย" },
      status: { type: SchemaType.STRING, description: "สถานะของทรัพย์สิน เช่น InStock, InUse, Borrowed, Broken, Transfer" },
      assetType: { type: SchemaType.STRING, description: "ประเภท เช่น PC, Notebook, Monitor, Printer, UPS" },
      serialNumber: { type: SchemaType.STRING, description: "หมายเลข Serial Number" },
      assetCode: { type: SchemaType.STRING, description: "รหัสทรัพย์สิน (Asset Code)" },
    },
  },
};

const getAssetStatsTool: FunctionDeclaration = {
  name: "get_asset_stats",
  description: "สรุปจำนวนทรัพย์สินทั้งหมด แบ่งตามประเภท (assetType) หรือสถานะ (status)",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      groupBy: { 
        type: SchemaType.STRING, 
        description: "จัดกลุ่มตามอะไร: 'status' หรือ 'assetType'" 
      },
    },
    required: ["groupBy"],
  },
};

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: "คุณคือ 'AssetHub Assistant' ผู้ช่วยอัจฉริยะสำหรับตอบคำถามเรื่องข้อมูลทรัพย์สินคอมพิวเตอร์ในระบบ ITSM ขององค์กร. หน้าที่ของคุณคือตอบคำถามด้วยความสุภาพ, แม่นยำ, และสั้นกระชับ. ถ้าผู้ใช้ถามข้อมูลที่ต้องค้นหาจากฐานข้อมูล ให้ใช้ฟังก์ชันที่กำหนด (search_assets หรือ get_asset_stats) เพื่อดึงข้อมูลจริงมาตอบเสมอ. ตอบเป็นภาษาไทย.",
  tools: [{ functionDeclarations: [assetSearchTool, getAssetStatsTool] }],
});

router.post('/chat', async (req: Request, res: Response): Promise<void> => {
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

    const chat = model.startChat({ history });

    let result = await chat.sendMessage(lastMessage);
    const call = result.response.functionCalls()?.[0];

    // If Gemini decides to call a function
    if (call) {
      if (call.name === 'search_assets') {
        const args = call.args as any;
        const filters: any = {};
        
        if (args.ownerName) filters.ownerName = { contains: args.ownerName, mode: 'insensitive' };
        if (args.department) filters.department = { contains: args.department, mode: 'insensitive' };
        if (args.assetType) filters.type = { contains: args.assetType, mode: 'insensitive' };
        if (args.serialNumber) filters.serialNo = { contains: args.serialNumber, mode: 'insensitive' };
        if (args.assetCode) filters.assetCode = { contains: args.assetCode, mode: 'insensitive' };
        if (args.status) filters.status = { contains: args.status, mode: 'insensitive' };

        const assets = await prisma.asset.findMany({
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

        // Send function result back to Gemini
        result = await chat.sendMessage([{
          functionResponse: {
            name: 'search_assets',
            response: { result: assets }
          }
        }]);

      } else if (call.name === 'get_asset_stats') {
        const args = call.args as any;
        let stats: any;

        if (args.groupBy === 'status') {
          stats = await prisma.asset.groupBy({
            by: ['status'],
            _count: { id: true }
          });
        } else {
          stats = await prisma.asset.groupBy({
            by: ['type'],
            _count: { id: true }
          });
        }

        result = await chat.sendMessage([{
          functionResponse: {
            name: 'get_asset_stats',
            response: { result: stats }
          }
        }]);
      }
    }

    const text = result.response.text();
    res.json({ text });

  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: 'Failed to process AI chat' });
  }
});

export default router;
