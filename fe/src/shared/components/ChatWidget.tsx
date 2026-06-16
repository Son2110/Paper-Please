import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";

interface ChatMessage {
  id: number;
  sender: "them" | "me";
  name: string;
  text: string;
  time: string;
}

export const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        sender: "me",
        name: "Bạn",
        text: trimmed,
        time: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleToggle = () => {
    setOpen((prev) => !prev);
    if (!open) setUnread(0);
  };

  return (
    <>
      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-20 right-6 z-[9999] flex flex-col rounded-xl overflow-hidden"
          style={{
            width: 320,
            height: 450,
            boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-white border-b border-neutral-200">
            <span className="text-foreground font-semibold text-sm">
              Tin nhắn
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-neutral-400 hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-neutral-50">
            {messages.map((msg) =>
              msg.sender === "them" ? (
                <div
                  key={msg.id}
                  className="flex items-start gap-2 max-w-[85%]"
                >
                  <div className="w-7 h-7 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {msg.name.charAt(msg.name.length - 1)}
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 mb-0.5 ml-1">
                      {msg.name}
                    </p>
                    <div className="bg-white rounded-xl rounded-tl-sm px-3 py-2 text-sm text-gray-800 shadow-sm">
                      {msg.text}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5 ml-1">
                      {msg.time}
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  key={msg.id}
                  className="flex flex-col items-end ml-auto max-w-[85%]"
                >
                  <div
                    className="rounded-xl rounded-tr-sm px-3 py-2 text-sm text-white shadow-sm"
                    style={{ backgroundColor: "#1a1a1a" }}
                  >
                    {msg.text}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5 mr-1">
                    {msg.time}
                  </p>
                </div>
              ),
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-white border-t border-gray-200 shrink-0">
            <input
              type="text"
              placeholder="Nhập tin nhắn..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 text-sm bg-gray-100 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-neutral-400 placeholder:text-gray-400"
            />
            <button
              onClick={handleSend}
              className="p-2 rounded-full hover:bg-neutral-100 transition-colors"
              style={{ color: "#0a0a0a" }}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        onClick={handleToggle}
        className="fixed bottom-6 right-6 z-[9999] w-13 h-13 rounded-full flex items-center justify-center shadow-md border border-neutral-200 bg-white hover:shadow-lg hover:scale-105 transition-all"
      >
        <MessageCircle className="w-5 h-5 text-foreground" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-foreground text-white text-[10px] font-bold px-1 ring-2 ring-white">
            {unread}
          </span>
        )}
      </button>
    </>
  );
};
