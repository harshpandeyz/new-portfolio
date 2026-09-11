import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api, resolveMediaUrl } from "../../lib/api";
import type { MediaAsset } from "@hp/shared";
import { ConfirmDialog, EmptyState, ErrorState, PageHead, SearchInput, Segmented, SkeletonList, friendlyError, usePersistentState, useToast } from "./ui";
import { adminBus } from "./bus";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif,application/pdf,video/mp4,video/webm";
const MAX_BYTES = 25 * 1024 * 1024;

type KindFilter = "ALL" | "image" | "document" | "video" | "orphans";

interface UploadRow {
  id: number;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

let uploadSeq = 1;

export function MediaAdmin() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [query, setQuery] = usePersistentState("ctl:media:q", "");
  const [kind, setKind] = usePersistentState<KindFilter>("ctl:media:kind", "ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [toDelete, setToDelete] = useState<MediaAsset | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState<MediaAsset | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);
  const { push } = useToast();

  const load = useCallback(async (signal?: AbortSignal) => {
    setError(null);
    setLoading(true);
    try {
      const r = await api.admin.media();
      if (signal?.aborted) return;
      setAssets(r.assets);
      setSelected((prev) => {
        const ids = new Set(r.assets.map((a) => a.id));
        return new Set([...prev].filter((id) => ids.has(id)));
      });
    } catch (e) {
      if (!signal?.aborted) setError(friendlyError(e));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load]);

  useEffect(() => {
    return adminBus.onUploadRequest(() => fileRef.current?.click());
  }, []);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const list = [...files];
    if (list.length === 0) return;
    for (const file of list) {
      if (file.size > MAX_BYTES) {
        push({ kind: "error", title: "File too large", desc: `${file.name} exceeds 25MB.` });
        continue;
      }
      const id = uploadSeq++;
      setUploads((rows) => [...rows, { id, name: file.name, progress: 0, status: "uploading" }]);
      try {
        const asset = await api.admin.uploadMedia(file, (pct) => {
          setUploads((rows) => rows.map((r) => (r.id === id ? { ...r, progress: pct } : r)));
        });
        setUploads((rows) => rows.map((r) => (r.id === id ? { ...r, progress: 100, status: "done" } : r)));
        push({ kind: "success", title: "Uploaded", desc: asset.filename });
        window.setTimeout(() => setUploads((rows) => rows.filter((r) => r.id !== id)), 2500);
        void load();
      } catch (e) {
        setUploads((rows) => rows.map((r) => (r.id === id ? { ...r, status: "error", error: friendlyError(e) } : r)));
        push({ kind: "error", title: "Upload failed", desc: `${file.name}: ${friendlyError(e)}` });
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }, [push, load]);

  const replace = async (file: File) => {
    if (!replaceTarget) return;
    if (file.size > MAX_BYTES) {
      push({ kind: "error", title: "File too large", desc: "Max 25MB." });
      return;
    }
    try {
      await api.admin.replaceMedia(replaceTarget, file, () => undefined);
      push({ kind: "success", title: "Asset replaced", desc: file.name });
      void load();
    } catch (e) {
      push({ kind: "error", title: "Replace failed", desc: friendlyError(e) });
    } finally {
      setReplaceTarget(null);
      if (replaceRef.current) replaceRef.current.value = "";
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

  const bulkDelete = async () => {
    if (selected.size === 0 || busy) return;
    setBusy(true);
    try {
      let n = 0;
      for (const id of selected) {
        try {
          await api.admin.deleteMedia(id);
          n += 1;
        } catch {
          /* continue with the rest */
        }
      }
      push({ kind: "success", title: `Deleted ${n} asset${n === 1 ? "" : "s"}` });
      setConfirmBulkDelete(false);
      setSelected(new Set());
      void load();
    } finally {
      setBusy(false);
    }
  };

  const copyUrl = async (a: MediaAsset) => {
    try {
      await navigator.clipboard.writeText(a.url);
      push({ kind: "success", title: "URL copied" });
    } catch {
      push({ kind: "error", title: "Copy failed", desc: "Clipboard is unavailable — copy the URL manually." });
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (kind === "orphans" && a.referenced) return false;
      if (kind !== "ALL" && kind !== "orphans" && a.kind !== kind) return false;
      if (q && !`${a.filename} ${a.kind} ${a.mimeType}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [assets, query, kind]);

  const orphanCount = assets.filter((asset) => !asset.referenced).length;
  const allIds = filtered.map((a) => a.id);
  const allChecked = allIds.length > 0 && allIds.every((id) => selected.has(id));

  // Lightbox keyboard: Escape closes, arrows move.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const idx = filtered.findIndex((a) => a.id === lightbox.id);
        const next = filtered[(idx + (e.key === "ArrowRight" ? 1 : -1) + filtered.length) % filtered.length];
        if (next) setLightbox(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, filtered]);

  return (
    <>
      <PageHead
        title="Media library"
        desc={`${filtered.length} of ${assets.length} file${assets.length === 1 ? "" : "s"} · ${orphanCount} orphan${orphanCount === 1 ? "" : "s"} · type- and signature-verified server-side.`}
        actions={
          <>
            <SearchInput value={query} onChange={setQuery} label="Search media" placeholder="Search files…" />
            <input
              ref={fileRef}
              id="ctl-media-upload"
              type="file"
              accept={ACCEPT}
              multiple
              style={{ display: "none" }}
              onChange={(e) => e.target.files && void uploadFiles(e.target.files)}
            />
            <input
              ref={replaceRef}
              type="file"
              accept={ACCEPT}
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void replace(f);
              }}
            />
            <button type="button" className="ctl-btn ctl-btn--primary" onClick={() => fileRef.current?.click()}>
              + Upload
            </button>
          </>
        }
      />

      <div
        className={`ctl-dropzone${drag ? " drag" : ""}`}
        role="button"
        tabIndex={0}
        aria-label="Upload files — drag and drop or press Enter to browse"
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files.length > 0) void uploadFiles(e.dataTransfer.files);
        }}
      >
        <b>Drag & drop files here, or browse</b>
        <span>Images, PDFs, video · max 25MB each · verified server-side</span>
      </div>

      {uploads.length > 0 && (
        <div className="ctl-upload-queue" aria-live="polite" aria-label="Uploads in progress">
          {uploads.map((u) => (
            <div className="ctl-upload-row" key={u.id}>
              <span style={{ fontWeight: 650 }}>{u.name}</span>
              {u.status === "uploading" && (
                <>
                  <span className="ctl-upload-bar"><i style={{ width: `${u.progress}%` }} /></span>
                  <span>{u.progress}%</span>
                </>
              )}
              {u.status === "done" && <span style={{ color: "#16a34a", fontWeight: 700 }}>Done</span>}
              {u.status === "error" && <span style={{ color: "#b42318" }}>{u.error ?? "Failed"}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="ctl-list-toolbar" style={{ marginTop: 12 }}>
        <Segmented options={["ALL", "image", "document", "video", "orphans"] as const} value={kind} onChange={setKind} label="Filter by kind" />
        <label className="ctl-selectpage" style={{ margin: 0 }}>
          <input
            type="checkbox"
            checked={allChecked}
            onChange={(e) => setSelected(e.target.checked ? new Set(allIds) : new Set())}
            aria-label="Select all files on screen"
          />
          Select shown
        </label>
        {selected.size > 0 && (
          <div className="ctl-bulkbar" role="toolbar" aria-label="Bulk actions">
            <span>{selected.size} selected</span>
            <button type="button" className="ctl-mini-btn danger" onClick={() => setConfirmBulkDelete(true)}>Delete</button>
            <button type="button" className="ctl-mini-btn" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {loading && assets.length === 0 ? (
        <SkeletonList rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={query || kind !== "ALL" ? "No files match" : "No media yet"}
          desc="Upload images, PDFs, or video to reference from projects and certificates."
          action={<button type="button" className="ctl-btn ctl-btn--primary ctl-btn--sm" onClick={() => fileRef.current?.click()}>Upload files</button>}
        />
      ) : (
        <div className="ctl-media-grid">
          {filtered.map((a) => {
            const checked = selected.has(a.id);
            return (
              <div className="ctl-media-card" key={a.id}>
                <button
                  type="button"
                  className="ctl-media-preview-btn"
                  onClick={() => setLightbox(a)}
                  aria-label={`Preview ${a.filename}`}
                >
                  <span className="ctl-media-preview">
                    {a.kind === "image" ? (
                      <img src={resolveMediaUrl(a.url)} alt="" loading="lazy" />
                    ) : (
                      <span>{a.kind.toUpperCase()} · {(a.sizeBytes / 1024).toFixed(0)}KB</span>
                    )}
                  </span>
                </button>
                <div className="ctl-media-foot">
                  <label className="ctl-media-select">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setSelected((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(a.id);
                        else next.delete(a.id);
                        return next;
                      })}
                      aria-label={`Select ${a.filename}`}
                    />
                    <span className="ctl-media-name" title={`${a.filename} · ${a.mimeType} · ${(a.sizeBytes / 1024).toFixed(1)}KB`}>
                      {a.filename} {!a.referenced && <small style={{ color: "#b45309" }}>ORPHAN</small>}
                    </span>
                  </label>
                  <span className="ctl-media-actions">
                    <button type="button" className="ctl-mini-btn" onClick={() => void copyUrl(a)} aria-label={`Copy URL for ${a.filename}`}>Copy</button>
                    <button type="button" className="ctl-mini-btn" onClick={() => { setReplaceTarget(a.id); replaceRef.current?.click(); }} aria-label={`Replace ${a.filename}`}>Replace</button>
                    <button type="button" className="ctl-mini-btn danger" onClick={() => setToDelete(a)} aria-label={`Delete ${a.filename}`}>Delete</button>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lightbox && (
        <div className="ctl-lightbox" role="dialog" aria-modal="true" aria-label={`Preview ${lightbox.filename}`} onClick={() => setLightbox(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            {lightbox.kind === "image" ? (
              <img src={resolveMediaUrl(lightbox.url)} alt={lightbox.filename} />
            ) : (
              <div className="ctl-card" style={{ padding: 24 }}>
                <b>{lightbox.filename}</b>
                <p style={{ color: "#6b7280", fontSize: 13 }}>{lightbox.mimeType} · {(lightbox.sizeBytes / 1024).toFixed(1)}KB</p>
                <a className="ctl-btn ctl-btn--primary ctl-btn--sm" href={resolveMediaUrl(lightbox.url)} target="_blank" rel="noopener noreferrer">Open file</a>
              </div>
            )}
            <div className="ctl-lightbox-cap">{lightbox.filename} · ← → to browse · Esc to close</div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => void remove()}
        title={`Delete ${toDelete?.filename}?`}
        description={toDelete?.referenced ? "References to this file from projects, certificates, or profile media will break." : "This file is not referenced by current content and can be safely removed if no external system uses it."}
        confirmLabel="Delete asset"
        busy={busy}
      />
      <ConfirmDialog
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={() => void bulkDelete()}
        title={`Delete ${selected.size} assets?`}
        description="Bulk delete is permanent. Referenced files will break their pages."
        confirmLabel={`Delete ${selected.size}`}
        busy={busy}
      />
    </>
  );
}
