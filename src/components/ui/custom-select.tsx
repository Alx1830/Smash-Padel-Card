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
  searchable?: boolean;
}

export function CustomSelect({
  value, onChange, options, placeholder = "Seleccionar", searchable,
}: CustomSelectProps) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const ref                   = useRef<HTMLDivElement>(null);
  const searchRef             = useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.value === value);

  /* auto-detect searchable for large lists */
  const isSearchable = searchable ?? options.length > 20;

  const filtered = isSearchable && query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open && isSearchable) {
      setTimeout(() => searchRef.current?.focus(), 30);
    }
    if (!open) setQuery("");
  }, [open, isSearchable]);

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
          transition: "border-color 0.2s", boxSizing: "border-box",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? selected.label : placeholder}
        </span>
        <span style={{
          fontSize: "10px", color: INK2, flexShrink: 0, marginLeft: "8px",
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
          zIndex: 9999,
          boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
          display: "flex", flexDirection: "column",
        }}>
          {/* Search input for large lists */}
          {isSearchable && (
            <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar..."
                style={{
                  width: "100%", padding: "7px 10px", borderRadius: "6px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: INK0, fontFamily: MONO, fontSize: "12px",
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          )}

          {/* Options list — max 5 visible, internal scroll */}
          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "10px 14px", fontFamily: MONO, fontSize: "12px", color: INK2 }}>
                Sin resultados
              </div>
            ) : (
              filtered.map(opt => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false); setQuery(""); }}
                    style={{
                      width: "100%", padding: "10px 14px",
                      background: isSelected ? `${COURT}18` : "transparent",
                      border: "none",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      color: isSelected ? COURT : INK0,
                      fontFamily: MONO, fontSize: "13px",
                      textAlign: "left", cursor: "pointer",
                      transition: "background 0.15s", display: "block",
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
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
