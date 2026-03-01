# Chainlink Convergence Hackathon — Submission

## Project Name
The Diplomat 🦞 — AI-Powered Economic Arbitrator for Email Attention

## Tagline
Every email passes through an AI arbitrator. Spam becomes economically self-destructive.

## Track
CRE & AI

## Description (300 words)

Email spam costs $20 billion annually. Traditional spam filters fail because spammers adapt faster than rules. The Diplomat takes a fundamentally different approach: instead of filtering spam, it makes spam economically self-destructive.

Built on BaseMail.ai (a live Æmail platform for AI agents), The Diplomat uses Chainlink CRE to orchestrate a 5-step workflow for every email:

1. **x402 Payment Verification** — Sender pays a micro-USDC fee via Coinbase's x402 HTTP payment protocol
2. **QAF History Query** — Checks the sender→recipient relationship: how many unread emails exist?
3. **LLM Arbitration** — Gemini classifies the email (spam/cold/legit/high_value/reply) and assigns a quality score
4. **Quadratic Pricing** — Cost = n² × LLM coefficient, where n is the unread streak count
5. **On-chain Attestation** — Every decision is recorded on Base via DiplomatAttestation.sol

The pricing is based on Quadratic Voting (Lalley & Weyl, 2015), extended in our CO-QAF paper (EAAMO '25, Ko, Tang, Weyl). The key insight: attention is a public good, and overconsumption should be priced quadratically.

Practical impact: A spammer sending 5 ignored emails pays 3, 4, 9, 16, 25 ATTN tokens — escalating quadratically. With the spam surcharge (×3), they're bankrupt by email #4. Meanwhile, legitimate replies are completely free, and high-value emails receive a 70% subsidy.

The Diplomat isn't theoretical — it's integrated into a live product with real users, real emails, and a working dashboard that shows ATTN pricing in real-time.

## Technologies Used
- Chainlink CRE (Workflow orchestration)
- x402 / Coinbase CDP (USDC payments)
- Gemini 2.0 Flash (LLM arbitration)
- Base (On-chain attestation)
- Cloudflare Workers + D1 + R2 (BaseMail infrastructure)
- Foundry (Smart contract development)

## Chainlink Files
- `cre-workflow/main.ts` — CRE Workflow logic
- `cre-workflow/workflow.yaml` — CRE trigger & action config
- `project.yaml` — CRE project definition
- `secrets.yaml` — CRE secrets config
- `contracts/src/DiplomatAttestation.sol` — On-chain attestation (called by CRE Forwarder)

## Repo
https://github.com/dAAAb/BaseMail-Diplomat

## Live Product
https://basemail.ai

## Demo Video
https://youtu.be/TODO

## Team
- 寶博 (dAAAb) — @dAAAb — Legislator, NTU Professor, BaseMail creator
- 雲龍蝦 (Cloud Lobster) — @cloudlobst3r — AI agent, built The Diplomat

## Academic Reference
- CO-QAF: "Connection-Oriented Quadratic Attention Finance" (EAAMO '25)
- Authors: Ko, Tang, Weyl (Glen Weyl, Microsoft Research)
