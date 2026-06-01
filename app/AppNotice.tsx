import type { CSSProperties, ReactNode } from "react";

export type NoticeVariant = "error" | "warn" | "success" | "info";

type AppNoticeProps = {
  variant: NoticeVariant;
  title?: string;
  children?: ReactNode;
  items?: string[];
  className?: string;
  style?: CSSProperties;
  role?: "alert" | "status";
};

function NoticeIcon({ variant }: { variant: NoticeVariant }) {
  if (variant === "success") {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path
          d="M4.5 9.25L7.5 12.25L13.5 5.75"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (variant === "warn") {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path
          d="M9 3.5L15.25 14.5H2.75L9 3.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M9 8V10.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <circle cx="9" cy="12.75" r="0.9" fill="currentColor" />
      </svg>
    );
  }

  if (variant === "info") {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="6.25" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 8V12.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <circle cx="9" cy="5.75" r="0.9" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 5.5V10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="9" cy="12.75" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function AppNotice({
  variant,
  title,
  children,
  items,
  className = "",
  style,
  role,
}: AppNoticeProps) {
  const hasList = items && items.length > 0;
  const hasBody = Boolean(children);
  const ariaRole = role ?? (variant === "success" ? "status" : "alert");

  return (
    <div
      className={`notice notice${variant.charAt(0).toUpperCase()}${variant.slice(1)} ${className}`.trim()}
      role={ariaRole}
      style={style}
    >
      <span className="noticeRail" aria-hidden="true" />
      <span className="noticeIcon" aria-hidden="true">
        <NoticeIcon variant={variant} />
      </span>
      <div className="noticeBody">
        {title ? <p className="noticeTitle">{title}</p> : null}
        {hasBody ? <div className="noticeMessage">{children}</div> : null}
        {hasList ? (
          <ul className="noticeList">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
