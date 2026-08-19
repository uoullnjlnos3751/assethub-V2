import React, { useState, useRef, useEffect } from 'react';
import { baseURL } from '../services/api';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

export const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'สวัสดีครับ ผมคือ AssetHub Assistant 🤖\nคุณสามารถถามข้อมูลเกี่ยวกับทรัพย์สินได้เลยครับ เช่น "มีโน้ตบุ๊กกี่เครื่อง", "ใครถือครอง M001"' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, toolStatus]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', text: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setAwaitingResponse(true);
    setToolStatus(null);

    // A streamed placeholder bubble that fills in as tokens arrive, instead of
    // one long wait — function-calling round trips to Gemini can take 20-40s.
    let started = false;

    try {
      const res = await fetch(`${baseURL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const evt of events) {
          const line = evt.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;
          const data = JSON.parse(line.slice(6));

          if (data.type === 'tool') {
            setToolStatus('🔍 กำลังค้นหาข้อมูลทรัพย์สิน...');
          } else if (data.type === 'chunk') {
            setToolStatus(null);
            if (!started) {
              started = true;
              setAwaitingResponse(false);
              setMessages((prev) => [...prev, { role: 'ai', text: data.text }]);
            } else {
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: 'ai', text: next[next.length - 1].text + data.text };
                return next;
              });
            }
          } else if (data.type === 'error') {
            setToolStatus(null);
            setAwaitingResponse(false);
            setMessages((prev) => [...prev, { role: 'ai', text: data.message || 'ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อระบบ AI' }]);
          }
        }
      }
    } catch (error) {
      console.error(error);
      setToolStatus(null);
      setAwaitingResponse(false);
      if (!started) setMessages((prev) => [...prev, { role: 'ai', text: 'ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อระบบ AI' }]);
    } finally {
      setIsLoading(false);
      setAwaitingResponse(false);
      setToolStatus(null);
    }
  };

  return (
    // `app-noprint` lets a page's print stylesheet drop the floating bubble;
    // it is chrome, never part of a printed report.
    <div className="app-noprint" style={{ position: 'fixed', bottom: 30, right: 30, zIndex: 9999 }}>
      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: 70,
          right: 0,
          width: 360,
          height: 500,
          backgroundColor: '#fff',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            padding: '16px',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🤖</span>
              <span style={{ fontWeight: 600, fontSize: 15 }}>AssetHub Assistant</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: '#f8fafc',
          }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  backgroundColor: msg.role === 'user' ? '#2563eb' : '#fff',
                  color: msg.role === 'user' ? '#fff' : '#1e293b',
                  fontSize: 14,
                  lineHeight: 1.5,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0',
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {awaitingResponse && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '16px 16px 16px 4px',
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  fontSize: 14,
                  color: '#64748b',
                }}>
                  {toolStatus || 'กำลังคิด... 💬'}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{
            padding: '12px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#fff',
            display: 'flex',
            gap: 8,
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="พิมพ์คำถามที่นี่..."
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 24,
                border: '1px solid #cbd5e1',
                outline: 'none',
                fontSize: 14,
              }}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              style={{
                background: input.trim() && !isLoading ? '#2563eb' : '#cbd5e1',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 40,
                height: 40,
                cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          backgroundColor: '#2563eb',
          color: '#fff',
          border: 'none',
          boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
          cursor: 'pointer',
          fontSize: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s',
          transform: isOpen ? 'scale(0.9)' : 'scale(1)',
        }}
      >
        {isOpen ? '✕' : '💬'}
      </button>
    </div>
  );
};
