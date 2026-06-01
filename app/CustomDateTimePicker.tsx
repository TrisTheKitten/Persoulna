"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type Props = {
  value: string; // ISO datetime-local string e.g. "2026-05-20T14:30"
  onChange: (val: string) => void;
  min?: string;
};

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseValue(val: string) {
  if (!val) return null;
  const parts = val.split("T");
  if (parts.length !== 2) return null;
  const [datePart, timePart] = parts;
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  return { year, month: month - 1, day, hour, minute };
}

function formatValue(year: number, month: number, day: number, hour: number, minute: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

export default function CustomDateTimePicker({ value, onChange, min }: Props) {
  const parsed = parseValue(value);
  const now = new Date();

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.year ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? now.getMonth());
  const [selectedDay, setSelectedDay] = useState(parsed?.day ?? now.getDate());
  const [hour, setHour] = useState(parsed?.hour ?? 9);
  const [minute, setMinute] = useState(parsed?.minute ?? 0);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (parsed) {
      const timer = setTimeout(() => {
        setViewYear(parsed.year);
        setViewMonth(parsed.month);
        setSelectedDay(parsed.day);
        setHour(parsed.hour);
        setMinute(parsed.minute);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isMobile) {
      document.body.style.overflow = "hidden";
    }
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const commit = useCallback((d: number, h: number, m: number) => {
    const val = formatValue(viewYear, viewMonth, d, h, m);
    onChange(val);
  }, [viewYear, viewMonth, onChange]);

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    commit(day, hour, minute);
  };

  const handleHourChange = (h: number) => {
    setHour(h);
    commit(selectedDay, h, minute);
  };

  const handleMinuteChange = (m: number) => {
    setMinute(m);
    commit(selectedDay, hour, m);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  // Build min date parts for comparison
  const minParsed = parseValue(min ?? "");
  const isBeforeMin = (day: number) => {
    if (!minParsed) return false;
    if (viewYear < minParsed.year) return true;
    if (viewYear > minParsed.year) return false;
    if (viewMonth < minParsed.month) return true;
    if (viewMonth > minParsed.month) return false;
    return day < minParsed.day;
  };

  const isSelected = (day: number) =>
    parsed &&
    parsed.year === viewYear &&
    parsed.month === viewMonth &&
    parsed.day === day;

  const isToday = (day: number) =>
    viewYear === now.getFullYear() &&
    viewMonth === now.getMonth() &&
    day === now.getDate();

  return (
    <div className="cdtpContainer" ref={containerRef}>
      <button
        type="button"
        className="selectDateBtn"
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {value ? (
          <span style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, width: "100%" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {formatDisplayDate(value)}
            </span>
            <span
              onClick={(e) => { e.stopPropagation(); onChange(""); setOpen(false); }}
              style={{ fontWeight: "bold", fontSize: "1.1rem", padding: "0 2px", flexShrink: 0 }}
            >
              &times;
            </span>
          </span>
        ) : (
          "Select Date"
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="cdtpBackdrop"
            aria-label="Close date picker"
            onClick={() => setOpen(false)}
          />
          <div
            className="cdtpPopup"
            role="dialog"
            aria-modal="true"
            aria-label="Choose date and time"
          >
          {/* Month Nav */}
          <div className="cdtpNav">
            <button type="button" className="cdtpNavBtn" onClick={prevMonth} aria-label="Previous month">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="cdtpMonthLabel">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" className="cdtpNavBtn" onClick={nextMonth} aria-label="Next month">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Day Headers */}
          <div className="cdtpGrid">
            {DAYS.map((d) => (
              <span key={d} className="cdtpDayHeader">{d}</span>
            ))}

            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <span key={`empty-${i}`} className="cdtpDayCell cdtpDayEmpty" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const disabled = isBeforeMin(day);
              const selected = isSelected(day);
              const today = isToday(day);
              return (
                <button
                  key={day}
                  type="button"
                  className={`cdtpDayCell${selected ? " cdtpDaySelected" : ""}${today ? " cdtpDayToday" : ""}${disabled ? " cdtpDayDisabled" : ""}`}
                  disabled={disabled}
                  onClick={() => handleDayClick(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Time Selector */}
          <div className="cdtpTime">
            <span className="cdtpTimeLabel">Time</span>
            <div className="cdtpTimeInputs">
              <select
                className="cdtpTimeSelect"
                value={hour}
                onChange={(e) => handleHourChange(Number(e.target.value))}
              >
                {Array.from({ length: 24 }).map((_, h) => (
                  <option key={h} value={h}>{pad(h)}</option>
                ))}
              </select>
              <span className="cdtpTimeSep">:</span>
              <select
                className="cdtpTimeSelect"
                value={minute}
                onChange={(e) => handleMinuteChange(Number(e.target.value))}
              >
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                  <option key={m} value={m}>{pad(m)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}

function formatDisplayDate(isoStr: string) {
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return "";
    return (
      d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
      ", " +
      d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    );
  } catch {
    return "";
  }
}
