/**
 * components/steps/Step1Category.tsx
 * ──────────────────────────────────
 * First step of the wizard: user enters the decision category.
 * Example: "Laptops", "Running Shoes", "Mutual Funds", etc.
 */

"use client";

import React, { useState, useCallback } from "react";
import { useDecision } from "@/context/DecisionContext";
import { STRINGS, CATEGORY_SUGGESTIONS, MIN_CATEGORY_LENGTH, COLOR_TOKENS, FONTS } from "@/lib/constants";

export function Step1Category() {
  const { createNewSession } = useDecision();
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const isValid = category.trim().length >= MIN_CATEGORY_LENGTH;

  const handleContinue = useCallback(() => {
    if (isValid) {
      createNewSession(category.trim());
    }
  }, [category, isValid, createNewSession]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setCategory(suggestion);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLOR_TOKENS.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: FONTS.body,
        color: COLOR_TOKENS.text,
      }}
    >
      <div
        style={{
          maxWidth: "700px",
          width: "100%",
        }}
      >
        {/* Title */}
        <div style={{ marginBottom: "60px", textAlign: "center" }}>
          <h1
            style={{
              fontSize: "48px",
              fontWeight: 600,
              marginBottom: "16px",
              color: COLOR_TOKENS.text,
              fontFamily: FONTS.display,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            {STRINGS.STEP1_TITLE}
          </h1>
          <p
            style={{
              fontSize: "16px",
              color: COLOR_TOKENS.muted,
              lineHeight: 1.6,
            }}
          >
            The Decision Intelligence Engine helps you structure complex choices.
          </p>
        </div>

        {/* Category Input */}
        <div style={{ marginBottom: "40px" }}>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontFamily: FONTS.mono,
              color: COLOR_TOKENS.amber,
              letterSpacing: "0.15em",
              marginBottom: "8px",
              textTransform: "uppercase",
            }}
          >
            Decision Category
          </label>
          <input
            type="text"
            placeholder={STRINGS.STEP1_PLACEHOLDER}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && isValid && handleContinue()}
            autoFocus
            style={{
              width: "100%",
              padding: "14px 16px",
              fontSize: "18px",
              fontFamily: FONTS.body,
              background: COLOR_TOKENS.surface,
              border: `1px solid ${COLOR_TOKENS.border}`,
              borderRadius: "8px",
              color: COLOR_TOKENS.text,
              outline: "none",
              transition: "border-color 0.2s, box-shadow 0.2s",
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = COLOR_TOKENS.teal;
              e.currentTarget.style.boxShadow = `0 0 8px ${COLOR_TOKENS.teal}20`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = COLOR_TOKENS.border;
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          <p
            style={{
              fontSize: "12px",
              color: COLOR_TOKENS.muted,
              marginTop: "8px",
              margin: "8px 0 0 0",
            }}
          >
            {category.length === 0 ? "Start typing..." : `${category.length} characters`}
          </p>
        </div>

        {/* Description (optional) */}
        <div style={{ marginBottom: "40px" }}>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontFamily: FONTS.mono,
              color: COLOR_TOKENS.muted,
              letterSpacing: "0.15em",
              marginBottom: "8px",
              textTransform: "uppercase",
            }}
          >
            Description (optional)
          </label>
          <textarea
            placeholder={STRINGS.STEP1_DESCRIPTION}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              width: "100%",
              minHeight: "80px",
              padding: "12px 16px",
              fontSize: "14px",
              fontFamily: FONTS.body,
              background: COLOR_TOKENS.surface,
              border: `1px solid ${COLOR_TOKENS.border}`,
              borderRadius: "8px",
              color: COLOR_TOKENS.text,
              outline: "none",
              resize: "vertical",
              transition: "border-color 0.2s",
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = COLOR_TOKENS.teal;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = COLOR_TOKENS.border;
            }}
          />
        </div>

        {/* Suggestions */}
        <div style={{ marginBottom: "50px" }}>
          <p
            style={{
              fontSize: "12px",
              fontFamily: FONTS.mono,
              color: COLOR_TOKENS.muted,
              letterSpacing: "0.1em",
              marginBottom: "12px",
              textTransform: "uppercase",
            }}
          >
            Popular categories
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            {CATEGORY_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                style={{
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontFamily: FONTS.body,
                  background: `${COLOR_TOKENS.border}40`,
                  border: `1px solid ${COLOR_TOKENS.border}`,
                  color: COLOR_TOKENS.text,
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${COLOR_TOKENS.teal}20`;
                  e.currentTarget.style.borderColor = COLOR_TOKENS.teal;
                  e.currentTarget.style.color = COLOR_TOKENS.teal;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `${COLOR_TOKENS.border}40`;
                  e.currentTarget.style.borderColor = COLOR_TOKENS.border;
                  e.currentTarget.style.color = COLOR_TOKENS.text;
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!isValid}
          style={{
            width: "100%",
            padding: "14px 20px",
            fontSize: "14px",
            fontFamily: FONTS.mono,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            background: isValid
              ? `linear-gradient(135deg, ${COLOR_TOKENS.amber}, ${COLOR_TOKENS.teal})`
              : COLOR_TOKENS.border,
            color: isValid ? COLOR_TOKENS.bg : COLOR_TOKENS.muted,
            border: "none",
            borderRadius: "8px",
            cursor: isValid ? "pointer" : "not-allowed",
            transition: "all 0.3s",
            opacity: isValid ? 1 : 0.5,
          }}
          onMouseEnter={(e) => {
            if (isValid) {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = `0 8px 16px ${COLOR_TOKENS.amber}40`;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {STRINGS.STEP1_CONTINUE}
        </button>

        {/* Footer hint */}
        <p
          style={{
            textAlign: "center",
            marginTop: "30px",
            fontSize: "12px",
            color: COLOR_TOKENS.muted,
            fontFamily: FONTS.mono,
          }}
        >
          Step 1 of 4 · What are you comparing?
        </p>
      </div>
    </div>
  );
}
