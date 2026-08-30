import { useEffect, useMemo, useState } from "react";

import type { Certificate } from "@hp/shared";
import { resolveMediaUrl } from "../../lib/api";
import { Dialog } from "../../components/ui/Dialog";
import { IconButton } from "../../components/ui/IconButton";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import { IconDownload, IconExternal, IconClose, IconArrowLeft, IconArrowRight } from "../../components/ui/icons";

export interface CredentialViewerProps {
  certificate: Certificate | null;
  onClose: () => void;
  onNavigate: (dir: -1 | 1) => void;
  hasNeighbors: boolean;
}

/**
 * In-page modal credential viewer (never a new route).
 * Shows image previews for image certificates and an embedded PDF otherwise,
 * with prev/next, download/open and Escape/arrow-key + touch-swipe navigation.
 */
export function CredentialViewer({ certificate, onClose, onNavigate, hasNeighbors }: CredentialViewerProps) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [touchX, setTouchX] = useState<number | null>(null);

  const isImage = useMemo(() => certificate?.fileUrl?.match(/\.(png|jpe?g|webp|avif|gif)$/i), [certificate]);
  const url = certificate?.fileUrl ? resolveMediaUrl(certificate.fileUrl) : null;

  useEffect(() => {
    setState("loading");
  }, [certificate?.id]);

  useKeyboardShortcut(["ArrowRight"], () => hasNeighbors && onNavigate(1), !!certificate);
  useKeyboardShortcut(["ArrowLeft"], () => hasNeighbors && onNavigate(-1), !!certificate);

  if (!certificate) return null;

  const titleId = `cred-dialog-${certificate.id}`;
  const category = certificate.category.charAt(0) + certificate.category.slice(1).toLowerCase();

  return (
    <Dialog open={!!certificate} onClose={onClose} labelledBy={titleId} size="lg" className="credential-viewer">
      <header className="credential-viewer-bar">
        <span className="resume-viewer-title" id={titleId}>Certificate · {category}</span>
        <div className="resume-viewer-actions">
          {url && (
            <a className="icon-btn" href={url} download aria-label="Download credential" title="Download credential"><IconDownload /></a>
          )}
          {url && (
            <a className="icon-btn" href={url} target="_blank" rel="noopener noreferrer" aria-label="Open credential in new tab" title="Open credential in new tab"><IconExternal /></a>
          )}
          <IconButton label="Close credential" onClick={onClose}><IconClose /></IconButton>
        </div>
      </header>

      <div
        className="credential-viewer-frame"
        onTouchStart={(e) => setTouchX(e.changedTouches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const end = e.changedTouches[0]?.clientX;
          if (touchX === null || end === undefined || Math.abs(end - touchX) < 48) return;
          onNavigate(end < touchX ? 1 : -1);
          setTouchX(null);
        }}
      >
        {!url && (
          <div className="cert-viewer-fallback">
            <strong>This credential has no document attached.</strong>
            <span>The record is still available with its issuer and date details.</span>
          </div>
        )}
        {url && state === "loading" && <div className="cert-viewer-fallback"><span>Loading credential…</span></div>}
        {url && state === "error" && (
          <div className="cert-viewer-fallback">
            <strong>Preview unavailable.</strong>
            <span>This document could not be loaded right now.</span>
            <IconButton label="Retry loading credential" onClick={() => setState("loading")}>Retry</IconButton>
          </div>
        )}
        {url && state !== "error" && (
          isImage ? (
            <img src={url} alt={`${certificate.title} certificate`} onLoad={() => setState("ready")} onError={() => setState("error")} />
          ) : (
            <iframe src={`${url}#toolbar=0`} title={`${certificate.title} certificate`} loading="lazy" onLoad={() => setState("ready")} onError={() => setState("error")} />
          )
        )}
      </div>

      <footer className="credential-viewer-info">
        <div className="ci-main">
          <div className="ci-title">{certificate.title}</div>
          <div className="ci-meta">
            {certificate.issuer}
            {certificate.issuedOn ? ` · ${certificate.issuedOn}` : ""}
            {certificate.credentialId ? ` · ID ${certificate.credentialId}` : ""}
          </div>
        </div>
        <div className="ci-nav">
          <IconButton label="Previous credential" onClick={() => onNavigate(-1)} disabled={!hasNeighbors}><IconArrowLeft /></IconButton>
          <IconButton label="Next credential" onClick={() => onNavigate(1)} disabled={!hasNeighbors}><IconArrowRight /></IconButton>
        </div>
      </footer>
    </Dialog>
  );
}