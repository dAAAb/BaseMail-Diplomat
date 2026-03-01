# The Diplomat 🦞

**AI-Powered Economic Arbitrator for Email Attention**

> Email spam costs $20B/year globally. Filters don't work — spammers adapt. The Diplomat flips the model: every email passes through a CRE workflow where an LLM acts as an economic arbitrator. Spam becomes economically self-destructive.

Built for the [Chainlink Convergence Hackathon](https://chain.link/hackathon) — CRE & AI Track.

🏆 **Tracks**: CRE & AI · Autonomous Agents · Top 10

## Demo

📹 [Watch the 3-minute demo video](https://youtu.be/TODO)

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

| Email # | Unread Streak | QAF Price | × Spam (3×) | × Legit (0.5×) | × High Value (0.3×) |
|---------|--------------|-----------|-------------|----------------|---------------------|
| 1st     | 0            | 3 ATTN    | 9 ATTN      | 2 ATTN         | 1 ATTN              |
| 2nd     | 1            | 4 ATTN    | 12 ATTN     | 2 ATTN         | 2 ATTN              |
| 3rd     | 2            | 9 ATTN    | 27 ATTN     | 5 ATTN         | 3 ATTN              |
| 4th     | 3            | 16 ATTN   | 48 ATTN     | 8 ATTN         | 5 ATTN              |
| 5th     | 4            | 25 ATTN   | 75 ATTN     | 13 ATTN        | 8 ATTN              |

**Reading resets the streak to 0.** Spammers go broke. Normal people barely pay.

### LLM Categories

| Category     | Coefficient | Effect                    |
|-------------|-------------|---------------------------|
| `spam`      | ×3          | Triple surcharge          |
| `cold`      | ×1          | Standard rate             |
| `legit`     | ×0.5        | Half price (returning)    |
| `high_value`| ×0.3        | Subsidized (valuable)     |
| `reply`     | ×0          | Free (conversation flow)  |

## Test Results

```
🦞 The Diplomat — E2E Test Suite
════════════════════════════════
Scenario 1️⃣: Legit email           ✅ 3 ATTN
Scenario 2️⃣: Cold email            ✅ 3 ATTN
Scenario 3️⃣: Spam 1st              ✅ 9 ATTN (×3 surcharge)
Scenario 4️⃣: Spam 3rd              ✅ 27 ATTN (n²=9 × ×3)
Scenario 5️⃣: Read resets streak    ✅
Scenario 6️⃣: Reply (free)          ✅ 0 ATTN
Scenario 7️⃣: High value            ✅ 1 ATTN (×0.3 subsidy)

Total: 30 | Passed: 30 ✅ | Failed: 0 ❌
```

## Quick Start

```bash
# Clone
git clone https://github.com/dAAAb/BaseMail-Diplomat.git
cd BaseMail-Diplomat

# Run the simulation (4 scenarios)
cd cre-workflow
npm install
npx tsx simulate.ts

# Run the full E2E test suite (7 scenarios, 30 assertions)
npx tsx test-e2e.ts

# Run smart contract tests
cd ../contracts
forge test -vv
```

## Academic Foundation

- **CO-QAF**: "Connection-Oriented Quadratic Attention Finance" (EAAMO '25)
- **Authors**: Ko, Tang, Weyl — [Glen Weyl](https://en.wikipedia.org/wiki/Glen_Weyl), Microsoft Research
- **Core insight**: Attention is a public good. Overconsumption should be priced quadratically.
- **Formula**: `cost(n) = (min(n+1, 10))²` — pure Quadratic Voting, capped at n=10

## Architecture

```
basemail-diplomat/
├── cre-workflow/                    ← Chainlink CRE Workflow
│   ├── main.ts                      ← Workflow logic (5 steps)
│   ├── workflow.yaml                ← CRE trigger + action config
│   ├── config.json                  ← Runtime config
│   ├── simulate.ts                  ← Standalone simulation (4 scenarios)
│   └── test-e2e.ts                  ← E2E test suite (7 scenarios)
├── x402-gateway/                    ← x402 Payment Gateway
│   └── server.ts                    ← Express + x402 middleware
├── contracts/                       ← On-chain Attestation (Foundry)
│   ├── src/DiplomatAttestation.sol   ← Base chain attestation contract
│   ├── test/DiplomatAttestation.t.sol← 8 forge tests
│   └── script/Deploy.s.sol          ← Deploy + verify script
├── project.yaml                     ← CRE project settings
└── secrets.yaml                     ← Secret names (not values)
```

### Chainlink CRE Files

> Required by hackathon: list all files that use Chainlink technology.

| File | Chainlink Usage |
|------|----------------|
| [`cre-workflow/main.ts`](cre-workflow/main.ts) | CRE Workflow — 5-step orchestration logic |
| [`cre-workflow/workflow.yaml`](cre-workflow/workflow.yaml) | CRE Workflow trigger & action configuration |
| [`project.yaml`](project.yaml) | CRE project definition |
| [`secrets.yaml`](secrets.yaml) | CRE secrets configuration |
| [`contracts/src/DiplomatAttestation.sol`](contracts/src/DiplomatAttestation.sol) | On-chain attestation (called by CRE Forwarder) |

### x402 Integration

| File | x402 Usage |
|------|-----------|
| [`x402-gateway/server.ts`](x402-gateway/server.ts) | x402 payment verification + USDC→ATTN conversion |
| [`cre-workflow/main.ts`](cre-workflow/main.ts) | Step 1: x402 payment hash verification |

## Built On

| Technology | Usage | Link |
|-----------|-------|------|
| **Chainlink CRE** | Workflow orchestration (5-step pipeline) | [cre.chain.link](https://cre.chain.link) |
| **x402** | USDC payment protocol for email economics | [x402 docs](https://docs.cdp.coinbase.com/x402) |
| **Gemini 2.0 Flash** | LLM email quality arbitration | [AI Studio](https://aistudio.google.com) |
| **Base** | L2 for on-chain attestation | [base.org](https://base.org) |
| **BaseMail.ai** | Æmail infrastructure (live product) | [basemail.ai](https://basemail.ai) |
| **Foundry** | Smart contract development & testing | [book.getfoundry.sh](https://book.getfoundry.sh) |

## Smart Contract

**DiplomatAttestation.sol** — Records every email arbitration decision on-chain.

📍 **Base Sepolia**: [`0x3445dfD122F98A0048AC6A065d82E11945E6F65D`](https://sepolia.basescan.org/address/0x3445dfd122f98a0048ac6a065d82e11945e6f65d) (verified ✅)

```solidity
function attest(
    bytes32 emailHash,        // Unique email identifier
    address sender,           // Sender wallet
    address recipient,        // Recipient wallet
    uint16 attnStaked,        // ATTN tokens staked
    uint8 qafN,               // Unread streak (QAF parameter)
    uint8 llmScore,           // LLM quality score (0-10)
    string llmCategory,       // spam/cold/legit/high_value/reply
    bytes32 x402PaymentHash   // x402 USDC payment proof
) external onlyWorkflow
```

**Tests**: 8/8 passing (basic, spam+QAF, duplicate prevention, access control, score validation)

## Team

- **寶博 (dAAAb)** — [x.com/dAAAb](https://x.com/dAAAb) — Legislator, NTU Professor, BaseMail creator
- **雲龍蝦 (Cloud Lobster)** — [x.com/cloudlobst3r](https://x.com/cloudlobst3r) — AI agent, built The Diplomat

## License

MIT
