import { Bot, Loader2, MessageSquare, Send, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { aiApi } from '../services/finsight';
import type { ChatResponse } from '../types';
import { errorMessage } from '../hooks/useApi';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  mode?: 'ai' | 'local';
}

const suggestions = [
  'Why did my portfolio change?',
  'Where am I spending the most?',
  'How much am I saving?',
  'Explain my portfolio risk.',
  'What happens if I invest ₹10,000 per month?',
  'Summarize my financial situation.',
];

export default function AICopilot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [lastMode, setLastMode] = useState<'ai' | 'local'>('local');
  const [showSources, setShowSources] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError(null);
    setMessages((m) => [...m, { id: Date.now(), role: 'user', content: trimmed }]);
    setInput('');
    setSending(true);
    try {
      const res: ChatResponse = await aiApi.chat(trimmed, conversationId);
      setConversationId(res.conversation_id);
      setLastMode(res.mode);
      setShowSources(res.sources);
      setMessages((m) => [...m, { id: Date.now() + 1, role: 'assistant', content: res.reply, mode: res.mode }]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const renderMarkdown = (text: string) => {
    // Lightweight rendering: headings, bullets, bold. Keeps the response readable.
    return text.split('\n').map((line, i) => {
      if (line.startsWith('### ')) {
        return (
          <h4 key={i} className="mb-1.5 mt-3 text-sm font-bold text-gray-100">
            {line.slice(4)}
          </h4>
        );
      }
      if (line.startsWith('> ')) {
        return (
          <p key={i} className="mt-1 border-l-2 border-accent/40 pl-3 text-xs italic text-gray-500">
            {line.slice(2)}
          </p>
        );
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <p key={i} className="pl-3 text-sm leading-relaxed text-gray-300">
            • {line.slice(2)}
          </p>
        );
      }
      if (line.trim() === '') return <div key={i} className="h-1.5" />;
      const bolded = line.split('**').map((part, j) => (j % 2 === 1 ? <strong key={j} className="font-semibold text-gray-100">{part}</strong> : part));
      return (
        <p key={i} className="text-sm leading-relaxed text-gray-300">
          {bolded}
        </p>
      );
    });
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-50">
            <Sparkles className="h-5 w-5 text-accent-soft" /> AI Copilot
          </h1>
          <p className="text-sm text-gray-500">Answers use your real account data via internal tools.</p>
        </div>
        <Badge tone={lastMode === 'ai' ? 'accent' : 'warn'}>
          {lastMode === 'ai' ? 'AI connected' : 'Local analysis mode'}
        </Badge>
      </div>

      <Card className="flex h-[60vh] flex-col overflow-hidden p-0">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent-soft">
                <Bot className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-gray-100">Ask anything about your finances</h3>
              <p className="mt-1 max-w-sm text-sm text-gray-500">
                I pull live numbers from your portfolio, expenses and health score before answering — I never invent figures.
              </p>
              <div className="mt-6 flex max-w-lg flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-lg border border-ink-line bg-ink-soft px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-accent/40 hover:text-accent-soft"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl border px-4 py-3 ${
                  m.role === 'user'
                    ? 'border-accent/25 bg-accent/10'
                    : 'border-ink-line bg-ink-soft'
                }`}
              >
                {m.role === 'assistant' && (
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-accent-soft" />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
                      {m.mode === 'ai' ? 'AI copilot' : 'FinSight (local)'}
                    </span>
                  </div>
                )}
                <div>{renderMarkdown(m.content)}</div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-ink-line bg-ink-soft px-4 py-3 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin text-accent-soft" />
                Analyzing your data…
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-sm text-danger">{error}</div>
          )}
        </div>

        {showSources.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-ink-line px-5 py-2">
            <span className="text-[11px] uppercase tracking-wider text-gray-600">Used tools:</span>
            {showSources.map((s) => (
              <Badge key={s} tone="neutral">{s}</Badge>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-ink-line p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your portfolio, spending, savings…"
            className="input flex-1"
            disabled={sending}
          />
          <Button type="submit" disabled={sending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>

      <p className="text-center text-xs leading-relaxed text-gray-600">
        FinSight is an educational tool, not a licensed financial advisor. Assumptions are always stated, and projections are
        simulations, not guarantees. Verify important decisions independently.
      </p>
    </div>
  );
}
