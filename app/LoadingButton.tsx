"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  loadingLabel: string;
  loading?: boolean;
};

export function LoadingMark() {
  return (
    <span className="loadingMark" aria-hidden>
      <svg viewBox="0 0 24 24" width="18" height="18">
        <circle className="loadingMarkTrack" cx="12" cy="12" r="9" />
        <path className="loadingMarkPath" d="M21 12a9 9 0 0 1-9 9" />
      </svg>
    </span>
  );
}

export default function LoadingButton({
  children,
  className,
  disabled,
  formAction,
  icon,
  loadingLabel,
  type = "submit",
  loading,
  ...props
}: LoadingButtonProps) {
  const status = useFormStatus();
  const actionMatches = !formAction || status.action === formAction;
  const isPending = (status.pending && actionMatches) || Boolean(loading);
  const classes = [className, isPending ? "isLoading" : null]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...props}
      type={type}
      className={classes}
      disabled={disabled || isPending}
      formAction={formAction}
      aria-busy={isPending}
    >
      {isPending ? <LoadingMark /> : icon}
      <span>{isPending ? loadingLabel : children}</span>
    </button>
  );
}
