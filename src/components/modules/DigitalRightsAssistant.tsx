import { CheckSquare, ClipboardCopy, ExternalLink, Scale, Square } from 'lucide-react';
import { useState } from 'react';
import type { AnalysisReport } from '../../types/lexi';
import { DisclaimerBanner } from '../shared/DisclaimerBanner';

interface DigitalRightsAssistantProps {
  latestReport: AnalysisReport | null;
}

type SituationKey = 'job_fee' | 'contract_clause' | 'payment_dispute' | 'impersonation';

const SITUATION_GUIDES: Record<
  SituationKey,
  {
    title: string;
    summary: string;
    checklist: string[];
    preservationSteps: string[];
    draftMessage: string;
  }
> = {
  job_fee: {
    title: 'Upfront Recruitment or Training Fee Request',
    summary:
      'When an offer states no fee applies or a recruiter requests money to a personal UPI/account before onboarding, pause all transfers until independently verified.',
    checklist: [
      'Locate the company’s official website independently (via search, not links inside the chat).',
      'Email or call the official HR / careers contact listed on the corporate domain.',
      'Check whether the payment handle matches a verified corporate merchant name rather than an individual.',
      'Decline artificial "before 5 PM today" cutoffs until written confirmation arrives from an official domain.',
    ],
    preservationSteps: [
      'Export or screenshot the full chat thread showing phone number/handle and timestamps.',
      'Save PDFs of the offer letter and training addendum with email headers intact.',
      'Record any UPI ID, bank account number, or payment link without initiating a transfer.',
    ],
    draftMessage:
      'Hello,\n\nI noticed a discrepancy between the offer letter (which states no registration or upfront fees apply) and the recent request for a training fee transfer to an individual UPI handle. Before proceeding, please send confirmation from an official corporate email domain along with an official company invoice.\n\nThank you.',
  },
  contract_clause: {
    title: 'Unclear Bond, Penalty, or IP Clause',
    summary:
      'Before signing an agreement with asymmetrical termination, large bond penalties, or broad IP capture, request written clarification or balanced amendments.',
    checklist: [
      'Ask for itemized training cost justification if a bond or liquidated damages clause is included.',
      'Confirm mutual notice periods rather than one-sided immediate termination.',
      'Ensure pre-existing personal code, tools, or portfolio work are explicitly carved out.',
      'Seek independent legal review for high-value or multi-year lock-in commitments.',
    ],
    preservationSteps: [
      'Retain dated copies of every draft version sent to you.',
      'Keep written email acknowledgements of any verbal assurances given by recruiters or managers.',
    ],
    draftMessage:
      'Hello,\n\nThank you for sharing the agreement. Before signing, could we clarify two items in writing: (1) mutual notice-period alignment in the termination clause, and (2) an explicit carve-out for pre-existing personal tools and prior work in the IP section?\n\nBest regards,',
  },
  payment_dispute: {
    title: 'Unverified or Already-Initiated Payment',
    summary:
      'If a transfer was already made to an unverified account or appears unauthorized, rapid bank and cyber-portal reporting preserves recovery windows.',
    checklist: [
      'Contact your bank’s official fraud/dispute helpline immediately with the UTR / transaction ID.',
      'Request a freeze or chargeback reference number in writing.',
      'Do not pay secondary "refund verification" or "release fee" requests.',
    ],
    preservationSteps: [
      'Save bank/UPI transaction receipts showing UTR number, timestamp, and beneficiary handle.',
      'Archive all messages, call logs, and invoices connected to the request.',
    ],
    draftMessage:
      'Hello,\n\nI am writing to formally request verification and reversal details for transaction reference [UTR / Reference ID] dated [Date]. Please provide an official GST/tax invoice on company letterhead and corporate bank confirmation within 24 hours.',
  },
  impersonation: {
    title: 'Suspected Brand or Bank Impersonation',
    summary:
      'Urgent KYC suspension notices, shortened links, or unofficial sender addresses warrant direct verification inside the official app or website.',
    checklist: [
      'Never click shortened links or submit OTPs, PINs, or PAN/KYC documents in chat forms.',
      'Open your bank or service provider’s official app independently to check account status.',
      'Verify sender domain spelling character-by-character against the official site.',
    ],
    preservationSteps: [
      'Capture the full SMS sender ID, email headers ("Show Original"), and exact URL without visiting it.',
    ],
    draftMessage:
      'Hello Support Team,\n\nI received a message claiming to be from your organization requesting urgent account verification via an external link. Could you please confirm through your official support channel whether this notice is authentic?',
  },
};

const REFERENCE_CHANNELS = [
  {
    name: 'National Cyber Crime Reporting Portal (India)',
    detail: 'cybercrime.gov.in · Helpline 1930 (Financial cyber fraud rapid reporting)',
    url: 'https://cybercrime.gov.in',
  },
  {
    name: 'CERT-In (Indian Computer Emergency Response Team)',
    detail: 'cert-in.org.in · Phishing and cybersecurity incident reporting',
    url: 'https://www.cert-in.org.in',
  },
  {
    name: 'National Consumer Helpline',
    detail: 'consumerhelpline.gov.in · 1915 (Consumer & fee dispute assistance)',
    url: 'https://consumerhelpline.gov.in',
  },
];

export function DigitalRightsAssistant({ latestReport }: DigitalRightsAssistantProps) {
  const [situation, setSituation] = useState<SituationKey>('job_fee');
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const guide = SITUATION_GUIDES[situation];
  const activeDraft = latestReport?.clarificationDraft || guide.draftMessage;
  const checklistItems =
    latestReport && latestReport.verificationQuestions.length > 0 && situation === 'job_fee'
      ? [...latestReport.verificationQuestions, ...guide.checklist].slice(0, 6)
      : guide.checklist;

  const toggleStep = (key: string) => {
    setCheckedSteps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-blue-400 font-medium">Verification & Protection Playbook</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">Digital Rights Assistant</h1>
        <p className="text-sm text-slate-400 mt-1">
          Practical verification checklists, polite clarification templates, and evidence preservation steps.
        </p>
      </div>

      {/* Context Banner if coming from an active report */}
      {latestReport && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4 text-xs sm:text-sm text-slate-200 flex items-start gap-3">
          <Scale className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <span className="font-semibold text-white">Loaded Context: </span>
            <span>
              {latestReport.title} ({latestReport.contradictions.length} contradiction(s),{' '}
              {latestReport.indicators.length} indicator(s)). Checklist and draft below incorporate your latest findings.
            </span>
          </div>
        </div>
      )}

      {/* Situation Switcher */}
      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-xl bg-[#0B1221] border border-slate-800">
        {(
          [
            ['job_fee', 'Upfront Job Fee'],
            ['contract_clause', 'Contract Clauses'],
            ['payment_dispute', 'Payment Verification'],
            ['impersonation', 'Impersonation / KYC'],
          ] as Array<[SituationKey, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSituation(key)}
            className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              situation === key
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main Playbook Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Checklist */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-[#0B1221] p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-white">{guide.title}</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">{guide.summary}</p>
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-xs font-medium text-slate-300">Actionable Verification Checklist</p>
            {checklistItems.map((step, idx) => {
              const key = `${situation}_${idx}`;
              const checked = Boolean(checkedSteps[key]);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleStep(key)}
                  className="w-full min-h-[48px] text-left rounded-xl border border-slate-800 bg-[#060911] hover:border-slate-700 p-3.5 flex items-start gap-3 transition-colors cursor-pointer"
                >
                  {checked ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  <span
                    className={`text-xs sm:text-sm leading-relaxed ${
                      checked ? 'line-through text-slate-500' : 'text-slate-200'
                    }`}
                  >
                    {step}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <p className="text-xs font-medium text-slate-300">Evidence Preservation Steps</p>
            <ul className="space-y-1.5 text-xs text-slate-400 list-disc pl-5">
              {guide.preservationSteps.map((p, i) => (
                <li key={i} className="leading-relaxed">
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Clarification Message Composer & Reference Directory */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-[#0B1221] p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">Polite Clarification Message</h3>
              <button
                type="button"
                onClick={handleCopy}
                className="min-h-[36px] px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-medium text-white inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <ClipboardCopy className="w-3.5 h-3.5" aria-hidden="true" />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Send via official corporate email rather than unverified chat threads.
            </p>
            <pre className="text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed bg-[#060911] border border-slate-800/90 rounded-xl p-3.5">
              {activeDraft}
            </pre>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0B1221] p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">Official Reference Directory</h3>
            <div className="space-y-2.5">
              {REFERENCE_CHANNELS.map((ch) => (
                <a
                  key={ch.name}
                  href={ch.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-slate-800 bg-[#060911] hover:border-slate-700 p-3 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-medium text-blue-400">
                    <span>{ch.name}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{ch.detail}</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DisclaimerBanner />
    </div>
  );
}
