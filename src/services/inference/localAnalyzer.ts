import { PRELIMINARY_DISCLAIMER } from '../../data/presets';
import type {
  AnalysisReport,
  ClaimCategory,
  ContradictionLink,
  ContractClauseFinding,
  EvidenceItem,
  ExtractedClaim,
  ModuleId,
  RiskIndicator,
  VerificationPriority,
} from '../../types/lexi';

// Unique, non-duplicated regex patterns
const EMPLOYER_COMPENSATION_RE =
  /\b(?:ctc|per\s+annum|annual\s+(?:gross\s+)?salary|compensation\s+is|salary\s+of|package\s+of|stipend\s+of|payable\s+monthly|client\s+will\s+pay)\b/i;

const CANDIDATE_FEE_TERMS_RE =
  /\b(?:training|registration|verification|processing|onboarding|kit|security|portal|assessment)\s+(?:&+\s*\w+\s+)*(?:fee|deposit|charge|token)\b/i;

const CANDIDATE_REMIT_RE =
  /\b(?:candidate|applicant|employee|contractor)\s+(?:agrees\s+to\s+|shall\s+|must\s+)?(?:remit|pay|transfer|purchase)\b|\b(?:remit|pay|transfer)\s+(?:the\s+|a\s+)?(?:mandatory\s+|refundable\s+)?(?:₹|rs\.?|inr|\$|usd)\s*[\d,]+/i;

const FEE_WAIVER_RE =
  /\b(no\s+(?:registration|application|training|processing|onboarding|upfront)\s+fee|zero\s+fee|no\s+fee\s+(?:is\s+)?required|never\s+charges?\s+fees?|no\s+security\s+deposit|free\s+of\s+cost)\b/i;

const CURRENCY_AMOUNT_RE = /(?:₹|rs\.?|inr|\$|usd)\s*[\d,]+(?:\.\d{1,2})?/i;

const PERSONAL_UPI_RE =
  /\b([a-z0-9._-]+@(?:okaxis|okicici|oksbi|okhdfcbank|ybl|paytm|ibl|axl|apl|upi))\b/i;

const DEADLINE_PHRASE_RE =
  /\b(within\s+\d+\s*(?:hour|hr|minute|min|day)s?|before\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)(?:\s+today)?|closes?\s+(?:at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)(?:\s+today)?|in\s+\d+\s*(?:hour|hr|minute|min)s?)|by\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)\s+today)\b/i;

const URGENCY_TONE_RE =
  /\b(immediately|right\s+away|urgent(?:ly)?|voids?\s+provisional|slot\s+will\s+expire|act\s+now|asap)\b/i;

const SECRECY_OR_BYPASS_RE =
  /\b(do\s+not\s+(?:email|contact|discuss|disclose)|keep\s+this\s+confidential|do\s+not\s+share\s+with\s+hr|avoid\s+the\s+portal)\b/i;

const SUSPICIOUS_LINK_RE =
  /(https?:\/\/(?:bit\.ly|tinyurl\.com|t\.co|rb\.gy|cutt\.ly)\/\S+|http:\/\/\S+)/i;

const PERSONAL_EMAIL_RE = /\b[a-z0-9._%+-]+@(?:gmail\.com|yahoo\.com|hotmail\.com|outlook\.com)\b/i;

const BOND_OR_PENALTY_RE =
  /\b(mandatory\s+bond|\d+[- ]month\s+bond|liquidated\s+damages|reimbursement\s+of\s+(?:₹|rs\.?|inr|\$)?[\d,]+)\b/i;

const ASYMMETRIC_TERMINATION_RE =
  /\b(terminate\s+(?:engagement\s+)?immediately\s+without\s+notice|sole\s+(?:management\s+)?discretion)\b/i;

const ARBITRATION_GOVERNANCE_RE =
  /\b(arbitration\s+appointed\s+solely\s+by(?:\s+the\s+company)?|unilateral\s+arbitration|disputes\s+shall\s+be\s+governed\s+exclusively\s+by\s+arbitration)\b/i;

const BROAD_IP_RE =
  /\b(pre-existing\s+code|background\s+tools|worldwide\s+in\s+perpetuity|all\s+concepts\s+created\s+before)\b/i;

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?\n])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isEmployerCompensationSentence(sentence: string): boolean {
  return EMPLOYER_COMPENSATION_RE.test(sentence) && !CANDIDATE_FEE_TERMS_RE.test(sentence);
}

function isCandidateFeeSentence(sentence: string): boolean {
  if (FEE_WAIVER_RE.test(sentence)) return false;
  if (isEmployerCompensationSentence(sentence)) return false;
  return CANDIDATE_FEE_TERMS_RE.test(sentence) || CANDIDATE_REMIT_RE.test(sentence);
}

function extractMatchingSentence(
  text: string,
  predicate: (sentence: string) => boolean,
  fallbackRegex?: RegExp
): string {
  const sentences = splitSentences(text);
  for (const s of sentences) {
    if (predicate(s)) {
      return s.slice(0, 240);
    }
  }
  if (fallbackRegex) {
    const match = text.match(fallbackRegex);
    if (match) return match[0].trim();
  }
  return text.slice(0, 160).trim();
}

function extractDeadlineToken(text: string): string | null {
  const match = text.match(DEADLINE_PHRASE_RE);
  return match ? match[0].trim().toLowerCase() : null;
}

function extractClaimsFromItem(item: EvidenceItem): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];
  const text = item.content || '';
  const sentences = splitSentences(text);
  let idx = 1;

  const pushClaim = (
    category: ClaimCategory,
    statement: string,
    exactQuote: string,
    polarity: ExtractedClaim['polarity']
  ) => {
    claims.push({
      id: `${item.id}_cl_${idx++}`,
      documentId: item.id,
      documentTitle: item.title,
      documentType: item.type,
      category,
      statement,
      exactQuote,
      polarity,
    });
  };

  // 1. Employer-paid compensation (never treated as a candidate payment demand)
  const compSentence = sentences.find((s) => isEmployerCompensationSentence(s));
  if (compSentence) {
    const compAmount = compSentence.match(CURRENCY_AMOUNT_RE)?.[0];
    pushClaim(
      'compensation',
      compAmount
        ? `States employer-paid compensation (${compAmount}).`
        : 'States employer-paid salary or compensation terms.',
      compSentence.slice(0, 240),
      'promise'
    );
  }

  // 2. Fee waiver statement
  const waiverSentence = sentences.find((s) => FEE_WAIVER_RE.test(s));
  if (waiverSentence) {
    pushClaim(
      'fee_waiver',
      'States that no registration, deposit, or upfront fee is required.',
      waiverSentence.slice(0, 240),
      'promise'
    );
  }

  // 3. Candidate-paid upfront fee demand (strictly excludes employer compensation sentences)
  const feeSentence = sentences.find((s) => isCandidateFeeSentence(s));
  if (feeSentence) {
    const amount =
      feeSentence.match(CURRENCY_AMOUNT_RE)?.[0] ||
      item.metadata?.requestedAmount ||
      'a specified fee';
    pushClaim(
      'fee_demand',
      `Requests candidate remittance (${amount}) tied to training, registration, or verification.`,
      feeSentence.slice(0, 240),
      'demand'
    );
  }

  // 4. Consumer / personal UPI payment handle
  const upiSentence = sentences.find((s) => PERSONAL_UPI_RE.test(s));
  const upiMatch =
    (upiSentence && upiSentence.match(PERSONAL_UPI_RE)) ||
    text.match(PERSONAL_UPI_RE) ||
    item.metadata?.paymentHandle?.match(PERSONAL_UPI_RE);
  if (upiMatch) {
    pushClaim(
      'payment_channel',
      `Directs payment to an individual/consumer UPI handle (${upiMatch[1]}).`,
      upiSentence ? upiSentence.slice(0, 240) : `Handle: ${upiMatch[1]}`,
      'demand'
    );
  }

  // 5. Explicit deadline / time cutoff (only when the document actually contains one)
  const deadlineSentence = sentences.find((s) => DEADLINE_PHRASE_RE.test(s));
  if (deadlineSentence) {
    const token = extractDeadlineToken(deadlineSentence);
    pushClaim(
      'timeline',
      token
        ? `Sets a payment or response deadline (${token}).`
        : 'Sets an explicit payment or onboarding cutoff.',
      deadlineSentence.slice(0, 240),
      'restriction'
    );
  } else {
    const urgencySentence = sentences.find((s) => URGENCY_TONE_RE.test(s));
    if (urgencySentence) {
      pushClaim(
        'urgency',
        'Uses immediate action or slot-expiration language.',
        urgencySentence.slice(0, 240),
        'restriction'
      );
    }
  }

  // 6. Channel secrecy / bypass
  const secrecySentence = sentences.find((s) => SECRECY_OR_BYPASS_RE.test(s));
  if (secrecySentence) {
    pushClaim(
      'identity',
      'Advises bypassing official channels or restricts disclosure of terms.',
      secrecySentence.slice(0, 240),
      'restriction'
    );
  }

  // 7. Legal governance / unilateral arbitration (separated from payment/fee risk)
  const arbitrationSentence = sentences.find((s) => ARBITRATION_GOVERNANCE_RE.test(s));
  if (arbitrationSentence) {
    pushClaim(
      'governance',
      'Assigns dispute governance to unilateral company-appointed arbitration.',
      arbitrationSentence.slice(0, 240),
      'restriction'
    );
  }

  // 8. Employment bond / asymmetric termination
  const terminationSentence = sentences.find(
    (s) => BOND_OR_PENALTY_RE.test(s) || ASYMMETRIC_TERMINATION_RE.test(s)
  );
  if (terminationSentence) {
    pushClaim(
      'termination',
      'Contains unilateral termination, sole-discretion refund, or financial bond terms.',
      terminationSentence.slice(0, 240),
      'restriction'
    );
  }

  if (claims.length === 0 && text.trim().length > 0) {
    pushClaim(
      'obligation',
      'General statement recorded for cross-document reference.',
      text.trim().slice(0, 180),
      'neutral'
    );
  }

  return claims;
}

export function runLocalDeterministicAnalysis(
  mode: Exclude<ModuleId, 'dashboard' | 'vault'>,
  items: EvidenceItem[]
): AnalysisReport {
  const allClaims = items.flatMap(extractClaimsFromItem);
  const contradictions: ContradictionLink[] = [];
  const indicators: RiskIndicator[] = [];
  const contractFindings: ContractClauseFinding[] = [];
  const verificationQuestions: string[] = [];

  const waiverClaims = allClaims.filter((c) => c.category === 'fee_waiver');
  const demandClaims = allClaims.filter((c) => c.category === 'fee_demand');
  const timelineClaims = allClaims.filter((c) => c.category === 'timeline');

  let contradictionSeq = 1;
  const seenConflictPairs = new Set<string>();

  const pushContradiction = (entry: Omit<ContradictionLink, 'id'>) => {
    const pairKey = [entry.docAId, entry.docBId].sort().join('::') + '::' + entry.conflictType;
    if (seenConflictPairs.has(pairKey)) return;
    seenConflictPairs.add(pairKey);
    contradictions.push({
      id: `cnt_${contradictionSeq++}`,
      ...entry,
    });
  };

  // 1. Direct Cross-Document Contradictions: Fee Policy (No-Fee Offer vs Fee Demand)
  for (const waiver of waiverClaims) {
    for (const demand of demandClaims) {
      if (waiver.documentId !== demand.documentId) {
        pushContradiction({
          claimAId: waiver.id,
          claimBId: demand.id,
          docAId: waiver.documentId,
          docBId: demand.documentId,
          docATitle: waiver.documentTitle,
          docBTitle: demand.documentTitle,
          quoteA: waiver.exactQuote,
          quoteB: demand.exactQuote,
          conflictType: 'Fee Policy Contradiction',
          explanation: `"${waiver.documentTitle}" states no registration or upfront fee is required, whereas "${demand.documentTitle}" demands an upfront payment before onboarding.`,
          severity: 'high',
          verificationQuestion:
            'Why does this document or message demand an upfront fee when the official offer letter states no registration or onboarding charges apply?',
        });
      }
    }
  }

  // 2. Direct Cross-Document Contradictions: Conflicting Payment / Response Deadlines
  // Only compare documents that BOTH actually state an explicit deadline (never include docs with no deadline).
  for (let i = 0; i < timelineClaims.length; i++) {
    for (let j = i + 1; j < timelineClaims.length; j++) {
      const a = timelineClaims[i];
      const b = timelineClaims[j];
      if (a.documentId === b.documentId) continue;

      const tokenA = extractDeadlineToken(a.exactQuote);
      const tokenB = extractDeadlineToken(b.exactQuote);
      if (tokenA && tokenB && tokenA !== tokenB) {
        pushContradiction({
          claimAId: a.id,
          claimBId: b.id,
          docAId: a.documentId,
          docBId: b.documentId,
          docATitle: a.documentTitle,
          docBTitle: b.documentTitle,
          quoteA: a.exactQuote,
          quoteB: b.exactQuote,
          conflictType: 'Conflicting Payment Deadlines',
          explanation: `"${a.documentTitle}" specifies "${tokenA}", whereas "${b.documentTitle}" imposes a shorter or conflicting cutoff ("${tokenB}").`,
          severity: 'moderate',
          verificationQuestion:
            'Why do the written agreement and the chat message state different payment deadlines?',
        });
      }
    }
  }

  // 3. Single-Document & Pattern Verification Signals (kept strictly separate from Contradictions)
  let indSeq = 1;
  for (const item of items) {
    const text = item.content || '';
    const sentences = splitSentences(text);

    const upi = text.match(PERSONAL_UPI_RE) || item.metadata?.paymentHandle?.match(PERSONAL_UPI_RE);
    if (upi) {
      indicators.push({
        id: `ind_${indSeq++}`,
        title: `Personal-Style UPI Handle Detected (${upi[1]})`,
        category: 'Payment Channel',
        level: 'high',
        summary:
          'Consumer UPI suffixes (@okaxis, @ybl, @paytm, @okicici) typically map to individual bank accounts rather than audited corporate merchant gateways.',
        evidenceQuote: extractMatchingSentence(
          text,
          (s) => PERSONAL_UPI_RE.test(s),
          PERSONAL_UPI_RE
        ),
        recommendedCheck:
          'Verify the registered beneficiary legal name in your banking app and confirm via the company’s official website contact.',
      });
    }

    const feeSentence = sentences.find((s) => isCandidateFeeSentence(s));
    if (feeSentence) {
      indicators.push({
        id: `ind_${indSeq++}`,
        title: 'Upfront Training, Registration, or Verification Fee',
        category: 'Fee Structure',
        level: 'high',
        summary:
          'Requesting candidate payment prior to employment, orientation, or ID issuance warrants direct confirmation with official corporate HR.',
        evidenceQuote: feeSentence.slice(0, 240),
        recommendedCheck:
          'Confirm directly with an independently sourced official phone number or career portal whether any candidate payment is ever collected.',
      });
    }

    const urgencySentence = sentences.find(
      (s) => DEADLINE_PHRASE_RE.test(s) || URGENCY_TONE_RE.test(s)
    );
    if (urgencySentence) {
      indicators.push({
        id: `ind_${indSeq++}`,
        title: 'Time-Compressed Decision Pressure',
        category: 'Behavioral Pressure',
        level: 'moderate',
        summary:
          'Short payment cutoffs ("today before 5 PM", "within 24 hours") discourage recipients from pausing to verify documents through official channels.',
        evidenceQuote: urgencySentence.slice(0, 240),
        recommendedCheck:
          'Pause payment until you have independently verified the request through a known official channel, regardless of stated urgency.',
      });
    }

    const arbSentence = sentences.find((s) => ARBITRATION_GOVERNANCE_RE.test(s));
    if (arbSentence) {
      indicators.push({
        id: `ind_${indSeq++}`,
        title: 'Unilateral Arbitration / Dispute Governance Clause',
        category: 'Governance & Dispute Resolution',
        level: 'moderate',
        summary:
          'Disputes are routed exclusively to arbitration appointed solely by one party, limiting neutral third-party dispute options.',
        evidenceQuote: arbSentence.slice(0, 240),
        recommendedCheck:
          'Ask whether dispute resolution can specify a mutually agreed or neutral statutory forum rather than sole-party appointment.',
      });
    }

    if (SECRECY_OR_BYPASS_RE.test(text)) {
      indicators.push({
        id: `ind_${indSeq++}`,
        title: 'Channel Bypass or Non-Disclosure Instruction',
        category: 'Communication Channel',
        level: 'high',
        summary:
          'Instructions discouraging you from contacting the main portal or HR team prevent standard verification.',
        evidenceQuote: extractMatchingSentence(
          text,
          (s) => SECRECY_OR_BYPASS_RE.test(s),
          SECRECY_OR_BYPASS_RE
        ),
        recommendedCheck:
          'Contact the official corporate HR or support address listed on the organization’s primary domain directly.',
      });
    }

    if (SUSPICIOUS_LINK_RE.test(text)) {
      indicators.push({
        id: `ind_${indSeq++}`,
        title: 'Shortened or Unencrypted URL Present',
        category: 'Link Hygiene',
        level: 'high',
        summary:
          'URL shorteners or plain HTTP links obscure the true destination domain and do not demonstrate verified organizational ownership.',
        evidenceQuote: extractMatchingSentence(
          text,
          (s) => SUSPICIOUS_LINK_RE.test(s),
          SUSPICIOUS_LINK_RE
        ),
        recommendedCheck:
          'Do not enter credentials or KYC details via shortened links; navigate manually to the official service domain.',
      });
    }

    if (PERSONAL_EMAIL_RE.test(text) || PERSONAL_EMAIL_RE.test(item.sourceLabel)) {
      const combined = `${item.sourceLabel} ${text}`;
      indicators.push({
        id: `ind_${indSeq++}`,
        title: 'Free Webmail Domain Used in Formal Context',
        category: 'Sender Identity',
        level: 'moderate',
        summary:
          'Official recruitment or financial notices typically originate from an organization’s owned domain rather than public webmail.',
        evidenceQuote: extractMatchingSentence(
          combined,
          (s) => PERSONAL_EMAIL_RE.test(s),
          PERSONAL_EMAIL_RE
        ),
        recommendedCheck:
          'Cross-check sender identity against the organization’s official website or LinkedIn company page.',
      });
    }

    // Contract-specific findings
    if (item.type === 'contract' || mode === 'contracts') {
      if (BOND_OR_PENALTY_RE.test(text)) {
        contractFindings.push({
          id: `cf_${contractFindings.length + 1}`,
          clauseTopic: 'Employment Bond & Liquidated Damages',
          level: 'high',
          excerpt: extractMatchingSentence(text, (s) => BOND_OR_PENALTY_RE.test(s), BOND_OR_PENALTY_RE),
          plainExplanation:
            'Imposes a multi-month lock-in with a fixed monetary penalty upon early exit. Enforceability varies by jurisdiction and actual training cost.',
          clarificationPrompt:
            'Please provide a breakdown of actual training expenses and clarify conditions under which notice-period exit is permitted without penalty.',
        });
      }
      if (ASYMMETRIC_TERMINATION_RE.test(text)) {
        contractFindings.push({
          id: `cf_${contractFindings.length + 1}`,
          clauseTopic: 'Asymmetric Termination / Sole Discretion',
          level: 'high',
          excerpt: extractMatchingSentence(
            text,
            (s) => ASYMMETRIC_TERMINATION_RE.test(s),
            ASYMMETRIC_TERMINATION_RE
          ),
          plainExplanation:
            'Grants one party immediate termination or sole-discretion refund control without reciprocal notice.',
          clarificationPrompt:
            'Can this clause be balanced with mutual notice periods and an objective refund timeline?',
        });
      }
      if (arbSentence) {
        contractFindings.push({
          id: `cf_${contractFindings.length + 1}`,
          clauseTopic: 'Unilateral Arbitration & Dispute Governance',
          level: 'moderate',
          excerpt: arbSentence.slice(0, 240),
          plainExplanation:
            'Requires disputes to be governed by arbitration appointed solely by the Company rather than mutual or neutral selection.',
          clarificationPrompt:
            'Request neutral arbitrator appointment under mutually agreed institutional rules.',
        });
      }
      if (BROAD_IP_RE.test(text)) {
        contractFindings.push({
          id: `cf_${contractFindings.length + 1}`,
          clauseTopic: 'Broad Pre-Existing IP Assignment',
          level: 'moderate',
          excerpt: extractMatchingSentence(text, (s) => BROAD_IP_RE.test(s), BROAD_IP_RE),
          plainExplanation:
            'Language may extend IP transfer beyond project deliverables to pre-existing personal tools or libraries.',
          clarificationPrompt:
            'Request a written carve-out excluding prior inventions and general-purpose personal tools from IP assignment.',
        });
      }
    }
  }

  // Deduplicate indicators by title
  const uniqueIndicators = indicators.filter(
    (ind, i, arr) => arr.findIndex((x) => x.title === ind.title) === i
  );

  for (const c of contradictions) {
    if (!verificationQuestions.includes(c.verificationQuestion)) {
      verificationQuestions.push(c.verificationQuestion);
    }
  }
  for (const ind of uniqueIndicators) {
    if (!verificationQuestions.includes(ind.recommendedCheck)) {
      verificationQuestions.push(ind.recommendedCheck);
    }
  }
  if (verificationQuestions.length === 0) {
    verificationQuestions.push(
      'Verify the sender through an independently obtained official phone number or corporate email domain before sharing documents or funds.'
    );
  }

  const hasHigh =
    contradictions.some((c) => c.severity === 'high') ||
    uniqueIndicators.some((i) => i.level === 'high') ||
    contractFindings.some((f) => f.level === 'high');
  const hasModerate =
    contradictions.length > 0 || uniqueIndicators.length > 0 || contractFindings.length > 0;

  const overallPriority: VerificationPriority = hasHigh
    ? 'high'
    : hasModerate
      ? 'moderate'
      : 'low';

  const executiveSummary =
    contradictions.length > 0
      ? `Cross-document inspection identified ${contradictions.length} direct contradiction(s) and ${uniqueIndicators.length} verification signal(s) across ${items.length} item(s). Pause financial transfers or signatures until the conflicting fee, deadline, and payment-channel statements are verified through an official corporate channel.`
      : uniqueIndicators.length > 0
        ? `Inspection flagged ${uniqueIndicators.length} verification signal(s) across ${items.length} item(s). Review the highlighted excerpts and confirm beneficiary and sender identity independently.`
        : `No high-risk pattern rules matched the submitted text across ${items.length} item(s). Continue standard independent verification of sender identity and payment details before proceeding.`;

  const orgName =
    items.find((i) => i.metadata?.organizationName)?.metadata?.organizationName || 'the organization';

  const clarificationDraft = `Hello,\n\nThank you for sharing the details regarding ${orgName}. Before I proceed with any onboarding paperwork or remittance, could you please confirm the following via an official corporate email address:\n\n1. Whether any upfront training or verification fee applies, given the offer terms.\n2. An official corporate invoice and company-owned bank or merchant payment portal rather than an individual handle.\n3. Confirmation of the revised timeline and dispute-resolution terms so compliance review can finish.\n\nThank you for your assistance.`;

  return {
    id: `rep_local_${Date.now()}`,
    mode,
    title:
      items.length > 1
        ? `PromiseGraph Cross-Check (${items.length} items)`
        : `${items[0]?.title || 'Evidence'} Verification`,
    engineUsed: 'local-deterministic',
    engineLabel: 'Local Rule-Based Verification (Deterministic)',
    inferencePath: 'local-deterministic',
    inferencePathLabel: 'Local Deterministic Rule Engine',
    timestamp: new Date().toISOString(),
    overallPriority,
    executiveSummary,
    sourceDocumentIds: items.map((i) => i.id),
    extractedClaims: allClaims,
    contradictions,
    indicators: uniqueIndicators,
    contractFindings: contractFindings.length > 0 ? contractFindings : undefined,
    verificationQuestions,
    clarificationDraft,
    disclaimer: PRELIMINARY_DISCLAIMER,
  };
}
