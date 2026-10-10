"use client";
export function PrintRecordButton() {
  return <button className="btn-primary" onClick={() => window.print()}>Print / save as PDF</button>;
}
