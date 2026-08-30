import type { Certificate } from "@hp/shared";
import { resolveMediaUrl } from "../../lib/api";

function label(value: string) {
  return value === "ALL" ? "All" : value.charAt(0) + value.slice(1).toLowerCase();
}

export interface CredentialCardProps {
  certificate: Certificate;
  index: number;
  onOpen: (cert: Certificate, el: HTMLElement) => void;
}

/** Credential card: title, issuer, date, category — opens an in-page modal. */
export function CredentialCard({ certificate: c, index, onOpen }: CredentialCardProps) {
  return (
    <button
      className="vault-item"
      onClick={(e) => onOpen(c, e.currentTarget)}
      data-reveal
      data-reveal-delay={String((index % 6) * 0.04)}
      aria-label={`View credential: ${c.title}`}
    >
      <div className="certificate-preview" aria-hidden="true">
        {c.fileUrl && c.fileUrl.match(/\.(png|jpe?g|webp|avif|gif)$/i)
          ? <img src={resolveMediaUrl(c.fileUrl)} alt="" loading="lazy" />
          : <span>{c.fileUrl ? "PDF" : "Details only"}</span>}
      </div>
      <div className="vi-top">
        <span className="vi-cat">{label(c.category)}</span>
        {c.featured && <span className="vi-featured" title="Selected credential">★</span>}
      </div>
      <h3>{c.title}</h3>
      <div className="vi-issuer">{c.issuer}</div>
      <div className="vi-foot">
        <span>{c.issuedOn ?? "Date not listed"}</span>
        {c.credentialId && <span className="vi-id">ID · {c.credentialId}</span>}
        <span className="open">View</span>
      </div>
    </button>
  );
}