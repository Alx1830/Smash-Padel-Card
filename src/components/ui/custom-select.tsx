"use client";

import { useState, useRef, useEffect } from "react";

const COURT = "#2ee6c1";
const BG1   = "#0a0e1a";
const BG2   = "#121729";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";

interface Option { label: string; value: string }

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
}

export function CustomSelect({ value, onChange, options, placeholder = "Seleccionar" }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", padding: "10px 14px",
          borderRadius: open ? "8px 8px 0 0" : "8px",
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${open ? COURT + "66" : "rgba(255,255,255,0.1)"}`,
          color: selected ? INK0 : INK2,
          fontFamily: MONO, fontSize: "13px",
          textAlign: "left", cursor: "pointer",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          transition: "border-color 0.2s",
          boxSizing: "border-box",
        }}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <span style={{
          fontSize: "10px", color: INK2,
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
        }}>▼</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: BG1,
          border: `1px solid ${COURT}44`,
          borderTop: "none",
          borderRadius: "0 0 8px 8px",
          zIndex: 100,
          overflow: "hidden",
          boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
        }}>
          {options.map(opt => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  width: "100%", padding: "10px 14px",
                  background: isSelected ? `${COURT}18` : "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  color: isSelected ? COURT : INK0,
                  fontFamily: MONO, fontSize: "13px",
                  textAlign: "left", cursor: "pointer",
                  transition: "background 0.15s",
                  display: "block",
                }}
                onMouseEnter={e => {
                  if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = BG2;
                }}
                onMouseLeave={e => {
                  if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
