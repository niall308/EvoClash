import React, { useState } from "react";
import { Check, X, Star, Download } from "lucide-react";
import { Image } from "@/components/ui/image";
import { IMAGE_STATUS_META, CREATURE_IMAGES_I18N } from "@/lib/creatureImages";
import ConfirmNoteModal from "./ConfirmNoteModal";

function fmtDate(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

// One image in the gallery: thumbnail + status badge + metadata + actions.
// Approve/Reject open a confirm-with-note modal; Set Default and Download act
// immediately. `pending` images without a url yet show a generating spinner.
export default function CreatureImageTile({ image, onApprove, onReject, onSetDefault, busy }) {
  const [confirm, setConfirm] = useState(null); // { kind, ... }
  const meta = IMAGE_STATUS_META[image.status] || IMAGE_STATUS_META.pending;
  const isDefault = !!image.isDefault;
  const generating = !image.url;

  const runConfirm = async (note) => {
    if (confirm?.kind === "approve") await onApprove(note, confirm.setDefault);
    else if (confirm?.kind === "reject") await onReject(note);
    setConfirm(null);
  };

  return (
    <div className="bg-white/5 rounded-xl overflow-hidden border border-white/10">
      <div className="relative aspect-square bg-black/30">
        {generating ? (
          <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          <Image src={image.url} alt={image.prompt || "creature image"} className="w-full h-full" />
        )}
        <span className={`absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded border ${meta.badge}`}>
          {meta.label}
        </span>
        {isDefault && (
          <span className="absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-black flex items-center gap-0.5">
            <Star className="w-2.5 h-2.5 fill-black" /> Default
          </span>
        )}
      </div>
      <div className="px-2 py-1.5 space-y-1">
        <div className="flex items-center justify-between text-[10px] text-white/40">
          <span>{image.generatedBy === "manual" ? "Manual upload" : image.generatedBy || "—"}</span>
          {image.url && (
            <a href={image.url} target="_blank" rel="noreferrer" download aria-label={CREATURE_IMAGES_I18N.downloadAria} className="text-white/40 hover:text-white">
              <Download className="w-3 h-3" />
            </a>
          )}
        </div>
        <div className="text-[10px] text-white/30">{fmtDate(image.created_date)}</div>
        {image.authorName && <div className="text-[10px] text-white/30">by {image.authorName}</div>}
        {image.errorMessage && <div className="text-[10px] text-red-400">failed: {image.errorMessage}</div>}
        {image.notes && <div className="text-[10px] text-white/40 truncate">{image.notes}</div>}
      </div>
      {!generating && (
        <div className="flex gap-1 px-2 pb-2">
          {image.status !== "approved" && (
            <button
              onClick={() => setConfirm({ kind: "approve" })}
              disabled={busy}
              aria-label={CREATURE_IMAGES_I18N.approveAria}
              className="flex-1 flex items-center justify-center gap-1 bg-emerald-600/80 hover:bg-emerald-600 text-white text-[11px] font-semibold py-1.5 rounded-md disabled:opacity-60"
            >
              <Check className="w-3 h-3" /> Approve
            </button>
          )}
          {image.status !== "rejected" && (
            <button
              onClick={() => setConfirm({ kind: "reject" })}
              disabled={busy}
              aria-label={CREATURE_IMAGES_I18N.rejectAria}
              className="flex-1 flex items-center justify-center gap-1 bg-red-700/70 hover:bg-red-700 text-white text-[11px] font-semibold py-1.5 rounded-md disabled:opacity-60"
            >
              <X className="w-3 h-3" /> Reject
            </button>
          )}
          <button
            onClick={onSetDefault}
            disabled={busy || image.status !== "approved"}
            aria-label={CREATURE_IMAGES_I18N.setDefaultAria}
            className={`flex items-center justify-center px-2 py-1.5 rounded-md text-[11px] ${
              isDefault ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-white hover:bg-white/20"
            } disabled:opacity-40`}
          >
            <Star className={`w-3 h-3 ${isDefault ? "fill-amber-300" : ""}`} />
          </button>
        </div>
      )}
      {confirm && (
        <ConfirmNoteModal
          title={confirm.kind === "approve" ? "Approve image" : "Reject image"}
          message={confirm.kind === "approve" ? CREATURE_IMAGES_I18N.approveConfirm : CREATURE_IMAGES_I18N.rejectConfirm}
          confirmLabel={confirm.kind === "approve" ? "Approve" : "Reject"}
          confirmClass={confirm.kind === "approve" ? "bg-emerald-600" : "bg-red-700"}
          noteLabel="Optional note"
          onConfirm={runConfirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}