import type { EvidenceItem } from '../types/lexi';

export const PRELIMINARY_DISCLAIMER =
  'Preliminary verification aid only: LEXI-SHIELD surfaces textual inconsistencies, unusual payment channels, and clauses that warrant independent human verification. Results do not constitute legal advice or establish guilt.';

export const FLAGSHIP_PROMISEGRAPH_ITEMS: EvidenceItem[] = [
  {
    id: 'ev_offer_1',
    title: 'Provisional Employment Offer Letter',
    type: 'job_offer',
    sourceLabel: 'Email attachment · careers@meridian-tech-example.com',
    content:
      'Dear Candidate, we are pleased to extend a provisional offer for the Junior Systems Analyst role at Meridian Core Technologies. Compensation is ₹6,40,000 CTC per annum. Official Policy Notice: No registration fee, security deposit, or upfront onboarding charge is required from any applicant during recruitment.',
    createdAt: '2026-11-19T09:15:00.000Z',
    updatedAt: '2026-11-19T09:15:00.000Z',
    includedInGraph: true,
    metadata: {
      organizationName: 'Meridian Core Technologies',
    },
  },
  {
    id: 'ev_contract_2',
    title: 'Training & Onboarding Addendum (Clause 4.2)',
    type: 'contract',
    sourceLabel: 'PDF Document · Onboarding_Terms_v3.pdf',
    content:
      'Clause 4.2 — Orientation & Kit Provisioning: Prior to system provisioning and orientation, the candidate agrees to remit a mandatory Training & Verification Fee of ₹4,999. Failure to complete remittance within 24 hours voids provisional allocation. Disputes shall be governed exclusively by arbitration appointed solely by the Company.',
    createdAt: '2026-11-19T14:20:00.000Z',
    updatedAt: '2026-11-19T14:20:00.000Z',
    includedInGraph: true,
    metadata: {
      organizationName: 'Meridian Core Technologies',
      requestedAmount: '₹4,999',
    },
  },
  {
    id: 'ev_msg_3',
    title: 'Recruiter WhatsApp Payment Request',
    type: 'message',
    sourceLabel: 'WhatsApp · +91-98XXX-41209 (Rahul V. — HR Desk)',
    content:
      'Congratulations on clearing the final round! Your joining batch closes at 5:00 PM today. Please pay the ₹4,999 training fee immediately via UPI to my HR verification handle rahul.hr.verify@okaxis and send the transaction screenshot here right away so I can issue your employee ID.',
    createdAt: '2026-11-20T05:10:00.000Z',
    updatedAt: '2026-11-20T05:10:00.000Z',
    includedInGraph: true,
    metadata: {
      payeeName: 'Rahul V.',
      paymentHandle: 'rahul.hr.verify@okaxis',
      requestedAmount: '₹4,999',
      organizationName: 'Meridian Core Technologies',
    },
  },
];

export const SCANNER_PRESETS: Array<{
  id: string;
  label: string;
  sourceLabel: string;
  text: string;
}> = [
  {
    id: 'preset_recruiter_upi',
    label: 'Recruiter Fee & Personal UPI',
    sourceLabel: 'WhatsApp · Unverified HR Contact',
    text: 'Urgent update regarding your analyst interview: Your offer letter is ready, however HR policy requires a refundable ₹4,999 background & training fee before 5:00 PM today. Transfer via UPI to rahul.hr.verify@okaxis and reply with UTR. Do not email the careers portal as batch slots close in 2 hours.',
  },
  {
    id: 'preset_kyc_alert',
    label: 'Account Suspension KYC Link',
    sourceLabel: 'SMS · Sender VM-ALERTX',
    text: 'Dear Customer, your bank account will be restricted within 3 hours due to incomplete e-KYC verification. Update PAN details immediately at http://bit.ly/verify-kyc-portal-now or pay a ₹10 verification token to avoid suspension.',
  },
  {
    id: 'preset_legit_interview',
    label: 'Standard Corporate Interview Invite',
    sourceLabel: 'Email · talent@acme-robotics.com',
    text: 'Hello, thank you for applying for the Embedded QA role. Please join our panel interview on Tuesday at 11:00 AM IST via the calendar link attached. Note that our organization never charges fees for interviews, equipment, or background checks.',
  },
];

export const CONTRACT_PRESETS: Array<{
  id: string;
  label: string;
  title: string;
  text: string;
}> = [
  {
    id: 'contract_training_bond',
    label: 'Training Fee & Unilateral Bond',
    title: 'Employment Onboarding Agreement',
    text: '1. Compensation: Annual gross salary of ₹5,50,000 payable monthly.\n2. Training Deposit: Candidate shall remit ₹4,999 prior to Day 1 orientation for training kit provisioning; refund eligibility is at sole management discretion after 180 days.\n3. Lock-In & Liquidated Damages: Employee agrees to a 24-month mandatory bond. Early resignation requires reimbursement of ₹1,50,000 within 7 days.\n4. Termination: Company may terminate engagement immediately without notice or severance, whereas Employee must serve 90 days notice.\n5. Confidentiality: Employee shall not disclose fee schedules or onboarding terms to external parties.',
  },
  {
    id: 'contract_freelance_ip',
    label: 'Freelance Scope & IP Assignment',
    title: 'Independent Contractor MSA',
    text: '1. Fees & Payment: Client will pay ₹85,000 within 45 days of final acceptance, with Client holding sole discretion to reject deliverables without partial payment.\n2. Advance Tooling Fee: Contractor must purchase proprietary portal access for ₹3,200 through the coordinator link prior to kickoff.\n3. Intellectual Property: All background tools, pre-existing code libraries, and concepts created before or during engagement transfer exclusively to Client worldwide in perpetuity.',
  },
];

export const PAYMENT_PRESETS: Array<{
  id: string;
  label: string;
  payeeName: string;
  paymentHandle: string;
  requestedAmount: string;
  organizationName: string;
  purpose: string;
  rawText: string;
}> = [
  {
    id: 'pay_personal_upi',
    label: 'Personal UPI for Corporate Fee',
    payeeName: 'Rahul Verma',
    paymentHandle: 'rahul.hr.verify@okaxis',
    requestedAmount: '₹4,999',
    organizationName: 'Meridian Core Technologies',
    purpose: 'Mandatory Training & Verification Fee',
    rawText:
      'Pay ₹4,999 before 5:00 PM today to rahul.hr.verify@okaxis to confirm your Meridian Core onboarding batch.',
  },
  {
    id: 'pay_escrow_advance',
    label: 'Refundable Verification Deposit',
    payeeName: 'Global Trade Clearing',
    paymentHandle: 'clear.desk88@ybl',
    requestedAmount: '₹12,500',
    organizationName: 'Apex Logistics Ltd',
    purpose: 'Refundable Customs Release Verification Token',
    rawText:
      'Your parcel clearance requires a refundable ₹12,500 token transfer via PhonePe/UPI to clear.desk88@ybl within 60 minutes.',
  },
];
