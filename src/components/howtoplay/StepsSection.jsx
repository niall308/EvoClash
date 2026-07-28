import React from "react";

export default function StepsSection({ title, steps }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold mb-3">{title}</h2>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3 bg-white/5 rounded-xl p-3 text-sm">
            <span className="font-black text-amber-400 shrink-0">{i + 1}.</span>
            <span className="text-white/80">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}