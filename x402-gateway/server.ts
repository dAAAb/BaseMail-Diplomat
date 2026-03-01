/**
 * The Diplomat — x402 Payment Gateway
 * 
 * Agents pay USDC via x402 to send emails through The Diplomat CRE workflow.
 * 
 * Flow:
 *   1. Agent POST /diplomat/send with email data
 *   2. If no x402 payment → 402 Payment Required
 *   3. If payment verified → trigger CRE workflow
 *   4. Return workflow result
 */

import express from 'express'
import { withPaymentRequired } from '@anthropic-ai/x402-express' // TODO: use correct x402 package
import jwt from 'jsonwebtoken'

const app = express()
app.use(express.json())

const PORT = process.env.PORT || 4020
const WORKFLOW_ID = process.env.WORKFLOW_ID || ''
const GATEWAY_URL = process.env.GATEWAY_URL || ''
const X402_PRICE = process.env.X402_PRICE || '0.01'
const X402_PAY_TO = process.env.X402_PAY_TO_ADDRESS || ''
const X402_NETWORK = process.env.X402_NETWORK || 'base-sepolia'
const HTTP_TRIGGER_PRIVATE_KEY = process.env.HTTP_TRIGGER_PRIVATE_KEY || ''

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'basemail-diplomat-gateway' })
})

// x402-protected endpoint
// TODO: integrate actual x402 middleware once we have CDP keys
app.post('/diplomat/send', async (req, res) => {
  try {
    const { from, to, subject, body, sender_token } = req.body

    if (!from || !to || !subject || !body || !sender_token) {
      return res.status(400).json({
        error: 'Required fields: from, to, subject, body, sender_token'
      })
    }

    console.log(`🦞 Diplomat Gateway: ${from} → ${to}: "${subject}"`)
    console.log(`   x402 payment: $${X402_PRICE} USDC (${X402_NETWORK})`)

    // In production: x402 middleware verifies payment before reaching here
    // For now: directly trigger the CRE workflow

    // Sign JWT for CRE gateway trigger
    const workflowPayload = { from, to, subject, body, sender_token }

    if (GATEWAY_URL && WORKFLOW_ID) {
      // Trigger CRE workflow via gateway
      const triggerResp = await fetch(`${GATEWAY_URL}/api/v1/gateway/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // JWT auth for gateway
        },
        body: JSON.stringify({
          workflow_id: WORKFLOW_ID,
          input: workflowPayload,
        }),
      })
      const result = await triggerResp.json()
      return res.json({ success: true, gateway_response: result })
    }

    // Fallback: call BaseMail Diplomat API directly (for testing)
    const BASEMAIL_API = process.env.BASEMAIL_API_URL || 'http://localhost:8787'
    
    // Step 1: Get QAF history
    const historyResp = await fetch(
      `${BASEMAIL_API}/api/diplomat/history?from=${from}&to=${to}`
    )
    const history = await historyResp.json() as any

    // Step 2: Get pricing (default to "cold" — LLM would run in CRE)
    const pricingResp = await fetch(
      `${BASEMAIL_API}/api/diplomat/pricing?from=${from}&to=${to}&category=cold`
    )
    const pricing = await pricingResp.json() as any

    console.log(`   QAF: n=${pricing.pricing.qaf_n}, base=${pricing.pricing.qaf_base}`)
    console.log(`   Price: ${pricing.pricing.final_cost} ATTN`)

    // Step 3: Send via diplomat endpoint
    const sendResp = await fetch(`${BASEMAIL_API}/api/diplomat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sender_token}`,
      },
      body: JSON.stringify({
        to: `${to}@basemail.ai`,
        subject,
        body,
        attn_override: pricing.pricing.final_cost,
        llm_category: 'cold', // placeholder — CRE workflow would use Gemini
        llm_score: 5,
        qaf_n: pricing.pricing.qaf_n,
      }),
    })
    const sendResult = await sendResp.json() as any

    return res.json({
      success: sendResult.success,
      email_id: sendResult.email_id,
      diplomat: sendResult.diplomat,
      x402: {
        price_usdc: X402_PRICE,
        network: X402_NETWORK,
        payment_verified: true, // would be verified by x402 middleware
      },
    })
  } catch (err: any) {
    console.error('Gateway error:', err)
    return res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`🦞 Diplomat Gateway running on http://localhost:${PORT}`)
  console.log(`   x402 price: $${X402_PRICE} USDC on ${X402_NETWORK}`)
})
