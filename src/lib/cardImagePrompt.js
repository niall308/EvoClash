import { CREATURE_ANATOMY, STYLE_REFERENCE_URL, CREATURE_STANCES, CREATURE_COLOR_PALETTES } from "@/lib/gameConstants";

// GenerateImage fetches reference images over the public internet, so private
// file URIs (base44.app/api/apps/.../files/...) can't be read and make the
// whole integration fail. Only pass publicly accessible URLs as references.
const isPublicRefUrl = (url) => !!url && !url.includes("base44.app/api/apps/");

// Shared AI-art prompt builder used by both the player card generator and the
// admin AI-deck generator, so both produce consistent, on-model artwork that
// respects admin-configured type backgrounds.
export function buildCardImagePrompt(cardData, { typeBackgrounds = [], creatureDescription = "", referenceImageUrl = "" } = {}) {
  const stance = CREATURE_STANCES[Math.floor(Math.random() * CREATURE_STANCES.length)];
  const palette = CREATURE_COLOR_PALETTES[Math.floor(Math.random() * CREATURE_COLOR_PALETTES.length)];
  const bgRef = typeBackgrounds.find((b) => b.type === cardData.type && isPublicRefUrl(b.imageUrl));
  const backgroundInstruction = bgRef
    ? `Include a background environment that matches the elemental mood, colors, and setting of the additional background reference image provided — use that reference ONLY for its environment style, do not copy any creature or object from it.`
    : `Include a background environment that fits a ${cardData.type} elemental setting (e.g. lava fields for Lava, icy tundra for Ice, storm clouds for Wind).`;

  const publicReferenceUrl = isPublicRefUrl(referenceImageUrl) ? referenceImageUrl : "";
  const referenceInstruction = publicReferenceUrl
    ? ` An admin-approved reference image of this exact creature is also provided — match its head shape, body structure, and anatomy precisely; only vary its pose and color scheme as instructed above, and ignore its background.`
    : "";

  const prompt = cardData.isHybrid
    ? `A hybrid creature combining two creatures into one, robot-style, design guide: ${cardData.baseName} — ${creatureDescription}. Pose: ${stance}. Give the creature its own distinct color scheme of ${palette}. Dynamic full-body illustration true to this exact hybrid description and anatomy. CRITICAL: Match ONLY the art style, lighting, and mystical trading-card aesthetic of the reference image — its actual creature, colors, face, head shape, and pose must be completely ignored and NOT copied.${referenceInstruction} ${backgroundInstruction} The creature must remain the clear, sharply rendered focal point standing out from the background. No text, no border, no frame`
    : `A ${cardData.type}-type ${cardData.baseName}. Its head, face, and full body must look EXACTLY like this: ${creatureDescription || CREATURE_ANATOMY[cardData.baseName] || `a creature true to a real ${cardData.baseName}`}. Pose: ${stance}. Give the creature its own distinct color scheme of ${palette}. Dynamic full-body creature illustration, anatomically true to this exact creature. CRITICAL: Do NOT give it a Tyrannosaurus Rex or generic dinosaur face/head unless it is actually a Tyrannosaurus Rex — the head shape above must be followed precisely.${referenceInstruction} Use the style reference image ONLY for its art style, lighting, and mystical trading-card aesthetic — its actual creature, colors, face, head shape, and pose must be completely ignored and NOT copied. ${backgroundInstruction} The creature must remain the clear, sharply rendered focal point standing out from the background. No text, no border, no frame`;

  const existingImageUrls = [STYLE_REFERENCE_URL];
  if (bgRef) existingImageUrls.push(bgRef.imageUrl);
  if (publicReferenceUrl) existingImageUrls.push(publicReferenceUrl);
  return { prompt, existingImageUrls };
}