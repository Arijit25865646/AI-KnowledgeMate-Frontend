
import { LoaderCircle, Sparkles } from "lucide-react";
import ChatMessage from "./ChatMessage";

function ChatMessages({ messages, loading, messagesEndRef }) {
  if (messages.length === 0 && !loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
          <Sparkles size={28} />
        </div>

        <h2 className="text-2xl font-semibold">
          Ask your document anything.
        </h2>

        <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
          Ask a question about your uploaded PDF. KnowledgeMate will
          retrieve relevant content and provide an answer with source pages.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 overflow-y-auto px-5 py-8 sm:px-8">
      {messages.map((message, index) => (
        <ChatMessage
          key={message.id || `${message.created_at || "message"}-${index}`}
          message={message}
        />
      ))}

      {loading && (
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/15 text-blue-400">
            <Sparkles size={20} />
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-400">
            <LoaderCircle size={16} className="animate-spin" />
            Searching your document and generating an answer...
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

export default ChatMessages;
