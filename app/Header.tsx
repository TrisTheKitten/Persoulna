"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import UserAvatar from "./UserAvatar";

type HeaderProps = {
  showBack?: boolean;
  backHref?: Route;
  avatarUrl?: string | null;
  avatarInitial?: string;
  avatarLoading?: boolean;
};

export default function Header({
  showBack = false,
  backHref = "/write" as Route,
  avatarUrl,
  avatarInitial,
  avatarLoading = false,
}: HeaderProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <header className="appHeader">
      {showBack ? (
        <Link href={backHref} className="backBtn" aria-label="Back">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
      ) : (
        <Link href="/settings" style={{ display: "flex", alignItems: "center" }}>
          <UserAvatar
            pending={avatarLoading}
            src={avatarLoading ? undefined : avatarUrl}
            initial={avatarInitial}
            className="userAvatar"
            alt="Profile"
          />
        </Link>
      )}
      
      <Link className="brandLogo" href="/write">
        Per<span className="brandSoul">soul</span>na
      </Link>

      <div style={{ position: "relative" }} ref={dropdownRef}>
        <button
          className="burgerBtn"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="Toggle navigation menu"
        >
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {open && (
          <>
            <button
              type="button"
              className="uiOverlayBackdrop"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <nav className="navDrawer" aria-label="Main navigation">
            <Link
              href="/write"
              aria-current={pathname === "/write" ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              Write
            </Link>
            <Link
              href="/analytics"
              aria-current={pathname === "/analytics" ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              Analytics
            </Link>
            <Link
              href="/settings"
              aria-current={pathname === "/settings" ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              Settings
            </Link>
            <form action="/auth/sign-out" method="post">
              <button type="submit" className="navDrawerAction">
                Sign Out
              </button>
            </form>
          </nav>
          </>
        )}
      </div>
    </header>
  );
}
