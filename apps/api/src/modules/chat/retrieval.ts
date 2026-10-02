import type { KnowledgeDoc } from "./knowledge.js";

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "to", "of", "in", "on", "for", "with",
  "and", "or", "but", "not", "do", "does", "did", "have", "has", "had", "he", "his", "him", "she", "her",
  "it", "its", "this", "that", "these", "those", "what", "which", "who", "whom", "whose", "when", "where",
  "why", "how", "can", "could", "will", "would", "shall", "should", "may", "might", "must", "me", "my",
  "you", "your", "tell", "show", "give", "explain", "about", "please", "i", "we", "they", "them", "there",
  "know", "knows", "use", "uses", "using", "used", "make", "made", "build", "built", "get", "got",
]);

export interface RetrievedDoc {
  doc: KnowledgeDoc;
  score: number;
}

function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9+#./ -]/g, " ")
    .split(/[\s/-]+/)
    .map((term) => term.replace(/^[./]+|[./]+$/g, ""))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(normalizeTerm);
}

function normalizeTerm(term: string): string {
  if (term.length > 5 && term.endsWith("ies")) return `${term.slice(0, -3)}y`;
  if (term.length > 4 && term.endsWith("s") && !term.endsWith("ss")) return term.slice(0, -1);
  return term;
}

/**
 * Deterministic lexical retrieval with exact normalized token matches and
 * field boosting. The portfolio is small; this avoids weak substring hits.
 */
export function retrieve(query: string, docs: KnowledgeDoc[], topK = 5): RetrievedDoc[] {
  const terms = tokenizeQuery(query);
  if (terms.length === 0) return [];

  const scored = docs.map((doc) => {
    const titleTerms = new Set(tokenizeQuery(doc.title));
    const contentTerms = new Set(tokenizeQuery(doc.content));
    const keywordTerms = new Set(doc.keywords.map(normalizeTerm));
    let score = 0;

    for (const term of terms) {
      if (keywordTerms.has(term)) score += 3;
      if (titleTerms.has(term)) score += 4;
      if (contentTerms.has(term)) score += 1;
    }

    // slight preference for richer documents
    if (doc.kind === "PROFILE") score *= 1.1;
    if (doc.kind === "PROJECT") score *= 1.05;
    return { doc, score };
  });

  return scored
    .filter((s) => s.score > 2)
    .sort((a, b) => b.score - a.score || a.doc.id.localeCompare(b.doc.id))
    .slice(0, topK);
}
