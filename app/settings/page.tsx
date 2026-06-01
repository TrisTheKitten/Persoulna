import {
  saveSettingsAction,
  syncPostizIntegrationsAction,
} from "../actions";
import { SUPPORTED_PLATFORM } from "@/src/lib/constants";
import { getDashboardData } from "@/src/lib/dashboard";
import Header from "../Header";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

const PLATFORM_LABELS: Record<string, string> = {
  [SUPPORTED_PLATFORM.x]: "X",
  [SUPPORTED_PLATFORM.linkedin]: "LinkedIn",
  [SUPPORTED_PLATFORM.linkedinPage]: "LinkedIn Page",
  [SUPPORTED_PLATFORM.threads]: "Threads",
  [SUPPORTED_PLATFORM.medium]: "Medium",
  [SUPPORTED_PLATFORM.facebook]: "Facebook",
  [SUPPORTED_PLATFORM.instagram]: "Instagram",
  [SUPPORTED_PLATFORM.instagramStandalone]: "Instagram",
  [SUPPORTED_PLATFORM.telegram]: "Telegram",
};

export default async function SettingsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const errorParam = searchParams.error;
  const successParam = searchParams.success;

  const data = await getDashboardData();
  const integrations = (data.postiz_integrations as any[]).map((integration) => ({
    postizIntegrationId: integration.postizIntegrationId,
    identifier: integration.identifier,
    name: integration.name,
    profile: integration.profile ?? null,
    disabled: integration.disabled,
  }));

  const errorMessage = errorParam
    ? decodeURIComponent(String(errorParam))
    : null;
  const successMessage = Boolean(successParam);

  return (
    <main className="pageShell settingsShell">
      <Header
        showBack
        avatarUrl={data.user_profile?.avatarUrl}
        avatarInitial={data.user_profile?.avatarInitial}
      />

      <section className="settingsLayout">
        <SettingsForm
          saveAction={saveSettingsAction}
          syncAction={syncPostizIntegrationsAction}
          initialPersona={data.active_persona_summary?.main_topics ?? ""}
          userId={data.user.id}
          userProfile={data.user_profile}
          integrations={integrations}
          platformLabels={PLATFORM_LABELS}
          errorMessage={errorMessage}
          successMessage={successMessage}
        />
      </section>
    </main>
  );
}
