import { useEffect, useRef, useState } from "react";

import { api, resolveMediaUrl } from "../../lib/api";
import type { MediaAsset } from "@hp/shared";
import { ConfirmDialog, EmptyState, ErrorState, PageHead, friendlyError, useToast } from "./ui";
import { adminBus } from "./bus";

export function MediaAdmin() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<MediaAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { push } = useToast();

  const load = async () => {
    setError(null);
    try {
      const r = await api.admin.media();
      setAssets(r.assets);
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // Command palette ("Upload media") opens the picker even from elsewhere.
  useEffect(() => {
    adminBus.onUploadRequest(() => fileRef.current?.click());
    return () => adminBus.onUploadRequest(null);
  }, []);

  const upload = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      push({ kind: "error", title: "File too large", desc: "Max 25MB." });
      return;
    }
    setProgress(0);
    try {
      const asset = await api.admin.uploadMedia(file, setProgress);
      push({ kind: "success", title: "Uploaded", desc: asset.filename });
      void load();
    } catch (e) {
      push({ kind: "error", title: "Upload failed", desc: friendlyError(e) });
    } finally {
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await api.admin.deleteMedia(toDelete.id);
      push({ kind: "success", title: "Asset deleted" });
      setToDelete(null);
      void load();
    } catch (e) {
      push({ kind: "error", title: "Delete failed", desc: friendlyError(e) });
    } finally {
      setBusy(false);
    }
  };

  const filtered = assets.filter((a) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${a.filename} ${a.kind} ${a.mimeType}`.toLowerCase().includes(q);
  });

  return (
    <>
      <PageHead
        title="Media library"
        desc={`${filtered.length} of ${assets.length} file${assets.length === 1 ? "" : "s"} · type- and signature-verified server-side.`}
        actions={
          <>
            <input className="ctl-input ctl-search" placeholder="Search files…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search media" />
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif,application/pdf,video/mp4,video/webm"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])}
            />
            <button className="ctl-btn ctl-btn--primary" onClick={() => fileRef.current?.click()} disabled={progress !== null}>
              {progress !== null ? `Uploading ${progress}%` : "+ Upload"}
            </button>
          </>
        }
      />
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {filtered.length === 0 ? (
        <EmptyState title="No media" desc="Upload images, PDFs, or video to reference from projects and certificates." />
      ) : (
        <div className="ctl-media-grid">
          {filtered.map((a) => (
            <div className="ctl-media-card" key={a.id}>
              <div className="ctl-media-preview">
                {a.kind === "image" ? (
                  <img src={resolveMediaUrl(a.url)} alt={a.filename} loading="lazy" />
                ) : (
                  <span>{a.kind.toUpperCase()} · {(a.sizeBytes / 1024).toFixed(0)}KB</span>
                )}
              </div>
              <div className="ctl-media-foot">
                <span className="ctl-media-name" title={`${a.filename} · ${a.mimeType} · ${(a.sizeBytes / 1024).toFixed(1)}KB`}>{a.filename}</span>
                <button className="ctl-mini-btn" onClick={() => navigator.clipboard.writeText(a.url).then(() => push({ kind: "success", title: "URL copied" })).catch(() => undefined)} title="Copy URL">Copy</button>
                <button className="ctl-mini-btn danger" onClick={() => setToDelete(a)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => void remove()}
        title={`Delete ${toDelete?.filename}?`}
        description="References to this file from projects or certificates will break."
        confirmLabel="Delete asset"
        busy={busy}
      />
    </>
  );
}
