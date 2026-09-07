import React, { createContext, useCallback, useContext, useState } from 'react';

/**
 * Lifts the assistant's open/closed state (and a way to hand it a question to
 * ask on your behalf) out of Chatbot.tsx so other chrome — the AppBar search
 * box's "ถาม AI" row, eventually anything else — can drive the same floating
 * widget instead of each needing its own chat UI.
 */

interface QueuedQuery {
  text: string;
  /** Distinguishes two consecutive identical questions so the effect that
   * consumes this always fires, even when `text` itself doesn't change. */
  nonce: number;
}

interface ChatbotContextValue {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  queuedQuery: QueuedQuery | null;
  clearQueuedQuery: () => void;
  /** Opens the assistant and sends `text` as the next outgoing message. */
  askAI: (text: string) => void;
}

const ChatbotContext = createContext<ChatbotContextValue | null>(null);

export function ChatbotProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [queuedQuery, setQueuedQuery] = useState<QueuedQuery | null>(null);

  const askAI = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) { setOpen(true); return; }
    setOpen(true);
    setQueuedQuery({ text: trimmed, nonce: Date.now() });
  }, []);

  const clearQueuedQuery = useCallback(() => setQueuedQuery(null), []);

  return (
    <ChatbotContext.Provider value={{ isOpen, setOpen, queuedQuery, clearQueuedQuery, askAI }}>
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbotContext(): ChatbotContextValue {
  const ctx = useContext(ChatbotContext);
  if (!ctx) throw new Error('useChatbotContext must be used within a ChatbotProvider');
  return ctx;
}
