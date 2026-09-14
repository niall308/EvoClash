import React, { useState } from "react";
import { Check, X, Star, Download, Wand2, Crown } from "lucide-react";
import { Image } from "@/components/ui/image";
import { IMAGE_STATUS_META, GUIDE_BADGE, TIER_BADGE, CREATURE_IMAGES_I18N } from "@/lib/creatureImages";
import ConfirmNoteModal from "./ConfirmNoteModal";

function fmtDate(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

// One image in the gallery: thumbnail + tier badge + status badge + optional
// GUIDE badge + metadata + actions. Approve-as-guide / reject open a confirm-
// with-optional-note modal. The creature-level default star (★) mirrors onto
// Creature.referenceImageUrl; the tier-default crown (♕) marks the default
// guide for this creature + tier. "Use in Card Generator" opens the card
// generator prefilled with this guide.
export default function CreatureImageTile({ image, onApprove, onReject, onSetDefault, onSetTierDefault, onUseInGenerator, busy }) {
  const [confirm, setConfirm] = useState(null);
  const meta = IMAGE_STATUS_META[image.status] || IMAGE_STATUS_META.pending;
  const tier = image.tier || 1;
  const tierBadge = TIER_BADGE[tier] || TIER_BADGE[1];
  const isDefault = !!image.isDefault;
  const isTierDefault = !!image.isDefaultForTier;
  const isGuide = !!image.isGuide && image.status === "approved";
  const generating = !image.url;

  const runConfirm = async (note) => {
    if (confirm?.kind === "approve") await onApprove(note);
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
        <span className={`absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded border ${tierBadge}`}>
          T{tier}
        </span>
        <span className={`absolute top-1.5 left-9 text-[10px] font-bold px-1.5 py-0.5 rounded border ${meta.badge}`}>
          {meta.label}
        </span>
        {isGuide && (
          <span className={`absolute top-1.5 right-1.5 text-[10px] font-black px-1.5 py-0.5 rounded ${GUIDE_BADGE}`}>
            {CREATURE_IMAGES_I18N.guideBadge}
          </span>
        )}
        {isTierDefault && (
          <span className="absolute bottom-1.5 right-1.5 text-amber-300" title="Default guide for this tier">
            <Crown className="w-3.5 h-3.5 fill-amber-300" />
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
        <div className="flex flex-col gap-1 px-2 pb-2">
          <div className="flex gap-1">
            {image.status !== "approved" && (
              <button
                onClick={() => setConfirm({ kind: "approve" })}
                disabled={busy}
                aria-label={CREATURE_IMAGES_I18N.approveAria}
                className="flex-1 flex items-center justify-center gap-1 bg-emerald-600/80 hover:bg-emerald-600 text-white text-[11px] font-semibold py-1.5 rounded-md disabled:opacity-60"
              >
                <Check className="w-3 h-3" /> {CREATURE_IMAGES_I18N.approveAsGuide}
              </button>
            )}
            {image.status !== "rejected" && (
              <button
                onClick={() => setConfirm({ kind: "reject" })}
                disabled={busy}
                aria-label={CREATURE_IMAGES_I18N.rejectAria}
                className="flex items-center justify-center gap-1 bg-red-700/70 hover:bg-red-700 text-white text-[11px] font-semibold py-1.5 rounded-md disabled:opacity-60"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {isGuide && (
            <>
              <div className="flex gap-1">
                <button
                  onClick={() => onSetTierDefault(image)}
                  disabled={busy}
                  aria-label={CREATURE_IMAGES_I18N.setTierDefaultAria}
                  className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold py-1.5 rounded-md ${
                    isTierDefault ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-white hover:bg-white/20"
                  } disabled:opacity-40`}
                >
                  <Crown className={`w-3 h-3 ${isTierDefault ? "fill-amber-300" : ""}`} /> {CREATURE_IMAGES_I18N.setTierDefault}
                </button>
                <button
                  onClick={onSetDefault}
                  disabled={busy}
                  aria-label={CREATURE_IMAGES_I18N.setDefaultAria}
                  className={`flex items-center justify-center px-2 py-1.5 rounded-md text-[11px] ${
                    isDefault ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-white hover:bg-white/20"
                  } disabled:opacity-40`}
                  title="Creature-level reference"
                >
                  <Star className={`w-3 h-3 ${isDefault ? "fill-amber-300" : ""}`} />
                </button>
              </div>
              <button
                onClick={() => onUseInGenerator(image)}
                disabled={busy}
                aria-label={CREATURE_IMAGES_I18N.useInGeneratorAria}
                className="flex items-center justify-center gap-1 bg-purple-600/70 hover:bg-purple-600 text-white text-[11px] font-semibold py-1.5 rounded-md disabled:opacity-60"
              >
                <Wand2 className="w-3 h-3" /> {CREATURE_IMAGES_I18N.useInGenerator}
              </button>
            </>
          )}
        </div>
      )}
      {confirm && (
        <ConfirmNoteModal
          title={confirm.kind === "approve" ? CREATURE_IMAGES_I18N.approveAsGuide : CREATURE_IMAGES_I18N.rejectImage}
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