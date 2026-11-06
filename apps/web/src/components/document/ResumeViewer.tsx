import { useEffect, useMemo, useRef, useState } from "react";

import { resolveMediaUrl } from "../../lib/api";
import { api } from "../../lib/api";
import { useData } from "../../lib/data";
import { PROFILE } from "../../app/constants";
import { Dialog } from "../ui/Dialog";
import { IconDownload, IconExternal, IconClose } from "../ui/icons";

export interface ResumeViewerProps {
  open: boolean;
  onClose: () => void;
  resumeUrl?: string | null;
}

/**
 * Returns true for a PDF `Content-Type` (may carry `; charset=` suffixes).
 * Exported for unit tests covering inline-serving header expectations.
 */
export function isPdfContentType(contentType: string | null | undefined): boolean {
  if (!contentType) return false;
  return contentType.toLowerCase().includes("application/pdf");
}

/**
 * Proactively verify the résumé URL serves a PDF.
 *
 * Chrome's native PDF viewer can render its internal error page inside the
 * iframe without firing `onError`, so a failed embed would otherwise look
 * like a silent blank page. A same-origin `HEAD` check detects 404s, SPA
 * fallbacks (`text/html`), and wrong MIME types before we trust the iframe.
 */
export async function verifyPdfAvailable(
  pdfUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<{ ok: boolean; reason?: string }> {
  if (!pdfUrl) return { ok: false, reason: "empty-url" };
  try {
    const head = await fetchFn(pdfUrl, { method: "HEAD" });
    if (head.ok) {
      const contentType = head.headers.get("content-type");
      if (isPdfContentType(contentType)) return { ok: true };
      return { ok: false, reason: `unexpected-content-type:${contentType ?? "none"}` };
    }
    // Some static hosts reject HEAD; fall back to a 1-byte ranged GET probe.
    if (head.status === 405 || head.status === 501) {
      const probe = await fetchFn(pdfUrl, { headers: { Range: "bytes=0-0" } });
      if (!probe.ok) return { ok: false, reason: `status:${probe.status}` };
      return { ok: true };
    }
    return { ok: false, reason: `status:${head.status}` };
  } catch {
    return { ok: false, reason: "network-error" };
  }
}

/**
 * Reusable in-site résumé viewer.
 *
 * Clicking "View résumé" anywhere opens this instead of a new browser tab, so
 * visitors stay in the portfolio while they read. It reuses the same component
 * from the hero, navigation, contact and recruiter pages. Download triggers an
 * actual file download; Open ↗ opens a real new tab when genuinely useful.
 */
export function ResumeViewer({ open, onClose, resumeUrl }: ResumeViewerProps) {
  const { profile } = useData();
  const raw = resumeUrl ?? profile?.resumeUrl ?? PROFILE.resume.path;
  const url = useMemo(() => resolveMediaUrl(raw), [raw]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = "resume-dialog-title";
  const [failed, setFailed] = useState(false);
  const [slow, setSlow] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setFailed(false);
    setSlow(false);
    setReloadKey(0);
    const slowTimer = window.setTimeout(() => {
      if (!cancelled) setSlow(true);
    }, 3000);
    // Chrome can paint its internal PDF error page inside the iframe without
    // firing onError, so verify serving headers up front instead of relying
    // solely on the iframe event.
    void verifyPdfAvailable(url).then((result) => {
      if (!cancelled && !result.ok) setFailed(true);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
    };
  }, [open, url]);

  const onDownload = useMemo(
    () => () => {
      void api.track("resume_download");
    },
    [],
  );

  const retryPreview = () => {
    setFailed(false);
    setSlow(false);
    setReloadKey((n) => n + 1);
    void verifyPdfAvailable(url).then((result) => {
      if (!result.ok) setFailed(true);
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      size="lg"
      className="resume-viewer"
      initialFocusRef={closeRef}
    >
      <header className="resume-viewer-bar">
        <span className="resume-viewer-title" id={titleId}>Résumé</span>
        <div className="resume-viewer-actions">
          <a className="icon-btn" href={url} download onClick={onDownload} aria-label="Download résumé" title="Download résumé">
            <IconDownload />
          </a>
          <a className="icon-btn" href={url} target="_blank" rel="noopener noreferrer" aria-label="Open résumé in new tab" title="Open résumé in new tab">
            <IconExternal />
          </a>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Close résumé" title="Close résumé">
            <IconClose />
          </button>
        </div>
      </header>

      <div className="resume-viewer-doc">
        {!failed && url && (
          <iframe
            key={reloadKey}
            src={`${url}#toolbar=0`}
            title="Harsh Pandey résumé"
            loading="eager"
            onLoad={() => setSlow(false)}
            onError={() => setFailed(true)}
          />
        )}
        {failed ? (
          <div className="resume-fallback" role="status">
            <strong>Preview unavailable</strong>
            <span>Your browser couldn’t render the PDF inline. Open it directly — the file itself is fine.</span>
            <div className="resume-fallback-actions">
              <a className="btn btn-sm btn-solid" href={url} target="_blank" rel="noopener noreferrer">Open in new tab</a>
              <a className="btn btn-sm" href={url} download onClick={onDownload}>Download</a>
              <button type="button" className="btn btn-sm" onClick={retryPreview}>Retry preview</button>
            </div>
          </div>
        ) : slow ? (
          <div className="resume-fallback resume-fallback--hint" role="status">
            <span>Preview still loading? Open it directly.</span>
            <a className="link-btn" href={url} target="_blank" rel="noopener noreferrer">Open in new tab <IconExternal /></a>
          </div>
        ) : null}
      </div>

      {/* Sticky action bar for mobile: download is always reachable. */}
      <footer className="resume-viewer-mobile-bar">
        <a className="btn btn-sm btn-solid" href={url} download onClick={onDownload}>
          <IconDownload /> Download
        </a>
        <a className="btn btn-sm" href={url} target="_blank" rel="noopener noreferrer">
          <IconExternal /> Open in new tab
        </a>
      </footer>
    </Dialog>
  );
}