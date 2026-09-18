import { CREATURE_ANATOMY, STYLE_REFERENCE_URL, CREATURE_STANCES, CREATURE_COLOR_PALETTES } from "@/lib/gameConstants";

// GenerateImage fetches reference images over the public internet, so private
// file URIs (base44.app/api/apps/.../files/...) can't be read and make the
// whole integration fail. Only pass publicly accessible URLs as references.
const isPublicRefUrl = (url) => !!url && !url.includes("base44.app/api/apps/");

// Shared AI-art prompt builder used by both the player card generator and the
// admin AI-deck generator, so both produce consistent, on-model artwork that
// respects admin-configured type backgrounds.
// The shared style-reference image is the ORIGINAL Tyrannosaurus Rex card art.
// Passing it as an img2img reference for EVERY creature biases the model toward
// a T-Rex body/head (the known "T-Rex leakage" bug), so it is only supplied when
// the creature being drawn actually IS a Tyrannosaurus Rex. For any other
// creature the art style is conveyed in prose, so the T-Rex subject cannot
// leak into the output.
const isStyleReferenceSubject = (baseName, isHybrid) =>
  !isHybrid && (baseName || "").toLowerCase() === "tyrannosaurus rex";

// Per-type colour gradients applied to the CREATURE only (not the background).
// The background stays a separate, atmospheric magical environment so the
// creature remains the focal point. Hyper Rare has no fixed gradient and falls
// back to a random palette.
const TYPE_COLOR_GRADIENTS = {
  Fire: ["#8B0000", "#FF2400", "#FF8C00", "#FFD700"],
  Lava: ["#1C1C1C", "#800000", "#FF2400", "#FF6A00"],
  Water: ["#0B3D91", "#1E90FF", "#00CED1", "#E0FFFF"],
  Ice: ["#AEEFFF", "#D6F5FF", "#FFFFFF", "#E6E6FA"],
  Rock: ["#2F4F4F", "#808080", "#C2B280", "#E5CDA7"],
  Wind: ["#FFFFFF", "#D6ECFF", "#ADD8E6", "#C0C0C0"],
  Earth: ["#5A3A1B", "#6B8E23", "#228B22", "#8A9A5B"],
  Magic: ["#4B0082", "#8A2BE2", "#00BFFF", "#FF66CC"],
};

export function buildCardImagePrompt(cardData, { typeBackgrounds = [], creatureDescription = "", referenceImageUrl = "" } = {}) {
  const stance = CREATURE_STANCES[Math.floor(Math.random() * CREATURE_STANCES.length)];
  const gradient = TYPE_COLOR_GRADIENTS[cardData.type];
  const palette = gradient
    ? `a color gradient flowing through ${gradient.join(" → ")}`
    : CREATURE_COLOR_PALETTES[Math.floor(Math.random() * CREATURE_COLOR_PALETTES.length)];
  const bgRef = typeBackgrounds.find((b) => b.type === cardData.type && isPublicRefUrl(b.imageUrl));
  const backgroundInstruction = (bgRef
    ? `Include a background environment that matches the elemental mood, colors, and setting of the additional background reference image provided — use that reference ONLY for its environment style, do not copy any creature or object from it.`
    : `Include a background environment that fits a ${cardData.type} elemental setting (e.g. lava fields for Lava, icy tundra for Ice, storm clouds for Wind).`) + ` The background must NOT reuse the creature's color gradient — keep it a separate, atmospheric, magical ${cardData.type} environment that contrasts with the creature so the creature stays the clear focal point.`;

  const publicReferenceUrl = isPublicRefUrl(referenceImageUrl) ? referenceImageUrl : "";
  const referenceInstruction = publicReferenceUrl
    ? ` An admin-approved reference image of this exact creature is also provided — match its head shape, body structure, and anatomy precisely; only vary its pose and color scheme as instructed above, and ignore its background.`
    : "";

  // Only the Tyrannosaurus Rex creature pairs with the T-Rex style reference
  // image — for every other creature it leaks T-Rex anatomy into the output.
  const includeStyleRef = isStyleReferenceSubject(cardData.baseName, cardData.isHybrid);
  const styleInstruction = includeStyleRef
    ? `Use the style reference image ONLY for its art style, lighting, and mystical trading-card aesthetic — its actual creature, colors, face, head shape, and pose must be completely ignored and NOT copied.`
    : `Render in a mystical fantasy trading-card art style: rich painterly saturated colors, dramatic rim lighting, full-body digital-painting creature illustration with clean, sharp separation from the background. Do NOT incorporate any subject, pose, head shape, or body plan from any creature other than the one described above.`;

  const noTRexInstruction = ` Do NOT give it a Tyrannosaurus Rex or generic dinosaur face, head, or body unless it is actually a Tyrannosaurus Rex — the head and body shape described above must be followed precisely.`;

  const prompt = cardData.isHybrid
    ? `A hybrid creature combining two creatures into one, robot-style, design guide: ${cardData.baseName} — ${creatureDescription}. Pose: ${stance}. Color the creature with ${palette}. Dynamic full-body illustration true to this exact hybrid description and anatomy. CRITICAL:${noTRexInstruction}${referenceInstruction} ${styleInstruction} ${backgroundInstruction} The creature must remain the clear, sharply rendered focal point standing out from the background. No text, no border, no frame`
    : `A ${cardData.type}-type ${cardData.baseName}. Its head, face, and full body must look EXACTLY like this: ${creatureDescription || CREATURE_ANATOMY[cardData.baseName] || `a creature true to a real ${cardData.baseName}`}. Pose: ${stance}. Color the creature with ${palette}. Dynamic full-body creature illustration, anatomically true to this exact creature.${noTRexInstruction}${referenceInstruction} ${styleInstruction} ${backgroundInstruction} The creature must remain the clear, sharply rendered focal point standing out from the background. No text, no border, no frame`;

  const existingImageUrls = [];
  if (includeStyleRef) existingImageUrls.push(STYLE_REFERENCE_URL);
  if (bgRef) existingImageUrls.push(bgRef.imageUrl);
  if (publicReferenceUrl) existingImageUrls.push(publicReferenceUrl);
  return { prompt, existingImageUrls };
}