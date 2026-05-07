import { useState, useCallback, useRef } from 'react';
import { dashboardApi } from '../../api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ThinkingStep {
  label: string;
  status: 'active' | 'done';
}

export interface CardData {
  cardType: 'chain-verify' | 'comparison' | 'draft' | 'event-list' | 'risk-summary';
  [key: string]: unknown;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  steps?: ThinkingStep[];
  card?: CardData;
  followUps?: string[];
  sources?: string[];
  streaming?: boolean;
}

export interface ChatSession {
  _id: string;
  title: string;
  updatedAt: string;
  messages: Array<{ role: string; content: string }>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(() => {
    return localStorage.getItem('dg_chat_session') ?? undefined;
  });
  const [streaming, setStreaming] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const persistSession = (id: string) => {
    localStorage.setItem('dg_chat_session', id);
    setSessionId(id);
  };

  const loadSession = useCallback(async (id: string) => {
    try {
      const session: ChatSession = await dashboardApi.getChatSession(id);
      if (!session?.messages?.length) return;
      const restored: ChatMessage[] = session.messages.map((m, i) => ({
        id: `restored-${i}`,
        role: m.role === 'user' ? 'user' : 'ai',
        text: m.content,
      }));
      setMessages(restored);
      persistSession(id);
      setHistoryOpen(false);
    } catch {
      // session may no longer exist — start fresh
      newChat();
    }
  }, []);

  const newChat = useCallback(() => {
    setMessages([]);
    setSessionId(undefined);
    localStorage.removeItem('dg_chat_session');
    setHistoryOpen(false);
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await dashboardApi.getChatHistory(1, 30);
      setSessions(data.sessions ?? []);
    } catch {
      setSessions([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const openHistory = useCallback(() => {
    setHistoryOpen(true);
    fetchHistory();
  }, [fetchHistory]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;

    // Cancel any in-flight stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: text.trim(),
    };
    const aiMsgId = `a-${Date.now()}`;
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'ai',
      text: '',
      steps: [],
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setStreaming(true);

    const stepsMap = new Map<string, ThinkingStep>();

    const updateAiMsg = (updater: (msg: ChatMessage) => ChatMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? updater(m) : m)),
      );
    };

    try {
      for await (const evt of dashboardApi.streamChat(
        text.trim(),
        sessionId,
        controller.signal,
      )) {
        const d = evt.data as Record<string, unknown>;

        if (evt.type === 'step') {
          const label = d.label as string;
          const status = d.status as 'active' | 'done';
          stepsMap.set(label, { label, status });
          updateAiMsg((m) => ({
            ...m,
            steps: Array.from(stepsMap.values()),
          }));
        } else if (evt.type === 'token') {
          updateAiMsg((m) => ({
            ...m,
            text: m.text + (d.text as string),
          }));
        } else if (evt.type === 'card') {
          updateAiMsg((m) => ({
            ...m,
            card: d as unknown as CardData,
            followUps: d.followUps as string[] | undefined,
            sources: d.sources as string[] | undefined,
          }));
        } else if (evt.type === 'followups') {
          updateAiMsg((m) => ({
            ...m,
            followUps: d.followUps as string[],
          }));
        } else if (evt.type === 'done') {
          const sid = d.sessionId as string;
          persistSession(sid);
          updateAiMsg((m) => ({ ...m, streaming: false }));
          setStreaming(false);
        } else if (evt.type === 'error') {
          updateAiMsg((m) => ({
            ...m,
            text: (d.message as string) || 'Something went wrong. Please try again.',
            streaming: false,
          }));
          setStreaming(false);
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      updateAiMsg((m) => ({
        ...m,
        text: 'Connection interrupted. Please try again.',
        streaming: false,
      }));
      setStreaming(false);
    }
  }, [streaming, sessionId]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
    setMessages((prev) =>
      prev.map((m) =>
        m.streaming ? { ...m, streaming: false } : m,
      ),
    );
  }, []);

  const submitFollowUp = useCallback(
    (text: string) => send(text),
    [send],
  );

  return {
    messages,
    sessionId,
    streaming,
    historyOpen,
    sessions,
    loadingHistory,
    send,
    stopStreaming,
    submitFollowUp,
    newChat,
    loadSession,
    openHistory,
    closeHistory: () => setHistoryOpen(false),
  };
}
