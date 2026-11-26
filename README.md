# 🛡️ LEXI-SHIELD — PROMISEGRAPH

**One Promise, Multiple Documents. One Hybrid Intelligence System.**  
*Built for the Google #BuildHybridAI 2026 Global Hackathon*

- 🌐 **Live Hosted App:** [https://ai.studio](https://ai.studio)
- 💻 **GitHub Repository:** [https://github.com](https://github.com)
- 📜 **License:** Apache License 2.0

---

## 🔍 Overview & Problem Solved
Job seekers, freelancers, students, and everyday consumers often receive conflicting claims across multiple channels—such as an official offer letter promising **"no registration or upfront fees"**, an onboarding addendum demanding a **₹4,999 training fee within 24 hours**, and a WhatsApp message demanding immediate UPI payment to a personal handle (`@okaxis`) before **5:00 PM**.

**LEXI-SHIELD — PROMISEGRAPH** solves this by linking claims across documents, exposing cross-document contradictions, flagging high-priority payment-channel and governance risks, and generating neutral verification questions—without rendering legal advice or accusatory labels.

---

## ⚡ Hybrid AI Architecture (Firebase AI Logic + Local Deterministic Engine)
1. **Tier 1 — On-Device Inference (`PREFER_ON_DEVICE`):** Uses Firebase AI Logic (`firebase/ai`) to attempt low-latency, privacy-preserving on-device inference (Chrome Prompt API / Gemini Nano) so sensitive contracts stay local whenever supported.
2. **Tier 2 — Seamless Cloud Escalation (`gemini-2.5-flash`):** Automatically falls back to Firebase AI Logic Cloud (`GoogleAIBackend` with `gemini-2.5-flash`) for multi-document semantic reasoning.
3. **Tier 3 — Deterministic Offline Rule Engine:** Guarantees 100% uptime, zero-latency fallback, and predictable structured contradiction detection even offline.
4. **Cloud Firestore + Local Vault Sync:** Saves verified cross-document reports and JSON audit exports locally and to Cloud Firestore (`lexi-shield-promisegraph`).

---

## 🧩 Core Workspaces
1. **PROMISEGRAPH (Cross-Document Intelligence):** Extracts claims (`Promise / Waiver`, `Payment / Fee Demand`, `Restriction / Pressure`), builds a visual Evidence Topology graph, and detects cross-document contradictions (`Fee Policy Contradiction`, `Conflicting Payment Deadlines`) plus `Governance & Dispute Resolution` signals.
2. **Smart Scam Scanner:** Multi-channel message & screenshot risk triage.
3. **Contract Intelligence:** Clause-by-clause lock-in, unilateral arbitration, and indemnity inspection.
4. **Payment Risk Analyzer:** Personal UPI handle vs. corporate gateway verification.
5. **Digital Rights Assistant:** Privacy, data-sharing, and consent audit.
6. **Evidence Vault:** Persistent report storage, inspection, reopening in PromiseGraph, and JSON export.

---

## 🛠️ Tech Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Hybrid AI & Cloud:** Firebase SDK (`firebase/ai` with `PREFER_ON_DEVICE`, `GoogleAIBackend`, `gemini-2.5-flash`), Cloud Firestore, Google Gemini API
- **Hosting:** Google AI Studio Cloud Hosting (`lexi-shield.ai.studio`)

---

## 🚀 Local Setup
```bash
git clone https://github.com.git
cd lexi-shield-promisegraph
npm install
cp .env.example .env
npm run dev
```

---

## ⚠️ Disclaimer
*LEXI-SHIELD is a preliminary verification aid that surfaces textual inconsistencies and unusual payment channels for independent human verification. Outputs do not constitute legal advice or establish guilt.*
