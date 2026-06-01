import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LoginPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const params = new URLSearchParams();

  const mode = searchParams.mode === "signup" ? "signup" : "signin";
  params.set("auth", mode);

  const next = typeof searchParams.next === "string" ? searchParams.next : undefined;
  if (next && next !== "/" && !next.startsWith("/login")) {
    params.set("next", next);
  }

  if (searchParams.error) {
    params.set("error", decodeURIComponent(String(searchParams.error)));
  }

  const query = params.toString();
  redirect(query ? `/?${query}` : "/");
}
