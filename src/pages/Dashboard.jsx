
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  FileText,
  Plus,
  Search,
  Settings,
  PanelLeftClose,
  Send,
  Trash2,
  MessageSquare,
} from "lucide-react";

import FileUpload from "../components/FileUpload";
import ChatMessages from "../components/ChatMessages";
import api from "../services/api";
import { useAuth } from "../context/useAuth";

function Dashboard() {
  const { user, logout } = useAuth();

  // Documents
  const [documents, setDocuments] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);

  // Conversations
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [deletingConversation, setDeletingConversation] = useState(null);

  // Chat
  const [question, setQuestion] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);

  // Errors
  const [chatError, setChatError] = useState("");
  const [documentError, setDocumentError] = useState("");

  // Document deletion
  const [deletingDocument, setDeletingDocument] = useState(null);

  const messagesEndRef = useRef(null);
  const conversationRequestRef = useRef(0);

  // -----------------------------------------
  // 1. Load documents
  // -----------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadDocuments() {
      try {
        const response = await api.get("/api/documents");

        const savedDocuments = (response.data.documents || []).map(
          (document) => ({
            id: document.document_name,
            name: document.document_name,
            pages: document.pages,
            chunks: document.chunks_indexed,
          })
        );

        if (cancelled) return;

        setDocuments(savedDocuments);

        setActiveDocument((currentDocument) => {
          const stillExists = savedDocuments.some(
            (document) => document.id === currentDocument
          );

          return stillExists
            ? currentDocument
            : savedDocuments[0]?.id ?? null;
        });
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load documents:", error);

          setDocumentError(
            error.response?.data?.message ||
              "Unable to load your documents. Please try again."
          );
        }
      }
    }

    loadDocuments();

    return () => {
      cancelled = true;
    };
  }, []);

  // -----------------------------------------
  // 2. Load saved conversations
  // -----------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadConversations() {
      try {
        const response = await api.get("/api/conversations");

        if (!cancelled) {
          const savedConversations = (
            response.data.conversations || []
          )
            .filter((conversation) => conversation.id)
            .map((conversation) => ({
              ...conversation,
              id: String(conversation.id),
            }));

          setConversations(savedConversations);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load conversations:", error);

          setChatError(
            error.response?.data?.message ||
              "Unable to load conversation history."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingConversations(false);
        }
      }
    }

    loadConversations();

    return () => {
      cancelled = true;
    };
  }, []);

  // -----------------------------------------
  // 3. Automatically scroll to latest message
  // -----------------------------------------

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  // -----------------------------------------
  // 4. Upload document successfully
  // -----------------------------------------

  function handleUploadSuccess(uploadedDocument) {
    const documentName = uploadedDocument.document_name;

    setDocuments((previousDocuments) => {
      const exists = previousDocuments.some(
        (document) => document.id === documentName
      );

      if (exists) {
        return previousDocuments.map((document) =>
          document.id === documentName
            ? {
                ...document,
                pages: uploadedDocument.pages,
                chunks: uploadedDocument.chunks_indexed,
              }
            : document
        );
      }

      return [
        ...previousDocuments,
        {
          id: documentName,
          name: documentName,
          pages: uploadedDocument.pages,
          chunks: uploadedDocument.chunks_indexed,
        },
      ];
    });

    // Start a fresh chat for the uploaded document.
    conversationRequestRef.current += 1;

    setActiveDocument(documentName);
    setActiveConversationId(null);
    setMessages([]);
    setQuestion("");
    setChatError("");
  }

  // -----------------------------------------
  // 5. Select a document
  // -----------------------------------------

  function handleSelectDocument(document) {
    conversationRequestRef.current += 1;

    setActiveDocument(document.id);
    setActiveConversationId(null);
    setMessages([]);
    setQuestion("");
    setChatError("");
  }

  // -----------------------------------------
  // 6. Delete a document
  // -----------------------------------------

  async function handleDeleteDocument(document) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${document.name}"?\n\n` +
        "This will permanently delete the PDF and its indexed chunks."
    );

    if (!confirmed) return;

    setDocumentError("");
    setDeletingDocument(document.id);

    try {
      await api.delete(
        `/api/documents/${encodeURIComponent(document.id)}`
      );

      const remainingDocuments = documents.filter(
        (item) => item.id !== document.id
      );

      setDocuments(remainingDocuments);

      if (activeDocument === document.id) {
        conversationRequestRef.current += 1;

        setActiveDocument(remainingDocuments[0]?.id ?? null);
        setActiveConversationId(null);
        setMessages([]);
        setQuestion("");
        setChatError("");
      }
    } catch (error) {
      setDocumentError(
        error.response?.data?.message ||
          "Unable to delete the document. Please try again."
      );
    } finally {
      setDeletingDocument(null);
    }
  }

  // -----------------------------------------
  // 7. Start a new chat
  // -----------------------------------------

  function handleNewChat() {
    conversationRequestRef.current += 1;

    setActiveConversationId(null);
    setMessages([]);
    setQuestion("");
    setChatError("");
    setLoadingConversation(false);
  }

  // -----------------------------------------
  // 8. Load an existing conversation
  // -----------------------------------------

  async function handleSelectConversation(conversation) {
    if (!conversation.id) {
      setChatError("Invalid conversation ID.");
      return;
    }

    const requestId = ++conversationRequestRef.current;

    setActiveConversationId(conversation.id);
    setMessages([]);
    setQuestion("");
    setChatError("");
    setLoadingConversation(true);

    setActiveDocument(conversation.document_name || null);

    try {
      const response = await api.get(
        `/api/conversations/${conversation.id}`
      );

      // Ignore an older request if another conversation was selected.
      if (requestId !== conversationRequestRef.current) return;

      // Backend returns { success, conversation: {...} }
      const savedConversation = response.data.conversation;

      if (!savedConversation) {
        throw new Error("Conversation data was not returned.");
      }

      const savedMessages = (
        savedConversation.messages || []
      ).map((message, index) => ({
        ...message,
        id:
          message.id ||
          `${savedConversation.id}-${message.created_at || "message"}-${index}`,
        sources: message.sources || [],
      }));

      setMessages(savedMessages);

      setActiveDocument(savedConversation.document_name || null);
    } catch (error) {
      if (requestId !== conversationRequestRef.current) return;

      console.error("Failed to load conversation:", error);

      setChatError(
        error.response?.data?.message ||
          error.message ||
          "Unable to load this conversation. Please try again."
      );
    } finally {
      if (requestId === conversationRequestRef.current) {
        setLoadingConversation(false);
      }
    }
  }

  // -----------------------------------------
  // 9. Delete a conversation
  // -----------------------------------------

  async function handleDeleteConversation(conversation) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${conversation.title}"?`
    );

    if (!confirmed) return;

    setDeletingConversation(conversation.id);

    try {
      await api.delete(
        `/api/conversations/${conversation.id}`
      );

      setConversations((previousConversations) =>
        previousConversations.filter(
          (item) => item.id !== conversation.id
        )
      );

      if (activeConversationId === conversation.id) {
        handleNewChat();
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);

      setChatError(
        error.response?.data?.message ||
          "Unable to delete this conversation. Please try again."
      );
    } finally {
      setDeletingConversation(null);
    }
  }

  // -----------------------------------------
  // 10. Send a question
  // -----------------------------------------

  async function handleAskQuestion(event) {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (
      !trimmedQuestion ||
      !activeDocument ||
      loading ||
      loadingConversation
    ) {
      return;
    }

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedQuestion,
    };

    setMessages((previousMessages) => [
      ...previousMessages,
      userMessage,
    ]);

    setQuestion("");
    setChatError("");
    setLoading(true);

    try {
      // Keep this variable outside the if block.
      let conversationId = activeConversationId;

      // Create a conversation if this is a new chat.
      if (!conversationId) {
        const createResponse = await api.post(
          "/api/conversations",
          {
            title: trimmedQuestion.slice(0, 60),
            document_name: activeDocument,
          }
        );

        // Backend response contains a nested conversation object.
        const newConversation = createResponse.data.conversation;

        // IMPORTANT: Do not declare another const here.
        conversationId = newConversation?.id;

        if (!conversationId) {
          throw new Error(
            "Conversation ID was not returned by the server."
          );
        }

        setActiveConversationId(conversationId);

        setConversations((previousConversations) => [
          {
            id: conversationId,
            title: newConversation.title,
            document_name: newConversation.document_name,
            created_at: newConversation.created_at,
            updated_at: newConversation.updated_at,
          },
          ...previousConversations,
        ]);
      }

      // Prevent an invalid API request.
      if (!conversationId) {
        throw new Error("Invalid conversation ID.");
      }

      // Send the question and get the RAG answer.
      const response = await api.post(
        `/api/conversations/${conversationId}/messages`,
        {
          question: trimmedQuestion,
        }
      );

      const result = response.data;

      // Backend returns both the saved user message and assistant message.
      if (Array.isArray(result.messages)) {
        const savedUserMessage = result.messages.find(
          (message) => message.role === "user"
        );

        const savedAssistantMessage = result.messages.find(
          (message) => message.role === "assistant"
        );

        setMessages((previousMessages) => {
          // Replace the optimistic user message with the saved version.
          const updatedMessages = previousMessages.map((message) =>
            message.id === userMessage.id && savedUserMessage
              ? {
                  ...savedUserMessage,
                  id: userMessage.id,
                  sources: savedUserMessage.sources || [],
                }
              : message
          );

          // Append the assistant response without losing earlier history.
          if (savedAssistantMessage) {
            updatedMessages.push({
              ...savedAssistantMessage,
              id:
                savedAssistantMessage.id ||
                crypto.randomUUID(),
              sources: savedAssistantMessage.sources || [],
            });
          }

          return updatedMessages;
        });
      } else {
        const assistantMessage = result.assistant_message || {
          role: "assistant",
          content: result.answer,
          sources: result.sources || [],
        };

        setMessages((previousMessages) => [
          ...previousMessages,
          {
            ...assistantMessage,
            id: assistantMessage.id || crypto.randomUUID(),
            sources: assistantMessage.sources || [],
          },
        ]);
      }

      // Update the conversation's position in the sidebar.
      setConversations((previousConversations) =>
        previousConversations
          .map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  updated_at:
                    result.updated_at || new Date().toISOString(),
                }
              : conversation
          )
          .sort(
            (a, b) =>
              new Date(b.updated_at || 0) -
              new Date(a.updated_at || 0)
          )
      );
    } catch (error) {
      console.error("Chat request failed:", error);

      setChatError(
        error.response?.data?.message ||
          error.message ||
          "Unable to get an answer. Please check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------------
  // 11. Derived values
  // -----------------------------------------

  const selectedDocument = documents.find(
    (document) => document.id === activeDocument
  );

  const filteredDocuments = documents.filter((document) =>
    document.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // -----------------------------------------
  // 12. Dashboard UI
  // -----------------------------------------

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-slate-800 bg-slate-900">

        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
            <BookOpen size={20} />
          </div>

          <div>
            <h1 className="font-semibold tracking-tight">
              AI KnowledgeMate
            </h1>

            <p className="text-xs text-slate-400">
              Your PDF assistant
            </p>
          </div>
        </div>

        {/* New chat */}
        <div className="p-4">
          <button
            type="button"
            onClick={handleNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium transition hover:bg-blue-500"
          >
            <Plus size={18} />
            New chat
          </button>
        </div>

        {/* Documents */}
        <div className="px-4 pb-2">
          <h2 className="mb-3 px-1 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Your documents
          </h2>

          <FileUpload onUploadSuccess={handleUploadSuccess} />

          {/* Search documents */}
          <div className="relative mb-3 mt-4">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search documents..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm outline-none placeholder:text-slate-500 focus:border-blue-500"
            />
          </div>

          {/* Document list */}
          <div className="space-y-1">
            {filteredDocuments.map((document) => (
              <div
                key={document.id}
                className={`group flex items-center gap-1 rounded-lg transition ${
                  activeDocument === document.id
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSelectDocument(document)}
                  className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left"
                >
                  <FileText
                    size={19}
                    className="shrink-0 text-blue-400"
                  />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {document.name}
                    </span>

                    <span className="mt-1 block text-xs text-slate-500">
                      {document.pages} pages
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteDocument(document)}
                  disabled={deletingDocument !== null}
                  title={`Delete ${document.name}`}
                  aria-label={`Delete ${document.name}`}
                  className="mr-2 rounded-md p-2 text-slate-500 opacity-100 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                >
                  {deletingDocument === document.id ? (
                    <span className="text-xs">...</span>
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            ))}

            {filteredDocuments.length === 0 && (
              <p className="px-2 py-4 text-sm text-slate-500">
                {documents.length === 0
                  ? "Upload a PDF to get started."
                  : "No matching documents found."}
              </p>
            )}
          </div>

          {documentError && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300"
            >
              {documentError}
            </p>
          )}
        </div>

        {/* Conversation history */}
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto border-t border-slate-800 px-4 py-3">
          <h2 className="mb-3 px-1 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Recent conversations
          </h2>

          {loadingConversations ? (
            <p className="px-2 py-3 text-xs text-slate-500">
              Loading conversations...
            </p>
          ) : conversations.length === 0 ? (
            <p className="px-2 py-3 text-xs text-slate-500">
              No conversations yet.
            </p>
          ) : (
            <div className="space-y-1">
              {conversations.map((conversation, index) => (
                <div
                  key={conversation.id || `conversation-${index}`}
                  className={`group flex items-center gap-1 rounded-lg transition ${
                    activeConversationId === conversation.id
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectConversation(conversation)}
                    className="flex min-w-0 flex-1 items-center gap-2 p-3 text-left"
                  >
                    <MessageSquare
                      size={16}
                      className="shrink-0 text-blue-400"
                    />

                    <span className="truncate text-sm">
                      {conversation.title || "New Conversation"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteConversation(conversation)}
                    disabled={deletingConversation !== null}
                    title="Delete conversation"
                    aria-label="Delete conversation"
                    className="mr-2 rounded-md p-2 text-slate-500 opacity-100 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                  >
                    {deletingConversation === conversation.id ? (
                      <span className="text-xs">...</span>
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar footer */}
        <div className="mt-auto border-t border-slate-800 p-4">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <Settings size={18} />
            Settings
          </button>

          <div className="mt-3 flex items-center gap-3 rounded-lg bg-slate-800/60 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/20 text-sm font-semibold text-blue-300">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {user?.name}
              </p>

              <p className="truncate text-xs text-slate-400">
                {user?.email}
              </p>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Logout"
              className="rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col">

        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 px-6">
          <div className="flex min-w-0 items-center gap-3">
            <PanelLeftClose
              size={19}
              className="shrink-0 text-slate-500"
            />

            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {activeConversationId
                  ? conversations.find(
                      (item) => item.id === activeConversationId
                    )?.title ||
                    selectedDocument?.name ||
                    "Conversation"
                  : selectedDocument?.name || "New conversation"}
              </p>

              <p className="text-xs text-slate-500">
                {selectedDocument
                  ? `${selectedDocument.pages} pages · Ready for questions`
                  : "Upload a document to get started"}
              </p>
            </div>
          </div>

          <div className="ml-3 flex shrink-0 items-center gap-2 rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            RAG assistant
          </div>
        </header>

        {/* Selected document details */}
        {selectedDocument && (
          <div className="flex shrink-0 items-center gap-2 border-b border-slate-800/70 px-6 py-2 text-xs text-slate-400">
            <FileText size={15} className="text-blue-400" />

            <span className="truncate">
              {selectedDocument.name}
            </span>

            <span>·</span>

            <span>
              {selectedDocument.chunks != null
                ? `${selectedDocument.chunks} chunks indexed`
                : "Index details unavailable"}
            </span>
          </div>
        )}

        {/* Chat messages */}
        {loadingConversation ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            Loading conversation...
          </div>
        ) : (
          <ChatMessages
            messages={messages}
            loading={loading}
            messagesEndRef={messagesEndRef}
          />
        )}

        {/* Question input */}
        <div className="w-full shrink-0 px-4 pb-6 sm:px-8">
          <div className="mx-auto max-w-3xl">
            {chatError && (
              <div
                role="alert"
                className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"
              >
                {chatError}
              </div>
            )}

            <form
              onSubmit={handleAskQuestion}
              className="rounded-2xl border border-slate-700 bg-slate-900 p-3 focus-within:border-blue-500/70"
            >
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder={
                  selectedDocument
                    ? "Ask a question about your document..."
                    : "Upload a PDF before asking a question..."
                }
                rows={2}
                disabled={
                  !selectedDocument ||
                  loading ||
                  loadingConversation
                }
                className="w-full resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed"
              />

              <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                <p className="text-xs text-slate-500">
                  Enter to send · Shift + Enter for a new line
                </p>

                <button
                  type="submit"
                  disabled={
                    !question.trim() ||
                    !selectedDocument ||
                    loading ||
                    loadingConversation
                  }
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={16} />
                  {loading ? "Thinking..." : "Ask"}
                </button>
              </div>
            </form>

            <p className="mt-3 text-center text-xs text-slate-500">
              AI-generated answers can be inaccurate. Verify important
              information against the cited pages.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
