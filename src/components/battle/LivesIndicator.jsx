import React from "react";

export default function LivesIndicator({ lives }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < lives ? "bg-green-500" : "bg-red-500"}`} />
      ))}
    </div>
  );
}