"use client";

import { COLOR_TOKENS, FONTS } from "@/lib/constants";

type LoadingOverlayProps = {
  isOpen: boolean;
  message?: string;
};

export function LoadingOverlay({ isOpen, message }: LoadingOverlayProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "grid",
        placeItems: "center",
        background: "rgba(8, 12, 16, 0.82)",
        color: COLOR_TOKENS.text,
        fontFamily: FONTS.body,
      }}
    >
      <div
        style={{
          width: "min(420px, calc(100vw - 32px))",
          padding: 24,
          border: `1px solid ${COLOR_TOKENS.borderHi}`,
          borderRadius: 8,
          background: COLOR_TOKENS.surface,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            margin: "0 auto 18px",
            border: `3px solid ${COLOR_TOKENS.border}`,
            borderTopColor: COLOR_TOKENS.amber,
            borderRadius: "50%",
            animation: "die-spin 0.9s linear infinite",
          }}
        />
        <div style={{ fontSize: 16, fontWeight: 600 }}>
          {message || "Working..."}
        </div>
        <p
          style={{
            marginTop: 8,
            color: COLOR_TOKENS.muted,
            fontFamily: FONTS.mono,
            fontSize: 12,
          }}
        >
          Local model calls can take a minute or two.
        </p>
      </div>
      <style>{`
        @keyframes die-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
