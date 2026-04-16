"use client";

import { useState, useRef, useEffect } from "react";
import { apiFetch } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatOut {
  reply: string;
}

const STORAGE_KEY = "pocketcoach_chat";

export function ChatSection() {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as Message[]) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function handleSend() {
    const text = input.trim();
    if (!text || thinking) return;

    const userMessage: Message = { role: "user", content: text };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");
    setThinking(true);

    try {
      const res = await apiFetch("/briefing/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: messages }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? "Something went wrong. Please try again.");
      }
      const data = (await res.json()) as ChatOut;
      setMessages([...history, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages([
        ...history,
        { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong. Please try again." },
      ]);
    } finally {
      setThinking(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Chat</h2>
        <button
          onClick={() => setMessages([])}
          disabled={messages.length === 0}
          className="text-xs text-muted-foreground border border-border rounded-lg px-2 py-1 hover:bg-accent disabled:opacity-50"
        >
          Clear
        </button>
      </div>

      <div className="flex flex-col gap-2 mb-3 min-h-[80px] max-h-[320px] overflow-y-auto">
        {messages.length === 0 && !thinking && (
          <p className="text-sm text-muted-foreground self-center mt-4">
            Ask your coach anything about your training...
          </p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex justify-start">
            <div className="bg-muted text-muted-foreground rounded-xl px-3 py-2 text-sm">
              Thinking...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={thinking}
          placeholder="Message your coach..."
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={thinking || !input.trim()}
          className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
