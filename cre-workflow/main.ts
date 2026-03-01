/**
 * The Diplomat — CRE Workflow
 * 
 * AI-powered economic arbitrator for BaseMail email attention pricing.
 * 
 * Flow:
 *   1. HTTP trigger (from x402 gateway, after USDC payment verified)
 *   2. Query BaseMail API for QAF history (sender→recipient unread streak)
 *   3. LLM arbitration (Gemini) — classify email quality
 *   4. Calculate final ATTN price (QAF n² × LLM coefficient)
 *   5. Send email via BaseMail API with attn_override
 *   6. Write on-chain attestation
 *
 * Academic basis: Quadratic Voting (Lalley & Weyl, 2015)
 *                 CO-QAF (Ko, Tang, Weyl — EAAMO '25)
 */

import {
  cre,
  Runner,
  type Runtime,
  type HTTPPayload,
} from '@chainlink/cre-sdk'
import { z } from 'zod'

// ── Config Schema ──
const configSchema = z.object({
  basemailApiUrl: z.string().default('https://api.basemail.ai'),
  basemailToken: z.string().optional(),  // resolved from secrets at runtime
  geminiModel: z.string().default('gemini-2.0-flash'),
  attestationContract: z.string().optional(),
  chainSelectorName: z.string().default('ethereum-testnet-sepolia-base-1'),
})

type Config = z.infer<typeof configSchema>

// ── Request Schema ──
const emailRequestSchema = z.object({
  from: z.string(),        // sender handle (e.g. "alice")
  to: z.string(),          // recipient handle (e.g. "bob")
  subject: z.string(),
  body: z.string(),
  sender_token: z.string(), // BaseMail auth token of sender
})

type EmailRequest = z.infer<typeof emailRequestSchema>

// ── QAF Pricing (Quadratic Voting) ──
const QAF_BASE = 3
const QAF_CAP = 10

function qafPrice(unreadStreak: number): number {
  if (unreadStreak <= 0) return QAF_BASE
  const n = Math.min(unreadStreak + 1, QAF_CAP)
  return n * n
}

// ── LLM Coefficients ──
const LLM_COEFFICIENTS: Record<string, number> = {
  spam: 3,
  cold: 1,
  legit: 0.5,
  high_value: 0.3,
  reply: 0,
}

// ── Workflow Logic ──
const onHTTPTrigger = async (
  runtime: Runtime<Config>,
  payload: HTTPPayload,
): Promise<string> => {
  runtime.log('🦞 The Diplomat — CRE Workflow triggered')

  // Parse incoming email request
  if (!payload.input || payload.input.length === 0) {
    throw new Error('Email request payload is required')
  }

  const requestJson = JSON.parse(payload.input.toString())
  const emailReq = emailRequestSchema.parse(requestJson)
  runtime.log(`📧 Email: ${emailReq.from} → ${emailReq.to}: "${emailReq.subject}"`)

  const apiUrl = runtime.config.basemailApiUrl

  // ── Step 1: Query QAF History ──
  runtime.log('📊 Step 1: Querying QAF history...')
  const historyResp = await fetch(
    `${apiUrl}/api/diplomat/history?from=${emailReq.from}&to=${emailReq.to}`
  )
  const history = await historyResp.json() as {
    unread_streak: number
    total_sent: number
    qaf: { n: number; multiplier: number }
  }
  runtime.log(`   Unread streak: ${history.unread_streak}, QAF multiplier: ${history.qaf.multiplier}`)

  // ── Step 2: LLM Arbitration ──
  runtime.log('🤖 Step 2: LLM Arbitration (Gemini)...')
  const llmPrompt = `You are an email quality arbitrator. Analyze this email and classify it.

From: ${emailReq.from}
To: ${emailReq.to}
Subject: ${emailReq.subject}
Body: ${emailReq.body}

Context: Sender has sent ${history.total_sent} emails to this recipient before. ${history.unread_streak} remain unread.

Classify into exactly ONE category:
- "spam": unsolicited bulk, scam, or low-effort mass message
- "cold": first-time outreach, professional but unsolicited
- "legit": normal conversation, expected communication
- "high_value": important business proposal, collaboration, time-sensitive
- "reply": clearly a response to a previous email

Return ONLY a JSON object:
{"category": "spam|cold|legit|high_value|reply", "score": 0-10, "reasoning": "brief explanation"}`

  // Use CRE's LLM capability (Gemini via secrets)
  // In simulation, we can use direct API call
  let llmResult: { category: string; score: number; reasoning: string }
  
  try {
    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${runtime.config.geminiModel}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: llmPrompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        }),
      }
    )
    const geminiData = await geminiResp.json() as any
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    llmResult = JSON.parse(text)
  } catch (e) {
    runtime.log(`   LLM fallback: defaulting to "cold"`)
    llmResult = { category: 'cold', score: 5, reasoning: 'LLM unavailable, default classification' }
  }

  runtime.log(`   Category: ${llmResult.category}, Score: ${llmResult.score}/10`)
  runtime.log(`   Reasoning: ${llmResult.reasoning}`)

  // ── Step 3: Calculate Final Price ──
  runtime.log('💰 Step 3: Calculating price...')
  const qafBase = qafPrice(history.unread_streak)
  const llmCoeff = LLM_COEFFICIENTS[llmResult.category] ?? 1
  const finalCost = Math.max(1, Math.ceil(qafBase * llmCoeff))

  runtime.log(`   QAF base: ${qafBase} (n=${history.unread_streak})`)
  runtime.log(`   LLM coefficient: ${llmCoeff} (${llmResult.category})`)
  runtime.log(`   Final cost: ${finalCost} ATTN`)

  // ── Step 4: Send Email via BaseMail API ──
  runtime.log('📤 Step 4: Sending email with Diplomat pricing...')
  const sendResp = await fetch(`${apiUrl}/api/diplomat/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${emailReq.sender_token}`,
    },
    body: JSON.stringify({
      to: `${emailReq.to}@basemail.ai`,
      subject: emailReq.subject,
      body: emailReq.body,
      attn_override: finalCost,
      llm_category: llmResult.category,
      llm_score: llmResult.score,
      qaf_n: history.unread_streak,
    }),
  })
  const sendResult = await sendResp.json() as any

  if (!sendResult.success) {
    throw new Error(`Failed to send: ${sendResult.error || 'Unknown error'}`)
  }

  runtime.log(`   ✅ Email sent! ID: ${sendResult.email_id}`)
  runtime.log(`   ATTN staked: ${finalCost}`)

  // ── Step 5: On-chain Attestation (TODO: Phase 2) ──
  runtime.log('📝 Step 5: On-chain attestation (placeholder)')
  // Will be implemented in Phase 2 with DiplomatAttestation.sol

  const summary = JSON.stringify({
    success: true,
    email_id: sendResult.email_id,
    from: emailReq.from,
    to: emailReq.to,
    qaf: { n: history.unread_streak, base: qafBase },
    llm: { category: llmResult.category, score: llmResult.score, coefficient: llmCoeff },
    final_cost: finalCost,
  })

  runtime.log(`🦞 Diplomat complete: ${summary}`)
  return summary
}

// ── Workflow Init ──
const initWorkflow = (config: Config) => {
  const httpTrigger = new cre.capabilities.HTTPCapability()

  return [
    cre.handler(httpTrigger.trigger({}), (runtime, payload) =>
      onHTTPTrigger(runtime, payload)
    ),
  ]
}

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}

main()
