import { useState, useRef, useEffect } from "react";
import { sendAiChat } from "../services/authService";

const QUICK_QUESTIONS = [
  "Where is my order?",
  "What materials are in my product?",
  "Is my product certified?",
  "How can I track my delivery?",
  "What is a Digital Product Passport?",
  "How do I get a product certificate?",
];

function UserBubble({ text }) {
  return (
    <div className="flex justify-end mb-4">
      <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl rounded-tr-sm bg-brand-primary text-white text-sm leading-relaxed shadow">
        {text}
      </div>
    </div>
  );
}

function AiBubble({ text, loading }) {
  return (
    <div className="flex justify-start mb-4 gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center shadow">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.344.6A3 3 0 0115.858 20H8.142a3 3 0 01-2.684-1.659l-.344-.6a5 5 0 010-6.082z" />
        </svg>
      </div>
      <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl rounded-tl-sm bg-white/10 backdrop-blur border border-white/10 text-sm leading-relaxed shadow">
        {loading ? (
          <span className="flex items-center gap-2 text-white/50">
            <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
        ) : (
          <span className="text-white/90 whitespace-pre-wrap">{text}</span>
        )}
      </div>
    </div>
  );
}

export default function ClientSupportPage() {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hello! I'm your Smart DPP assistant. I can help you track orders, find product information, check certifications, and more. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim() || sending) return;
    const userMsg = text.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setSending(true);
    setMessages((prev) => [...prev, { role: "ai", text: "", loading: true }]);

    try {
      const reply = await sendAiChat(userMsg, null, null);
      setMessages((prev) => {
        const next = [...prev];
        const loadingIdx = next.findLastIndex((m) => m.loading);
        if (loadingIdx !== -1) {
          next[loadingIdx] = { role: "ai", text: reply || "I'm not sure about that. Could you rephrase your question?" };
        }
        return next;
      });
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        const loadingIdx = next.findLastIndex((m) => m.loading);
        if (loadingIdx !== -1) {
          next[loadingIdx] = { role: "ai", text: "Sorry, I couldn't process your request. Please try again." };
        }
        return next;
      });
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const showQuickQuestions = messages.length <= 1;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="glass-card rounded-none border-x-0 border-t-0 px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center shadow-lg">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.344.6A3 3 0 0115.858 20H8.142a3 3 0 01-2.684-1.659l-.344-.6a5 5 0 010-6.082z" />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-semibold text-white">Smart DPP Assistant</h1>
          <p className="text-xs text-white/50">AI-powered support · Always available</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-white/50">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <div className="max-w-2xl mx-auto">
          {messages.map((msg, i) =>
            msg.role === "user" ? (
              <UserBubble key={i} text={msg.text} />
            ) : (
              <AiBubble key={i} text={msg.text} loading={msg.loading} />
            )
          )}

          {showQuickQuestions && (
            <div className="mt-2 mb-6">
              <p className="text-xs text-white/40 mb-3 ml-11">Quick questions</p>
              <div className="flex flex-wrap gap-2 ml-11">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    disabled={sending}
                    className="px-3 py-1.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-xs text-white/70 hover:text-white transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 md:px-8 py-4 border-t border-white/10 bg-black/20 backdrop-blur">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto flex gap-3 items-end">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your orders or products..."
            disabled={sending}
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-primary/60 focus:ring-1 focus:ring-brand-primary/40 transition-all resize-none disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="flex-shrink-0 w-11 h-11 rounded-xl bg-brand-primary hover:bg-brand-primary/80 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg"
          >
            <svg className="w-4 h-4 text-white rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
        <p className="text-center text-xs text-white/20 mt-2 max-w-2xl mx-auto">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
