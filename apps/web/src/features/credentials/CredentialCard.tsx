import type { Certificate } from "@hp/shared";
import { resolveMediaUrl } from "../../lib/api";

function label(value: string) {
  return value === "ALL" ? "All" : value.charAt(0) + value.slice(1).toLowerCase();
}

export interface CredentialCardProps {
  certificate: Certificate;
  index: number;
  onOpen: (cert: Certificate, el: HTMLElement | null) => void;
}

/** Credential card: title, issuer, date, category — with labelled actions. */
export function CredentialCard({ certificate: c, index, onOpen }: CredentialCardProps) {
  const isImage = c.fileUrl && /\.(png|jpe?g|webp|avif|gif)$/i.test(c.fileUrl);
  const download = c.fileUrl ? resolveMediaUrl(c.fileUrl) : null;
  const tierAttr = c.category.toLowerCase();

  return (
    <article
      className="vault-item"
      data-reveal
      data-reveal-delay={String((index % 6) * 0.04)}
      data-tier={tierAttr}
    >
      <div className="certificate-preview" aria-hidden="true">
        {isImage
          ? <img src={download ?? ""} alt="" loading="lazy" />
          : c.fileUrl
            ? (
              <div className="doc-preview">
                <span className="doc-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M10 13H8" /><path d="M16 17H8" /><path d="M13 17H8" /></svg>
                </span>
                <span className="doc-type">{label(c.category)} · PDF Document</span>
                <span className="doc-lines" aria-hidden="true"><i /><i /><i /></span>
                <span className="doc-title-slab">{c.title}</span>
              </div>
            )
            : <span className="doc-type">Details only</span>}
      </div>
      <div className="vi-top">
        <span className="vi-cat">{label(c.category)}</span>
        {c.featured && <span className="vi-featured" title="Selected credential">Selected</span>}
      </div>
      <h3>{c.title}</h3>
      <div className="vi-issuer">{c.issuer}</div>
      <div className="vi-meta">
        <span>{c.issuedOn ?? "Date not listed"}</span>
        {c.credentialId && <span>ID · {c.credentialId}</span>}
      </div>
      <div className="vi-actions">
        <button className="btn btn-sm btn-solid vault-open" onClick={(e) => onOpen(c, e.currentTarget)}>View details</button>
        {download && (
          <a className="vault-dl btn btn-sm" href={download} target="_blank" rel="noopener noreferrer" download>
            {isImage ? "Image" : "PDF"}
          </a>
        )}
      </div>
    </article>
  );
}