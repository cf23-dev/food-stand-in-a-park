import type { Signature } from "@/lib/hours";

export function SignatureDisplay({ signature }: { signature: Signature }) {
  if (signature.kind === "typed") return <p className="py-5 text-3xl italic text-gray-900">{signature.text}</p>;
  return <svg viewBox="0 0 600 200" role="img" aria-label="Drawn signature" className="w-full max-w-lg text-gray-900">
    {signature.strokes.map((stroke, i) => <polyline key={i} points={stroke.map(p => p.join(",")).join(" ")}
      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />)}
  </svg>;
}
