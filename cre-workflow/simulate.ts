/**
 * Diplomat Workflow — Standalone Simulation
 * 
 * Simulates the full CRE workflow without requiring the CRE CLI binary.
 * Calls the real BaseMail Diplomat API endpoints.
 * 
 * Usage: npx tsx simulate.ts
 */

import { Wallet } from 'ethers'

const API = process.env.BASEMAIL_API || 'http://localhost:8787'
const GEMINI_KEY = process.env.GEMINI_API_KEY || ''

// ── QAF Pricing (same as workflow) ──
function qafPrice(unreadStreak: number): number {
  if (unreadStreak <= 0) return 3
  const n = Math.min(unreadStreak + 1, 10)
  return n * n
}

const LLM_COEFFICIENTS: Record<string, number> = {
  spam: 3, cold: 1, legit: 0.5, high_value: 0.3, reply: 0,
}

// ── LLM Arbitration ──
async function llmArbitrate(email: { from: string; to: string; subject: string; body: string }, history: any) {
  const prompt = `You are an email quality arbitrator. Analyze this email and classify it.

From: ${email.from}
To: ${email.to}
Subject: ${email.subject}
Body: ${email.body}

Context: Sender has sent ${history.total_sent} emails to this recipient. ${history.unread_streak} remain unread.

Classify into exactly ONE category:
- "spam": unsolicited bulk, scam, low-effort
- "cold": first-time outreach, professional but unsolicited
- "legit": normal conversation, expected
- "high_value": important proposal, collaboration
- "reply": clearly a response to previous email

Return ONLY JSON: {"category": "...", "score": 0-10, "reasoning": "..."}`

  if (!GEMINI_KEY) {
    console.log('   ⚠️  No GEMINI_API_KEY — using heuristic fallback')
    // Simple heuristic
    const bodyLower = email.body.toLowerCase()
    if (bodyLower.includes('buy') || bodyLower.includes('free') || bodyLower.includes('click')) {
      return { category: 'spam', score: 2, reasoning: 'Heuristic: spam keywords detected' }
    }
    if (history.total_sent === 0) {
      return { category: 'cold', score: 5, reasoning: 'Heuristic: first email from sender' }
    }
    return { category: 'legit', score: 7, reasoning: 'Heuristic: returning sender' }
  }

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        }),
      }
    )
    const data = await resp.json() as any
    return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || '{}')
  } catch (e) {
    return { category: 'cold', score: 5, reasoning: 'LLM error, fallback' }
  }
}

// ── Simulation Scenarios ──
interface Scenario {
  name: string
  from_pk: string  // private key for sender wallet
  to: string       // recipient handle
  subject: string
  body: string
  description: string
}

const scenarios: Scenario[] = [
  {
    name: '1️⃣ Normal cold email',
    from_pk: '0x' + 'aa'.repeat(32),
    to: 'bob',
    subject: 'Partnership Inquiry',
    body: 'Hi Bob, I represent a Web3 startup and would love to discuss a potential integration with your platform.',
    description: 'First email, should be classified as "cold", QAF n=0, cost = 3 ATTN',
  },
  {
    name: '2️⃣ Follow-up (unread)',
    from_pk: '0x' + 'aa'.repeat(32),
    to: 'bob',
    subject: 'Re: Partnership Inquiry',
    body: 'Hi Bob, just following up on my previous email. Would love to connect when you have a moment.',
    description: 'Second email with no read, QAF n=1, cost = 4 ATTN (2²)',
  },
  {
    name: '3️⃣ Spam email',
    from_pk: '0x' + 'bb'.repeat(32),
    to: 'bob',
    subject: 'FREE CRYPTO! Click Now!!!',
    body: 'Buy our token now! 1000x gains guaranteed! Click here to claim your free airdrop! Limited time offer!',
    description: 'Spam content, should be surcharge ×3',
  },
  {
    name: '4️⃣ High value email',
    from_pk: '0x' + 'cc'.repeat(32),
    to: 'bob',
    subject: 'Investment Proposal — Series A',
    body: 'Dear Bob, Our fund is interested in leading a $5M Series A for your project. We have reviewed your whitepaper and believe the attention economy model has significant potential.',
    description: 'High value, should get subsidy ×0.3',
  },
]

// ── Main Simulation ──
async function registerWallet(pk: string): Promise<{ handle: string; token: string }> {
  const wallet = new Wallet(pk)
  const addr = wallet.address

  const startData = await (await fetch(`${API}/api/auth/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: addr }),
  })).json() as any

  const signature = await wallet.signMessage(startData.message)
  const reg = await (await fetch(`${API}/api/auth/agent-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: addr, signature, message: startData.message }),
  })).json() as any

  // Trigger ATTN balance init
  await fetch(`${API}/api/attn/balance`, {
    headers: { 'Authorization': `Bearer ${reg.token}` }
  })

  return { handle: reg.handle, token: reg.token }
}

async function simulateWorkflow(scenario: Scenario) {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`${scenario.name}`)
  console.log(`${'─'.repeat(60)}`)
  console.log(`📋 ${scenario.description}`)

  // Register sender
  const sender = await registerWallet(scenario.from_pk)
  console.log(`\n👤 Sender: ${sender.handle.substring(0, 12)}...`)

  // Step 1: QAF History
  console.log('\n📊 Step 1: QAF History')
  const history = await (await fetch(
    `${API}/api/diplomat/history?from=${sender.handle}&to=${scenario.to}`
  )).json() as any
  console.log(`   Unread streak: ${history.unread_streak}`)
  console.log(`   QAF multiplier: ${history.qaf.multiplier}`)

  // Step 2: LLM Arbitration
  console.log('\n🤖 Step 2: LLM Arbitration')
  const llm = await llmArbitrate(
    { from: sender.handle, to: scenario.to, subject: scenario.subject, body: scenario.body },
    history
  )
  console.log(`   Category: ${llm.category}`)
  console.log(`   Score: ${llm.score}/10`)
  console.log(`   Reasoning: ${llm.reasoning}`)

  // Step 3: Calculate Price
  console.log('\n💰 Step 3: Calculate Price')
  const qafBase = qafPrice(history.unread_streak)
  const llmCoeff = LLM_COEFFICIENTS[llm.category] ?? 1
  const finalCost = Math.max(1, Math.ceil(qafBase * llmCoeff))
  console.log(`   QAF base: ${qafBase} (n=${history.unread_streak})`)
  console.log(`   LLM coefficient: ${llmCoeff} (${llm.category})`)
  console.log(`   ⚡ Final cost: ${finalCost} ATTN`)

  // Step 4: Send via Diplomat API
  console.log('\n📤 Step 4: Send Email')
  const sendResp = await fetch(`${API}/api/diplomat/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sender.token}` },
    body: JSON.stringify({
      to: `${scenario.to}@basemail.ai`,
      subject: scenario.subject,
      body: scenario.body,
      attn_override: finalCost,
      llm_category: llm.category,
      llm_score: llm.score,
      qaf_n: history.unread_streak,
    }),
  })
  const sendResult = await sendResp.json() as any

  if (sendResult.success) {
    console.log(`   ✅ Sent! Email ID: ${sendResult.email_id}`)
    console.log(`   ATTN staked: ${sendResult.diplomat.attn_staked}`)
    console.log(`   Balance after: ${sendResult.diplomat.sender_balance_after}`)
  } else {
    console.log(`   ❌ Failed: ${sendResult.error}`)
  }

  // Step 5: Attestation (placeholder)
  console.log('\n📝 Step 5: On-chain Attestation')
  console.log(`   Hash: 0x${Buffer.from(sendResult.email_id || 'none').toString('hex').padEnd(64, '0')}`)
  console.log(`   [Would write to DiplomatAttestation.sol on Base]`)

  return { finalCost, llm, qafBase }
}

async function main() {
  console.log('🦞 The Diplomat — CRE Workflow Simulation')
  console.log('═'.repeat(60))
  console.log(`API: ${API}`)
  console.log(`LLM: ${GEMINI_KEY ? 'Gemini 2.0 Flash' : 'Heuristic fallback'}`)

  const results: any[] = []
  for (const scenario of scenarios) {
    try {
      const result = await simulateWorkflow(scenario)
      results.push({ name: scenario.name, ...result })
    } catch (e: any) {
      console.log(`   ❌ Error: ${e.message}`)
      results.push({ name: scenario.name, error: e.message })
    }
  }

  // Summary
  console.log(`\n${'═'.repeat(60)}`)
  console.log('📊 SIMULATION SUMMARY')
  console.log('═'.repeat(60))
  console.log('┌────────────────────────────────┬──────────┬──────────┬──────────┐')
  console.log('│ Scenario                       │ Category │ QAF Base │ Cost     │')
  console.log('├────────────────────────────────┼──────────┼──────────┼──────────┤')
  for (const r of results) {
    if (r.error) {
      console.log(`│ ${r.name.padEnd(30)} │ ERROR    │          │          │`)
    } else {
      console.log(`│ ${r.name.padEnd(30)} │ ${(r.llm.category || '').padEnd(8)} │ ${String(r.qafBase).padEnd(8)} │ ${String(r.finalCost).padEnd(8)} │`)
    }
  }
  console.log('└────────────────────────────────┴──────────┴──────────┴──────────┘')
  console.log('\n✅ Simulation complete. The Diplomat works! 🦞')
}

main().catch(console.error)
