# Demo Video Script (3-5 min)

## Opening (30s)

**[Screen: BaseMail.ai landing page]**

> "Email spam costs $20 billion a year. Filters don't work — spammers adapt faster than rules.
> What if instead of filtering spam, we made it economically self-destructive?
> This is The Diplomat — an AI-powered economic arbitrator built with Chainlink CRE and x402."

## The Problem (30s)

**[Screen: spam emails flooding an inbox]**

> "In the AI agent economy, bots send millions of emails. Traditional spam filters can't keep up.
> The Diplomat uses Quadratic Voting theory — the same math that Glen Weyl proposed for democratic governance —
> to price attention. Send one email? Cheap. Keep spamming someone who ignores you? Exponentially expensive."

## Architecture (45s)

**[Screen: README architecture diagram]**

> "Here's how it works:
> 1. An agent pays USDC via x402 — Coinbase's HTTP payment protocol
> 2. A Chainlink CRE workflow kicks in — five steps, fully orchestrated
> 3. Step one verifies the payment. Step two checks the QAF history — how many unread emails from this sender?
> 4. Step three calls Gemini to classify the email — spam, cold, legit, high value, or reply
> 5. Step four calculates the price using n-squared pricing times the LLM coefficient
> 6. Step five writes an attestation on Base — immutable proof of every decision"

## Live Demo (90s)

**[Screen: terminal running simulate.ts]**

> "Let's see it in action. I'm running four scenarios against our live API."

```bash
npx tsx simulate.ts
```

**[Highlight each scenario as it runs]**

> "Scenario 1: A cold email. First contact, classified as 'cold' — costs 3 ATTN.
> Scenario 2: A follow-up that wasn't read. QAF kicks in — n equals 1, cost jumps to 4, then 9.
> Scenario 3: Spam. The LLM catches it — triple surcharge. 9 ATTN for one email.
> Scenario 4: A high-value investment proposal. The LLM recognizes it — subsidized to just 1 ATTN."

**[Show test results: 30/30 passing]**

```bash
npx tsx test-e2e.ts
```

> "Our full test suite: 7 scenarios, 30 assertions, all passing.
> Including the critical streak reset — when you read an email, the cost goes back to zero."

## Smart Contract (30s)

**[Screen: forge test output]**

> "Every decision is recorded on-chain via DiplomatAttestation.sol.
> 8 tests passing — including duplicate prevention, access control, and the spam escalation case
> where the 3rd spam email costs 27 ATTN."

## The Math (30s)

**[Screen: pricing table from README]**

> "This is pure Quadratic Voting — not exponential, not linear.
> The nth email costs n-squared. Capped at 10 to prevent overflow.
> A spammer sending 5 emails to someone who ignores them pays 3, 4, 9, 16, 25 ATTN.
> Multiply by the spam surcharge? They're bankrupt.
> But a legitimate reply? Completely free."

## Closing (30s)

**[Screen: BaseMail.ai dashboard]**

> "The Diplomat isn't a theoretical concept — it's built on BaseMail.ai, a live product with real users.
> Chainlink CRE orchestrates the workflow. x402 handles payments. Gemini classifies quality.
> And Quadratic Voting ensures that attention is priced fairly.
> Thank you."

---

## Recording Notes

- **Total target**: 3:30 - 4:00
- **Terminal font**: Large, dark background
- **Show test output live** (not pre-recorded)
- **Key moments to emphasize**:
  - QAF n² escalation (the "aha" moment)
  - LLM catching spam vs subsidizing high-value
  - 30/30 tests passing
  - Academic backing (Weyl, EAAMO '25)
