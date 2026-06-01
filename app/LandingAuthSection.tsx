"use client";

import { googleOAuthAction, signInAction, signUpAction } from "./login/actions";
import { AppNotice } from "./AppNotice";

type LandingAuthSectionProps = {
  mode: "signin" | "signup";
  onModeChange: (mode: "signin" | "signup") => void;
  error?: string | null;
  nextPath: string;
};

export default function LandingAuthSection({
  mode,
  onModeChange,
  error = null,
  nextPath,
}: LandingAuthSectionProps) {
  return (
    <article className="settingsCard landingAuthCard">
      <div className="loginModeTabs" role="tablist" aria-label="Authentication mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signin"}
          className={`loginModeTab${mode === "signin" ? " loginModeTabActive" : ""}`}
          onClick={() => onModeChange("signin")}
        >
          Sign In
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          className={`loginModeTab${mode === "signup" ? " loginModeTabActive" : ""}`}
          onClick={() => onModeChange("signup")}
        >
          Sign Up
        </button>
      </div>

      {error && (
        <AppNotice variant="error" title="Sign in failed">
          {error}
        </AppNotice>
      )}

      <form action={googleOAuthAction}>
        <input type="hidden" name="next" value={nextPath} />
        <input type="hidden" name="origin" value="landing" />
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
          <input type="hidden" name="origin" value="landing" />
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
          <input type="hidden" name="origin" value="landing" />
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
            <button type="button" className="landingTextBtn" onClick={() => onModeChange("signup")}>
              Create an account
            </button>
          </>
        ) : (
          <>
            Have an account?{" "}
            <button type="button" className="landingTextBtn" onClick={() => onModeChange("signin")}>
              Sign in
            </button>
          </>
        )}
      </p>
    </article>
  );
}
