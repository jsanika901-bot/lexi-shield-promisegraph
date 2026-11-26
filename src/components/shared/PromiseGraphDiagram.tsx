import { AlertTriangle, FileText, GitCompare, MessageSquare, CreditCard, Shield } from 'lucide-react';
import { useState } from 'react';
import type { ContradictionLink, EvidenceItem, ExtractedClaim } from '../../types/lexi';

interface PromiseGraphDiagramProps {
  items: EvidenceItem[];
  claims: ExtractedClaim[];
  contradictions: ContradictionLink[];
}

function getDocIcon(type: EvidenceItem['type']) {
  switch (type) {
    case 'job_offer':
    case 'contract':
      return FileText;
    case 'payment_request':
    case 'invoice':
      return CreditCard;
    case 'message':
    case 'email':
    default:
      return MessageSquare;
  }
}

function getDocTypeLabel(type: EvidenceItem['type']) {
  switch (type) {
    case 'job_offer':
      return 'Offer';
    case 'contract':
      return 'Contract';
    case 'message':
      return 'Message';
    case 'payment_request':
      return 'Payment';
    case 'email':
      return 'Email';
    case 'invoice':
      return 'Invoice';
  }
}

export function PromiseGraphDiagram({ items, claims, contradictions }: PromiseGraphDiagramProps) {
  const [selectedContradictionId, setSelectedContradictionId] = useState<string | null>(
    contradictions[0]?.id ?? null
  );
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const activeContradiction =
    contradictions.find((c) => c.id === selectedContradictionId) ?? contradictions[0] ?? null;

  const isDocHighlighted = (docId: string) => {
    if (selectedDocId) return selectedDocId === docId;
    if (activeContradiction) {
      return activeContradiction.docAId === docId || activeContradiction.docBId === docId;
    }
    return false;
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0B1221] p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <GitCompare className="w-4 h-4 text-blue-400 shrink-0" aria-hidden="true" />
            <span>Cross-Document Relationship Map</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{items.length} Sources</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{claims.length} Claims</span>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-white mt-1">
            PROMISEGRAPH Evidence Topology
          </h3>
        </div>

        <p className="text-xs text-slate-400">
          Select a document or contradiction node to inspect linked statements
        </p>
      </div>

      {/* 3-Column Interactive Graph Topology (Responsive: stacks cleanly on mobile, 3-column flow on md+) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Column 1: Source Documents */}
        <div className="lg:col-span-4 space-y-2.5">
          <p className="text-xs font-medium text-slate-400 px-1">01. Evidence Sources</p>
          {items.map((doc) => {
            const Icon = getDocIcon(doc.type);
            const highlighted = isDocHighlighted(doc.id);
            const docClaimsCount = claims.filter((c) => c.documentId === doc.id).length;
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => {
                  setSelectedDocId(selectedDocId === doc.id ? null : doc.id);
                }}
                className={`w-full text-left rounded-xl border p-3.5 transition-colors min-h-[56px] cursor-pointer ${
                  highlighted
                    ? 'border-blue-500/70 bg-blue-950/30'
                    : 'border-slate-800 bg-[#060911] hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0F172A] border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-blue-400" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span>{getDocTypeLabel(doc.type)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{docClaimsCount} claim{docClaimsCount === 1 ? '' : 's'}</span>
                    </div>
                    <p className="text-sm font-medium text-white truncate mt-0.5">{doc.title}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Column 2: Extracted Claims */}
        <div className="lg:col-span-4 space-y-2.5">
          <p className="text-xs font-medium text-slate-400 px-1">02. Extracted Promises & Demands</p>
          {claims.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-[#060911] p-4 text-xs text-slate-400">
              Run Cross-Check to extract claims from active documents.
            </div>
          ) : (
            claims.map((claim) => {
              const linkedToDoc = selectedDocId ? claim.documentId === selectedDocId : false;
              const linkedToConflict = activeContradiction
                ? claim.id === activeContradiction.claimAId ||
                  claim.id === activeContradiction.claimBId ||
                  claim.documentId === activeContradiction.docAId ||
                  claim.documentId === activeContradiction.docBId
                : false;

              return (
                <div
                  key={claim.id}
                  className={`rounded-xl border p-3.5 transition-colors ${
                    linkedToDoc || linkedToConflict
                      ? 'border-blue-500/50 bg-[#0D172B]'
                      : 'border-slate-800/90 bg-[#060911]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span
                      className={
                        claim.polarity === 'promise'
                          ? 'text-emerald-400 font-medium'
                          : claim.polarity === 'demand'
                            ? 'text-amber-400 font-medium'
                            : 'text-slate-300 font-medium'
                      }
                    >
                      {claim.polarity === 'promise'
                        ? 'Promise / Waiver'
                        : claim.polarity === 'demand'
                          ? 'Payment / Fee Demand'
                          : claim.polarity === 'restriction'
                            ? 'Constraint / Urgency'
                            : 'Statement'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{claim.documentTitle}</span>
                  </div>
                  <p className="text-xs text-slate-200 mt-1 leading-relaxed">{claim.statement}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Column 3: Contradiction & Verification Nodes */}
        <div className="lg:col-span-4 space-y-2.5">
          <p className="text-xs font-medium text-slate-400 px-1">03. Detected Conflicts & Links</p>
          {contradictions.length === 0 ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs text-slate-300 leading-relaxed">
                No direct cross-document contradictions detected across the current active claims. Continue standard verification.
              </div>
            </div>
          ) : (
            contradictions.map((c) => {
              const isSelected = activeContradiction?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedDocId(null);
                    setSelectedContradictionId(c.id);
                  }}
                  className={`w-full text-left rounded-xl border p-3.5 transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-red-500/70 bg-red-950/25'
                      : 'border-slate-800 bg-[#060911] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium text-red-400">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{c.conflictType}</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1.5">
                    {c.docATitle} <span className="text-slate-500">vs.</span> {c.docBTitle}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Focused Contradiction Inspector */}
      {activeContradiction && (
        <div className="rounded-xl border border-slate-800 bg-[#060911] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-amber-400">{activeContradiction.conflictType}</span>
            <span className="text-slate-400">
              Comparing {activeContradiction.docATitle} &amp; {activeContradiction.docBTitle}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-slate-800 bg-[#0B1221] p-3">
              <p className="text-blue-400 font-medium mb-1">{activeContradiction.docATitle}</p>
              <p className="text-slate-200 leading-relaxed">“{activeContradiction.quoteA}”</p>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-[#0B1221] p-3">
              <p className="text-amber-400 font-medium mb-1">{activeContradiction.docBTitle}</p>
              <p className="text-slate-200 leading-relaxed">“{activeContradiction.quoteB}”</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{activeContradiction.explanation}</p>
        </div>
      )}
    </div>
  );
}
