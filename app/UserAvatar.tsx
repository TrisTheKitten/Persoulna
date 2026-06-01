"use client";

import { useLayoutEffect, useRef, useState } from "react";

type UserAvatarProps = {
  src?: string | null;
  initial?: string;
  pending?: boolean;
  className?: string;
  alt?: string;
};

function imageReady(img: HTMLImageElement | null): boolean {
  return Boolean(img?.complete && img.naturalWidth > 0);
}

export default function UserAvatar({
  src,
  initial = "U",
  pending = false,
  className = "",
  alt = "",
}: UserAvatarProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  const resolvedSrc = pending || useFallback ? undefined : src;
  const fallbackInitial = initial.trim().charAt(0).toUpperCase() || "U";

  useLayoutEffect(() => {
    setUseFallback(false);
  }, [src]);

  useLayoutEffect(() => {
    if (pending || !resolvedSrc) {
      setLoaded(false);
      return;
    }
    setLoaded(imageReady(imgRef.current));
  }, [pending, resolvedSrc]);

  const showSpinner = pending || Boolean(resolvedSrc && !loaded);
  const showInitial = !pending && !resolvedSrc;

  return (
    <span className={`avatarSlot ${className}`.trim()}>
      {showSpinner && (
        <span className="avatarSlotSpinner" aria-hidden>
          <svg viewBox="0 0 24 24" width="18" height="18">
            <circle className="loadingMarkTrack" cx="12" cy="12" r="9" />
            <path className="loadingMarkPath" d="M21 12a9 9 0 0 1-9 9" />
          </svg>
        </span>
      )}
      {resolvedSrc && !pending && (
        <img
          key={resolvedSrc}
          ref={imgRef}
          className={`avatarSlotImage${loaded ? " avatarSlotImageLoaded" : ""}`}
          src={resolvedSrc}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setUseFallback(true);
            setLoaded(true);
          }}
        />
      )}
      {showInitial && (
        <span className="avatarSlotInitial" aria-label={alt || "Profile"}>
          {fallbackInitial}
        </span>
      )}
      {showSpinner && (
        <span className="visuallyHidden" role="status">
          Loading profile photo
        </span>
      )}
    </span>
  );
}
