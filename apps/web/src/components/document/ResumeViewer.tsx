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

  useEffect(() => {
    if (!open) return;
    setFailed(false);
    setSlow(false);
    const t = window.setTimeout(() => setSlow(true), 3000);
    return () => window.clearTimeout(t);
  }, [open, url]);

  const onDownload = useMemo(
    () => () => {
      void api.track("resume_download");
    },
    [],
  );

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
        {!failed && (
          <iframe
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