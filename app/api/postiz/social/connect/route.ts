import { NextResponse } from "next/server";
import { getPostizAuthorizationHeader } from "@/src/lib/postiz";

const DEFAULT_POSTIZ_BASE_URL = "https://api.postiz.com/public/v1";
const INTEGRATION_PATTERN = /^[a-z0-9_-]+$/i;
const LOCAL_POSTIZ_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function parsePostizBaseUrl(value: string) {
  const url = new URL(value);
  const isLocalHost = LOCAL_POSTIZ_HOSTS.has(url.hostname);
  const isAllowedProtocol = url.protocol === "https:" || (url.protocol === "http:" && isLocalHost);

  if (!isAllowedProtocol || url.username || url.password) {
    return null;
  }

  return url;
}

export async function POST(request: Request) {
  try {
    const { integration, return_url } = await request.json();
    if (!integration || typeof integration !== "string" || !INTEGRATION_PATTERN.test(integration)) {
      return NextResponse.json({ error: "integration is required" }, { status: 400 });
    }

    const token = request.headers.get("x-vault-postiz-token") || undefined;
    const baseUrl = request.headers.get("x-vault-postiz-url") || undefined;

    const postizBaseUrl = parsePostizBaseUrl(baseUrl || process.env.POSTIZ_BASE_URL || DEFAULT_POSTIZ_BASE_URL);
    const apiKey = token || process.env.POSTIZ_API_KEY;

    if (!postizBaseUrl) {
      return NextResponse.json({ error: "Postiz URL must be a valid HTTPS URL" }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: "Postiz API token is required" }, { status: 400 });
    }

    const query = new URLSearchParams();
    if (typeof return_url === "string" && return_url) {
      query.set("return_url", return_url);
    }
    postizBaseUrl.pathname = `${postizBaseUrl.pathname.replace(/\/$/, "")}/social/${integration}`;
    postizBaseUrl.search = query.toString();

    const res = await fetch(postizBaseUrl, {
      method: "GET",
      headers: {
        "Authorization": getPostizAuthorizationHeader(apiKey),
      },
      redirect: "manual",
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (location) {
        return NextResponse.json({ url: location });
      }
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Postiz API error ${res.status}: ${errorText}` },
        { status: res.status }
      );
    }

    const data = await res.json().catch(() => null);
    if (data && data.url) {
      return NextResponse.json({ url: data.url });
    }

    return NextResponse.json({ error: "Postiz did not return an authorization URL" }, { status: 500 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
