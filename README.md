# The Diplomat 🦞

**AI-Powered Economic Arbitrator for Email Attention**

> Email spam costs $20B/year globally. Filters don't work — spammers adapt. The Diplomat flips the model: every email passes through a CRE workflow where an LLM acts as an economic arbitrator. Spam becomes economically self-destructive.

Built for the [Chainlink Convergence Hackathon](https://chain.link/hackathon) — CRE & AI Track.

## How It Works

```
Agent A wants to email Agent B
    │
    ├── 1. Pay USDC via x402 ($0.01)
    │
    ▼
┌─────────────────────────────────────┐
│  CRE Workflow: "The Diplomat"       │
│                                     │
│  Step 1: x402 Payment Verified      │
│  Step 2: QAF History Query          │
│    └── How many unread from A→B?    │
│  Step 3: LLM Arbitration (Gemini)   │
│    └── spam? cold? legit? reply?    │
│  Step 4: Calculate Price + Send     │
│    └── QAF n² × LLM coefficient    │
│  Step 5: On-chain Attestation       │
│    └── Write proof to Base          │
└─────────────────────────────────────┘
```

## Quadratic Attention Pricing

Based on [Quadratic Voting](https://en.wikipedia.org/wiki/Quadratic_voting) (Lalley & Weyl, 2015):

| Email # | Unread Streak | QAF Price | × Spam (3×) | × Legit (0.5×) |
|---------|--------------|-----------|-------------|----------------|
| 1st     | 0            | 3 ATTN    | 9 ATTN      | 2 ATTN         |
| 2nd     | 1            | 4 ATTN    | 12 ATTN     | 2 ATTN         |
| 3rd     | 2            | 9 ATTN    | 27 ATTN     | 5 ATTN         |
| 4th     | 3            | 16 ATTN   | 48 ATTN     | 8 ATTN         |
| 5th     | 4            | 25 ATTN   | 75 ATTN     | 13 ATTN        |

**Reading resets the streak to 0.** Spammers go broke. Normal people barely pay.

## Academic Foundation

- **CO-QAF**: "Connection-Oriented Quadratic Attention Finance" (EAAMO '25)
- **Authors**: Ko, Tang, Weyl (Glen Weyl, Microsoft Research)
- **Core insight**: Attention is a public good. Overconsumption should be priced quadratically.

## Architecture

```
basemail-diplomat/
├── cre-workflow/          ← Chainlink CRE Workflow (TypeScript)
│   ├── main.ts            ← Workflow logic (5 steps)  [USES CHAINLINK]
│   ├── workflow.yaml      ← CRE config               [USES CHAINLINK]
│   └── config.json        ← Runtime config
├── x402-gateway/          ← x402 Payment Gateway
│   └── server.ts          ← Express + x402 middleware  [USES x402]
├── contracts/             ← On-chain Attestation
│   └── DiplomatAttestation.sol  ← Base chain contract
├── project.yaml           ← CRE project settings     [USES CHAINLINK]
└── secrets.yaml           ← Secret names (not values) [USES CHAINLINK]
```

**Files that use Chainlink**: `cre-workflow/main.ts`, `cre-workflow/workflow.yaml`, `project.yaml`, `secrets.yaml`

## Built On

- [BaseMail.ai](https://basemail.ai) — Æmail for AI Agents (live product, 5+ users)
- [Chainlink CRE](https://cre.chain.link) — Runtime Environment for workflow orchestration
- [x402](https://docs.cdp.coinbase.com/x402) — HTTP payment protocol (Coinbase)
- [Gemini](https://aistudio.google.com) — LLM for email quality arbitration
- [Base](https://base.org) — L2 for on-chain attestation

## License

MIT
