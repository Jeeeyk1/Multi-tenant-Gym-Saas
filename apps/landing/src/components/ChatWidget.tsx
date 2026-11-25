'use client';

import { useEffect, useRef, useState } from 'react';
import { BRAND_NAME, CONTACT_EMAIL } from '@/lib/brand';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const HINT_MIN_WIDTH_QUERY = '(min-width: 768px)';

const SUGGESTIONS = [
  'What features are included?',
  'How much does it cost?',
  'How do I get started?',
  'Does it have a mobile app?',
];

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // The pop-up hint covers content on phones, so it only appears on wider screens.
    if (hintDismissed || !window.matchMedia(HINT_MIN_WIDTH_QUERY).matches) return;
    const t = setTimeout(() => setShowHint(true), 4000);
    return () => clearTimeout(t);
  }, [hintDismissed]);

  useEffect(() => {
    if (isOpen) {
      setShowHint(false);
      setHintDismissed(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:9001';
      const res = await fetch(`${apiUrl}/api/v1/public/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          history: messages.slice(-6),
        }),
      });
      const data: { reply: string } = await res.json();
      setMessages([...next, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: `Sorry, something went wrong. Email us at ${CONTACT_EMAIL}.` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-5 z-50 w-[360px] max-w-[calc(100vw-2.5rem)] flex flex-col rounded-2xl border border-line bg-white shadow-2xl shadow-navy/20 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-navy text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-volt text-navy flex items-center justify-center text-sm font-bold">
                M
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">Maya</p>
                <p className="text-xs opacity-80 mt-0.5">{BRAND_NAME} Assistant · Online</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="w-7 h-7 flex items-center justify-center rounded-lg opacity-80 hover:opacity-100 hover:bg-white/10 transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px] max-h-[360px]">
            {/* Welcome */}
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center text-xs font-bold text-volt flex-shrink-0 mt-0.5">
                    M
                  </div>
                  <div className="bg-cloud border border-line rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-ink max-w-[80%]">
                    Hi! I&apos;m Maya. I can answer any questions about {BRAND_NAME} — features, pricing, or how to get started.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pl-9">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-xs px-3 py-1.5 rounded-full border border-code/30 text-code bg-tint/40 hover:bg-tint transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center text-xs font-bold text-volt flex-shrink-0 mt-0.5">
                    M
                  </div>
                )}
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-sm max-w-[80%] whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-code text-white rounded-tr-sm'
                      : 'bg-cloud border border-line text-ink rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center text-xs font-bold text-volt flex-shrink-0">
                  M
                </div>
                <div className="bg-cloud border border-line rounded-2xl rounded-tl-sm px-3.5 py-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-line bg-cloud">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                disabled={loading}
                className="flex-1 bg-white border border-line rounded-xl px-3.5 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-signal disabled:opacity-60"
              />
              <button
                type="submit"
                aria-label="Send message"
                disabled={!input.trim() || loading}
                className="w-9 h-9 flex items-center justify-center bg-code text-white rounded-xl disabled:opacity-40 hover:bg-code-hover transition flex-shrink-0"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Hint bubble */}
      {showHint && !isOpen && (
        <div
          className="fixed bottom-24 right-[4.5rem] z-50 bg-navy text-white text-xs font-medium px-3 py-2 rounded-xl rounded-br-sm shadow-lg animate-fade-up cursor-pointer whitespace-nowrap"
          onClick={() => { setIsOpen(true); setShowHint(false); }}
        >
          Need help? Ask Maya
          <div className="absolute -bottom-1.5 right-3 w-3 h-3 bg-navy rotate-45" />
        </div>
      )}

      {/* Trigger button */}
      <div className="fixed bottom-5 right-5 z-50">
        <button
          onClick={() => setIsOpen((o) => !o)}
          aria-label={isOpen ? 'Close chat' : 'Open chat'}
          aria-expanded={isOpen}
          className="relative w-14 h-14 rounded-full bg-navy text-volt ring-1 ring-sky/30 shadow-lg shadow-navy/40 hover:bg-navy-raised hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center"
        >
          {/* Pulse ring when hint is showing */}
          {showHint && (
            <span className="absolute inset-0 rounded-full bg-signal animate-ping opacity-30" />
          )}

          {isOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          )}

        </button>
      </div>
    </>
  );
}
