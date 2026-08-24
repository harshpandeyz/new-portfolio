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
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Lexical retrieval with field boosting. Deliberately dependency-free —
 * the interface matches a future vector-search retriever (see docs/ARCHITECTURE.md).
 */
export function retrieve(query: string, docs: KnowledgeDoc[], topK = 5): RetrievedDoc[] {
  const terms = tokenizeQuery(query);
  if (terms.length === 0) return [];

  const scored = docs.map((doc) => {
    const titleLower = doc.title.toLowerCase();
    const contentLower = doc.content.toLowerCase();
    let score = 0;

    for (const term of terms) {
      if (doc.keywords.includes(term)) score += 3;
      if (titleLower.includes(term)) score += 4;
      if (contentLower.includes(term)) score += 1;
      // partial match for plural/simple morphological variants
      if (term.length > 4) {
        const stem = term.slice(0, Math.max(4, term.length - 2));
        if (titleLower.includes(stem)) score += 1.5;
        if (contentLower.includes(stem)) score += 0.5;
      }
    }

    // slight preference for richer documents
    if (doc.kind === "PROFILE") score *= 1.1;
    if (doc.kind === "PROJECT") score *= 1.05;
    return { doc, score };
  });

  return scored
    .filter((s) => s.score > 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
