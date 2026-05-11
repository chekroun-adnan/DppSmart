import { useRef, useMemo, useState } from "react";
import { isAuthenticated, sendAiChat, sendPublicAiChat } from "../services/authService";

const PUBLIC_QUICK_REPLIES = [
  "What is SmartDPP?",
  "Who is Atelier IKS?",
  "What does your company provide?",
];

const CLIENT_QUICK_REPLIES = [
  "What materials are in this product?",
  "Is this product certified?",
  "What is a Digital Product Passport?",
  "How do I read a product's sustainability info?",
];

const STAFF_QUICK_REPLIES = [
  "How can I create a new product passport?",
  "Where can I see compliance score?",
  "How do I update my profile settings?",
];

function ChatbotWidget() {
  const loggedIn = isAuthenticated();
  const userRole = (localStorage.getItem("userRole") || "").toUpperCase();
  const isClient = userRole === "CLIENT";

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: isClient
        ? "Hello! I can help you explore products, understand materials, certifications, and Digital Product Passports. What would you like to know?"
        : loggedIn
          ? "Welcome to SmartTex. Ask anything about your DPP workflow."
          : "Welcome. I can answer questions about SmartDPP and Atelier IKS.",
    },
  ]);
  const bottomRef = useRef(null);

  const canSend = input.trim().length > 0 && !loading;
  const suggestedPrompts = useMemo(() => {
    if (!loggedIn) return PUBLIC_QUICK_REPLIES;
    if (isClient) return CLIENT_QUICK_REPLIES;
    return STAFF_QUICK_REPLIES;
  }, [loggedIn, isClient]);

  const sendMessage = async (rawText) => {
    const text = rawText.trim();
    if (!text || loading) return;

    const userMsg = { id: `${Date.now()}-user`, role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const contextualMessage = isClient
      ? `[CLIENT_CONTEXT] ${text}`
      : text;

    try {
      const reply = loggedIn ? await sendAiChat(contextualMessage) : await sendPublicAiChat(text);
      const assistantText = typeof reply === "string" && reply.trim()
        ? reply
        : "I could not generate a response.";
      setMessages((prev) => [...prev, { id: `${Date.now()}-assistant`, role: "assistant", text: assistantText }]);
    } catch {
      setMessages((prev) => [...prev, { id: `${Date.now()}-error`, role: "assistant", text: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[70]">
      {isOpen ? (
        <section className="mb-3 w-[20rem] rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-800 shadow-2xl sm:w-[23rem]">
          <header className="flex items-center justify-between rounded-t-2xl bg-slate-900 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">AI Assistant</p>
              <p className="text-xs text-slate-400">Powered by SmartTex AI</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full bg-white/10 px-2 py-1 text-xs font-semibold hover:bg-white/20"
              aria-label="Close chatbot"
            >
              ✕
            </button>
          </header>

          <div className="max-h-72 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "ml-auto bg-slate-900 dark:bg-slate-700 text-white"
                    : "bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200"
                }`}
              >
                {message.text}
              </div>
            ))}
            {loading && (
              <div className="max-w-[90%] rounded-2xl px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-200 dark:border-white/[0.06] px-3 py-3">
            <div className="mb-2 flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  disabled={loading}
                  className="rounded-full bg-slate-100 dark:bg-slate-700/50 px-3 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canSend) sendMessage(input);
                }}
                placeholder="Ask something..."
                className="h-10 flex-1 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-700/50 dark:text-slate-100 px-3 text-sm outline-none focus:border-brand-500 dark:focus:bg-slate-700 focus:ring-2 focus:ring-brand-500/10"
              />
              <button
                type="button"
                onClick={() => sendMessage(input)}
                disabled={!canSend}
                className="h-10 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-brand-700 transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-white shadow-soft-xl hover:bg-brand-700 transition-colors ring-1 ring-brand-500/20"
        aria-label="Open AI assistant"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
          <rect x="5" y="7" width="14" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 4V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="9.5" cy="12" r="1.2" fill="currentColor" />
          <circle cx="14.5" cy="12" r="1.2" fill="currentColor" />
          <path d="M9 15.5H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export default ChatbotWidget;
