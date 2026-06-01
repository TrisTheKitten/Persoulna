"use server";

import { redirect } from "next/navigation";
import { getAppOrigin } from "@/src/lib/app-origin";
import { createClient } from "@/src/lib/supabase/server";

const DEFAULT_AUTH_DESTINATION = "/write";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required`);
  }
  return value.trim();
}

function getDestination(formData: FormData) {
  const nextRaw = formData.get("next");
  const next = typeof nextRaw === "string" ? nextRaw.trim() : "";
  const isRelativePath = next.startsWith("/") && !next.startsWith("//");
  return isRelativePath && next !== "/" && !next.startsWith("/login") ? next : DEFAULT_AUTH_DESTINATION;
}

function authRedirect(message: string, origin?: string): never {
  const base = origin === "landing" ? "/?error=" : "/login?error=";
  redirect(`${base}${encodeURIComponent(message)}` as never);
}

export async function signInAction(formData: FormData) {
  const supabase = await createClient();
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const destination = getDestination(formData);
  const origin = formData.get("origin");
  const originValue = typeof origin === "string" ? origin : undefined;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    authRedirect(error.message, originValue);
  }
  redirect(destination as never);
}

export async function signUpAction(formData: FormData) {
  const supabase = await createClient();
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const destination = getDestination(formData);
  const origin = formData.get("origin");
  const originValue = typeof origin === "string" ? origin : undefined;
  const appOrigin = await getAppOrigin();

  if (!appOrigin) {
    authRedirect("Unable to determine deployment URL. Check app environment settings.", originValue);
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appOrigin}/auth/callback?next=${encodeURIComponent(destination)}`,
    },
  });
  if (error) {
    authRedirect(error.message, originValue);
  }
  redirect(destination as never);
}

export async function googleOAuthAction(formData: FormData) {
  const supabase = await createClient();
  const destination = getDestination(formData);
  const origin = formData.get("origin");
  const originValue = typeof origin === "string" ? origin : undefined;
  const appOrigin = await getAppOrigin();

  if (!appOrigin) {
    authRedirect("Unable to determine deployment URL. Check app environment settings.", originValue);
  }

  const redirectTo = `${appOrigin}/auth/callback?next=${encodeURIComponent(destination)}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error || !data.url) {
    authRedirect(error?.message ?? "Unable to start Google sign in. Refresh and try again.", originValue);
  }

  redirect(data.url as never);
}
