import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import LandingPage from "./LandingPage";

export const dynamic = "force-dynamic";

function resolveNextPath(next: string | undefined) {
  if (!next || next === "/" || next.startsWith("/login")) {
    return "/write";
  }
  return next;
}

export default async function Home(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const searchParams = await props.searchParams;

  if (data.user) {
    redirect("/write");
  }

  const authParam = searchParams.auth === "signin" ? "signin" : "signup";
  const nextRaw = typeof searchParams.next === "string" ? searchParams.next : undefined;
  const error = searchParams.error ? decodeURIComponent(String(searchParams.error)) : null;

  return (
    <LandingPage
      authError={error}
      initialAuthMode={authParam}
      nextPath={resolveNextPath(nextRaw)}
    />
  );
}
