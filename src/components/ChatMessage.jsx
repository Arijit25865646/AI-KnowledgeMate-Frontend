import { Bot, User, FileText } from "lucide-react";

function ChatMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex gap-3 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600/15 text-blue-400">
          <Bot size={20} />
        </div>
      )}

      <div className="max-w-[85%] space-y-3">
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-7 ${
            isUser
              ? "rounded-br-md bg-blue-600 text-white"
              : "rounded-bl-md border border-slate-800 bg-slate-900 text-slate-200"
          }`}
        >
          <p className="whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>

        {!isUser && message.sources?.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sources
            </p>

            <div className="flex flex-wrap gap-2">
              {message.sources.map((source, index) => (
                <div
                  key={`${source.document_name}-${source.page_number}-${index}`}
                  className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-300"
                >
                  <FileText size={15} className="text-blue-400" />

                  <span className="max-w-40 truncate">
                    {source.document_name}
                  </span>

                  <span className="rounded bg-slate-800 px-2 py-1 text-slate-400">
                    Page {source.page_number}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-700 text-slate-200">
          <User size={20} />
        </div>
      )}
    </div>
  );
}

export default ChatMessage;
