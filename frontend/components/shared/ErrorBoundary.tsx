"use client";

import React from "react";

import { COLOR_TOKENS, FONTS } from "@/lib/constants";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Unhandled frontend error:", error);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: COLOR_TOKENS.bg,
          color: COLOR_TOKENS.text,
          fontFamily: FONTS.body,
        }}
      >
        <section
          style={{
            maxWidth: 520,
            padding: 24,
            border: `1px solid ${COLOR_TOKENS.border}`,
            borderRadius: 8,
            background: COLOR_TOKENS.surface,
          }}
        >
          <h1 style={{ marginBottom: 10, fontSize: 22 }}>Something failed</h1>
          <p style={{ marginBottom: 18, color: COLOR_TOKENS.muted }}>
            The app hit an unexpected frontend error.
          </p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              color: COLOR_TOKENS.amber,
              fontFamily: FONTS.mono,
              fontSize: 12,
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: 20,
              padding: "10px 14px",
              border: "none",
              borderRadius: 6,
              background: COLOR_TOKENS.teal,
              color: COLOR_TOKENS.bg,
              cursor: "pointer",
              fontFamily: FONTS.mono,
              fontWeight: 700,
            }}
          >
            Retry
          </button>
        </section>
      </main>
    );
  }
}
