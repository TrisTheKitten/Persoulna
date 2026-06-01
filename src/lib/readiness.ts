import { BLOCKERS } from "./constants";

type ReadinessInput = {
  hasActivePersona: boolean;
  hasPostizApiKey: boolean;
  postizConnectionOk: boolean;
  hasAnyPostizIntegration: boolean;
  hasSupportedPlatformConnected: boolean;
  hasContentBatchGenerated: boolean;
  hasInsightDigest: boolean;
};

export function computeReadiness(input: ReadinessInput) {
  const blockers: string[] = [];

  if (!input.hasPostizApiKey) blockers.push(BLOCKERS.missingPostizApiKey);
  if (input.hasPostizApiKey && !input.postizConnectionOk) {
    blockers.push(BLOCKERS.postizConnectionFailed);
  }
  if (input.hasPostizApiKey && input.postizConnectionOk && !input.hasAnyPostizIntegration) {
    blockers.push(BLOCKERS.noPostizIntegrations);
  }
  if (
    input.hasPostizApiKey &&
    input.postizConnectionOk &&
    input.hasAnyPostizIntegration &&
    !input.hasSupportedPlatformConnected
  ) {
    blockers.push(BLOCKERS.noSupportedPlatformConnected);
  }
  if (!input.hasActivePersona) blockers.push(BLOCKERS.missingActivePersona);
  if (!input.hasContentBatchGenerated) blockers.push(BLOCKERS.noDraftGenerated);
  if (!input.hasInsightDigest) blockers.push(BLOCKERS.noInsightDigest);

  return {
    can_save_settings: true,
    can_generate_drafts:
      input.hasActivePersona && input.hasSupportedPlatformConnected,
    can_schedule:
      input.hasPostizApiKey &&
      input.postizConnectionOk &&
      input.hasSupportedPlatformConnected,
    can_analyze:
      input.hasPostizApiKey &&
      input.postizConnectionOk &&
      input.hasAnyPostizIntegration,
    blockers,
  };
}

export function hasSupportedPlatformConnected(
  integrations: Array<{ identifier: string; disabled: boolean }> | null,
) {
  if (!integrations) return false;
  return integrations.some((integration) => !integration.disabled);
}
