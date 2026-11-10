
import { useRef, useState } from "react";
import { FileUp, FileText, LoaderCircle, X } from "lucide-react";
import api from "../services/api";

function FileUpload({ onUploadSuccess }) {
  const inputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    setError("");
    setSuccess("");

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are allowed.");
      setSelectedFile(null);
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("The PDF must be 10 MB or smaller.");
      setSelectedFile(null);
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile || loading) return;

    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await api.post(
        "/api/documents/upload",
        formData
      );

      const document = response.data;

      setSuccess(
        `${document.document_name} uploaded successfully. ` +
        `${document.pages} pages processed; ` +
        `${document.chunks_indexed} chunks indexed.`
      );

      onUploadSuccess?.(document);

      setSelectedFile(null);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Upload failed. Check that the Flask backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-600 px-4 py-3 text-sm text-slate-300 transition hover:border-blue-500 hover:bg-slate-800 disabled:opacity-50"
      >
        <FileUp size={18} />
        Choose PDF
      </button>

      {selectedFile && (
        <div className="flex items-center gap-3 rounded-lg bg-slate-800 p-3">
          <FileText size={20} className="shrink-0 text-blue-400" />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {selectedFile.name}
            </p>
            <p className="text-xs text-slate-400">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>

          <button
            type="button"
            aria-label="Remove selected file"
            disabled={loading}
            onClick={() => {
              setSelectedFile(null);
              setError("");
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="rounded p-1 text-slate-400 hover:text-white"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {selectedFile && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <LoaderCircle size={17} className="animate-spin" />
              Processing PDF...
            </>
          ) : (
            <>
              <FileUp size={17} />
              Upload and index
            </>
          )}
        </button>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {success}
        </p>
      )}
    </div>
  );
}

export default FileUpload;
