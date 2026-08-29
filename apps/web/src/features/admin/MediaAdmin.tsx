import { useCallback, useEffect, useRef, useState } from "react";

import { api, resolveMediaUrl } from "../../lib/api";
import type { MediaAsset } from "@hp/shared";
import { ErrorNote } from "./fields";

export function MediaAdmin() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api.admin.media().then((r) => setAssets(r.assets)).catch((e) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  const upload = async (file: File) => {
    setError(null);
    setProgress(0);
    try {
      await api.admin.uploadMedia(file, setProgress);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async (a: MediaAsset) => {
    if (!window.confirm(`Delete ${a.filename}? References to it will break.`)) return;
    await api.admin.deleteMedia(a.id).catch((e) => setError(e.message));
    load();
  };

  const copyUrl = (a: MediaAsset) => {
    void navigator.clipboard.writeText(a.url);
  };

  return (
    <>
      <div className="admin-head">
        <h1>Media Library</h1>
        <div className="actions">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif,application/pdf,video/mp4,video/webm"
            style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
          <button className="btn btn-sm btn-solid" onClick={() => fileRef.current?.click()}>
            {progress !== null ? `UPLOADING ${progress}%` : "+ UPLOAD FILE"}
          </button>
        </div>
      </div>
      <ErrorNote error={error} />
      <p className="mono mono-dim" style={{ marginBottom: 16, fontSize: 9.5 }}>
        IMAGES · PDF · MP4/WEBM — VALIDATED BY TYPE AND SIZE SERVER-SIDE. COPY A URL INTO ANY PROJECT / CERTIFICATE FIELD.
      </p>

      <div className="media-grid">
        {assets.map((a) => (
          <div className="media-card" key={a.id}>
            <div className="m-preview">
              {a.kind === "image" ? (
                <img src={resolveMediaUrl(a.url)} alt={a.filename} loading="lazy" />
              ) : (
                <span>{a.kind.toUpperCase()}</span>
              )}
            </div>
            <div className="m-foot">
              <span className="m-name" title={a.filename}>{a.filename}</span>
              <button className="btn btn-sm btn-ghost" style={{ padding: "3px 7px" }} onClick={() => copyUrl(a)} title="Copy URL">⧉</button>
              <button className="btn btn-sm btn-ghost btn-danger" style={{ padding: "3px 7px" }} onClick={() => remove(a)}>✕</button>
            </div>
          </div>
        ))}
        {assets.length === 0 && <span className="mono mono-dim">NO ASSETS UPLOADED YET</span>}
      </div>
    </>
  );
}
