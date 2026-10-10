"use client";

import { useRef, useState, type PointerEvent } from "react";
import type { Signature } from "@/lib/hours";
import { SignatureDisplay } from "./SignatureDisplay";

export function SignaturePad({ value, onChange, disabled = false }: { value: Signature; onChange: (s: Signature) => void; disabled?: boolean }) {
  const drawing = useRef<number | null>(null);
  const [atLimit, setAtLimit] = useState(false);
  const strokes = value.kind === "drawn" ? value.strokes : [];
  const current = useRef<number[][][]>(strokes);
  current.current = strokes;
  function point(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return [Math.round(Math.max(0, Math.min(600, (e.clientX - rect.left) / rect.width * 600)) * 10) / 10,
      Math.round(Math.max(0, Math.min(200, (e.clientY - rect.top) / rect.height * 200)) * 10) / 10];
  }
  function update(next: number[][][]) { current.current = next; onChange({ kind: "drawn", strokes: next }); }
  function finish(e: PointerEvent<SVGSVGElement>) {
    if (drawing.current !== e.pointerId) return;
    drawing.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    update(current.current.filter(s => s.length >= 2));
  }
  return <div className="space-y-3">
    <fieldset className="flex flex-wrap gap-4">
      <legend className="label">Signature method</legend>
      <label className="flex items-center gap-2 text-sm"><input type="radio" name="signature-method" checked={value.kind === "drawn"}
        onChange={() => { drawing.current = null; onChange({ kind: "drawn", strokes: [] }); }} />Draw signature</label>
      <label className="flex items-center gap-2 text-sm"><input type="radio" name="signature-method" checked={value.kind === "typed"}
        onChange={() => { drawing.current = null; onChange({ kind: "typed", text: "" }); }} />Type signature (keyboard accessible)</label>
    </fieldset>
    {value.kind === "typed" ? <label className="label">Type your full name<input className="input mt-1" maxLength={120}
      value={value.text} onChange={e => onChange({ kind: "typed", text: e.target.value })} /></label> : <>
      <p id="signature-help" className="text-sm text-gray-600">Draw below with your mouse, finger, or stylus. Use Type signature if you prefer a keyboard.</p>
      <svg viewBox="0 0 600 200" preserveAspectRatio="none" role="img" aria-label="Signature drawing area" aria-describedby="signature-help"
        className="h-48 w-full touch-none rounded-lg border border-gray-300 bg-white text-gray-900"
        onPointerDown={e => {
          if (disabled || drawing.current !== null || e.button !== 0) return;
          if (current.current.length >= 100 || current.current.reduce((n, s) => n + s.length, 0) >= 10000) { setAtLimit(true); return; }
          e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); drawing.current = e.pointerId;
          update([...current.current, [point(e)]]);
        }} onPointerMove={e => {
          if (disabled || drawing.current !== e.pointerId) return;
          const list = current.current, last = list[list.length - 1];
          if (!last) return;
          if (last.length >= 2000 || list.reduce((n, s) => n + s.length, 0) >= 10000) { setAtLimit(true); finish(e); return; }
          const p = point(e), prev = last[last.length - 1];
          if (Math.hypot(p[0] - prev[0], p[1] - prev[1]) < 0.5) return;
          update([...list.slice(0, -1), [...last, p]]);
        }} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={() => { drawing.current = null; }}>
        <line x1="20" x2="580" y1="170" y2="170" stroke="#d1d5db" strokeDasharray="4 4" />
        {strokes.map((s, i) => <polyline key={i} points={s.map(p => p.join(",")).join(" ")} fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />)}
      </svg>
      <div className="flex gap-2"><button type="button" className="btn-secondary" disabled={!strokes.length}
        onClick={() => { update(strokes.slice(0, -1)); setAtLimit(false); }}>Undo</button>
        <button type="button" className="btn-secondary" disabled={!strokes.length}
          onClick={() => { update([]); setAtLimit(false); }}>Clear</button></div>
      {atLimit && <p role="status" className="text-sm text-amber-800">Drawing limit reached. Undo or clear to try again.</p>}
    </>}
    {value.kind === "typed" && value.text && <SignatureDisplay signature={value} />}
  </div>;
}
