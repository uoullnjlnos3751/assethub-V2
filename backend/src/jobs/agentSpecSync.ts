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
import { scheduleDaily } from './dailySchedule';

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

  // 01:30 — ก่อน ComponentChange (02:00) ที่ต้องใช้สเปคล่าสุดในการเทียบ
  scheduleDaily({
    name: 'AgentAutofill',
    hour: 1, minute: 30,
    run: runAgentSpecAutofill,
  });
}
