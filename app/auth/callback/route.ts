import { NextResponse } from "next/server";
import { ensureUserProfile } from "@/src/lib/profile";
import { createClient } from "@/src/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/write";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/write";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await ensureUserProfile(userData.user);
      }
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/?auth=signin&error=Unable%20to%20complete%20Google%20sign%20in", url.origin));
}
