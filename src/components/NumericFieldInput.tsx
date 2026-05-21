"use client";

import { useEffect, useRef, useState } from "react";

type NumericFieldInputProps = {
  /** 0 または未設定相当は空欄表示 */
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputMode?: "decimal" | "numeric";
  /** 小数を許可（豆量・TDS）。false なら整数表示（湯量 ml） */
  allowDecimal?: boolean;
  id?: string;
  "aria-label"?: string;
};

function normalizeTyping(raw: string, allowDecimal: boolean): string {
  const s = raw.replace(",", ".").replace(/[^\d.]/g, "");
  if (!allowDecimal) {
    return s.replace(/\./g, "");
  }
  const dot = s.indexOf(".");
  if (dot === -1) {
    return s;
  }
  return `${s.slice(0, dot)}.${s.slice(dot + 1).replace(/\./g, "").slice(0, 2)}`;
}

function parseTypingValue(raw: string, allowDecimal: boolean): number | null {
  const t = normalizeTyping(raw, allowDecimal).trim();
  if (t === "" || t === "." || t === "-") {
    return null;
  }
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return n;
}

function valueToDisplay(value: number, allowDecimal: boolean): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }
  if (allowDecimal) {
    const rounded = Math.round(value * 100) / 100;
    return String(rounded);
  }
  return String(Math.round(value));
}

export function selectNumericInputOnFocus(event: React.FocusEvent<HTMLInputElement>) {
  event.target.select();
}

export default function NumericFieldInput({
  value,
  onChange,
  placeholder = "0",
  disabled = false,
  className = "",
  inputMode = "decimal",
  allowDecimal = true,
  id,
  "aria-label": ariaLabel
}: NumericFieldInputProps) {
  const [text, setText] = useState(() => valueToDisplay(value, allowDecimal));
  const focusedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusedRef.current) {
      return;
    }
    setText(valueToDisplay(value, allowDecimal));
  }, [value, allowDecimal]);

  const commitText = (raw: string) => {
    const normalized = normalizeTyping(raw, allowDecimal);
    setText(normalized);
    const parsed = parseTypingValue(normalized, allowDecimal);
    if (parsed === null) {
      onChange(0);
      return;
    }
    if (allowDecimal) {
      onChange(Math.round(parsed * 100) / 100);
    } else {
      onChange(Math.round(parsed));
    }
  };

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode={inputMode}
      disabled={disabled}
      value={text}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onFocus={(event) => {
        focusedRef.current = true;
        selectNumericInputOnFocus(event);
      }}
      onBlur={() => {
        focusedRef.current = false;
        const parsed = parseTypingValue(text, allowDecimal);
        if (parsed === null) {
          setText("");
          onChange(0);
          return;
        }
        setText(valueToDisplay(parsed, allowDecimal));
      }}
      onChange={(event) => commitText(event.target.value)}
      className={className}
      autoComplete="off"
    />
  );
}
