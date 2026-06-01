"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { googleOAuthAction, signInAction, signUpAction } from "./actions";
import { AppNotice } from "../AppNotice";

type LoginAuthProps = {
  error: string | null;
  nextPath: string;
};

export default function LoginAuth({ error, nextPath }: LoginAuthProps) {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "signup" ? "signup" : "signin";

  return (
    <main className="pageShell settingsShell loginShell">
      <header className="loginTopBar">
        <Link className="brandLogo" href="/">
          Per<span className="brandSoul">soul</span>na
        </Link>
        <Link href="/" className="landingNavLink">
          Home
        </Link>
      </header>

      <section className="settingsLayout">
        <article className="settingsCard loginCard">
          <h1 className="cardTitle">{mode === "signup" ? "Create Account" : "Sign In"}</h1>
          <p className="loginCardLead">
            {mode === "signup"
              ? "Create an account with email and password. You will land on Write after your first session."
              : "Sign in to open Write, Analytics, and Settings."}
          </p>

          <div className="loginModeTabs" role="tablist" aria-label="Authentication mode">
            <Link
              href={`/login?next=${encodeURIComponent(nextPath)}`}
              role="tab"
              aria-selected={mode === "signin"}
              className={`loginModeTab${mode === "signin" ? " loginModeTabActive" : ""}`}
            >
              Sign In
            </Link>
            <Link
              href={`/login?mode=signup&next=${encodeURIComponent(nextPath)}`}
              role="tab"
              aria-selected={mode === "signup"}
              className={`loginModeTab${mode === "signup" ? " loginModeTabActive" : ""}`}
            >
              Sign Up
            </Link>
          </div>

          {error && (
            <AppNotice variant="error" title="Sign in failed">
              {error}
            </AppNotice>
          )}

          <form action={googleOAuthAction}>
            <input type="hidden" name="next" value={nextPath} />
            <button type="submit" className="oauthButton">
              <span className="oauthMark" aria-hidden="true">
                G
              </span>
              Continue with Google
            </button>
          </form>

          <div className="oauthDivider" aria-hidden="true">
            <span>or</span>
          </div>

          {mode === "signin" ? (
            <form className="settingsStack" action={signInAction}>
              <input type="hidden" name="next" value={nextPath} />
              <label className="field">
                <span>Email</span>
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <button type="submit" className="generateBtn">
                Sign In
              </button>
            </form>
          ) : (
            <form className="settingsStack" action={signUpAction}>
              <input type="hidden" name="next" value={nextPath} />
              <label className="field">
                <span>Email</span>
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </label>
              <button type="submit" className="generateBtn">
                Create Account
              </button>
            </form>
          )}

          <p className="loginSwitchHint">
            {mode === "signin" ? (
              <>
                New here?{" "}
                <Link href={`/login?mode=signup&next=${encodeURIComponent(nextPath)}`}>
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Have an account?{" "}
                <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>Sign in</Link>
              </>
            )}
          </p>
        </article>
      </section>
    </main>
  );
}
