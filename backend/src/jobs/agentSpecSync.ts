/**
 * Nightly top-up of asset specs from the external monitoring agent.
 *
 * Fills empty fields only. A field the registry already has a value for is
 * never touched here, however stale it looks — deciding between two real
 * values needs someone who knows which is right, and that review lives in
 * ทะเบียนทรัพย์สิน › ตรวจสอบข้อมูลจาก Agent.
 *
 * Set AGENT_AUTOFILL_ENABLED=false to turn the job off without a redeploy.
 */
import { prisma } from '../lib/prisma';
import { fillBlanksFromAgent } from '../services/externalAgent';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function runAgentSpecAutofill(): Promise<void> {
  if (process.env.AGENT_AUTOFILL_ENABLED === 'false') return;
  if (!process.env.EXTERNAL_ASSET_API_URL || !process.env.EXTERNAL_ASSET_API_KEY) return;

  try {
    // actorUserId stays null: nobody pressed anything, and the history note
    // says the job did it.
    const result = await fillBlanksFromAgent(prisma, { actorUserId: null });
    if (result.fieldsFilled === 0) {
      console.log('[AgentAutofill] Nothing to fill — registry is in step with the agent.');
      return;
    }
    console.log(`[AgentAutofill] Filled ${result.fieldsFilled} empty field(s) across ${result.assetsUpdated} asset(s).`);
    result.details.forEach((d) => {
      console.log(`[AgentAutofill]   ${d.assetCode || `asset#${d.assetId}`}: ${d.fields.join(', ')}`);
    });
  } catch (err) {
    console.error('[AgentAutofill] Run failed:', err);
  }
}

export function startAgentSpecSync(): void {
  if (process.env.AGENT_AUTOFILL_ENABLED === 'false') {
    console.log('[AgentAutofill] Disabled via AGENT_AUTOFILL_ENABLED=false');
    return;
  }

  // Delayed first run so a restart does not fire an outbound sweep before the
  // server has finished coming up.
  setTimeout(() => { void runAgentSpecAutofill(); }, 60_000);
  setInterval(() => { void runAgentSpecAutofill(); }, DAY_MS);

  console.log('[AgentAutofill] Scheduled daily blank-fill from the monitoring agent (interval: 24h)');
}
