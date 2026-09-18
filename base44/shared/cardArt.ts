// Server-side mirror of the card-art prompt builders in src/lib/cardImagePrompt.js
// and the live-AI-card prompt in src/hooks/useBattleMatch.js.
//
// Kept in sync manually with src/lib/gameConstants.js (only the art-related
// constants). Used by the generateCardArt / generateAiCardArt backend functions
// so the restricted GenerateImage Core integration is never called from the
// client; the client passes only the narrow card identity and the server owns
// the prompt + reference-image selection.

export const STYLE_REFERENCE_URL = "https://media.base44.com/images/public/6a4fdbc484df527c16219edb/636b60708_Style.png";

export const CREATURE_COLOR_PALETTES = [
  "deep crimson and gold",
  "emerald green and bronze",
  "royal purple and silver",
  "midnight blue and electric cyan",
  "burnt orange and charcoal black",
  "jade green and copper",
  "ruby red and obsidian black",
  "sapphire blue and pale gold",
  "amethyst purple and jet black",
  "sunset orange and deep magenta",
  "steel gray and neon teal",
  "forest green and burnt sienna",
];

export const CREATURE_STANCES = [
  "in an aggressive roaring stance, baring its full power",
  "crouched low in a hunting stance, ready to strike",
  "standing tall in a majestic, commanding pose",
  "captured mid-motion in a powerful charging pose",
  "rearing up dramatically, showcasing its full form",
  "in a fierce battle-ready pose with its weapons bared",
  "coiled and poised to strike",
  "leaping forward in a dynamic mid-air attack pose",
];

export const CREATURE_ANATOMY: Record<string, string> = {
  "Tyrannosaurus Rex": "a massive bipedal theropod dinosaur with a huge head, powerful jaws lined with sharp teeth, tiny clawed arms, a thick muscular tail, and heavy clawed feet",
  "Velociraptor": "a lean, feathered bipedal raptor with sickle-shaped claws on its feet, a long stiff tail, and a narrow snout",
  "Triceratops": "a quadrupedal dinosaur with a large bony neck frill, three long horns on its face, and a stocky armored body",
  "Stegosaurus": "a quadrupedal dinosaur with a row of large bony plates running along its spine and sharp spikes at the end of its tail",
  "Spinosaurus": "a long-snouted semi-aquatic dinosaur with a tall sail-like fin running down its back and powerful clawed forelimbs",
  "Brachiosaurus": "a massive long-necked quadrupedal dinosaur with a tiny head high above its shoulders and thick pillar-like legs",
  "Ankylosaurus": "a low, wide, heavily armored quadrupedal dinosaur covered in bony plates with a heavy club at the end of its tail",
  "Pterodactyl": "a flying reptile with long leathery wings stretched between elongated finger bones, a crested head, and a sharp beak — no legs used for standing, shown airborne or perched",
  "Woolly Mammoth": "a massive furry elephant-like creature with long curved tusks, small ears, and thick shaggy fur",
  "Saber-Tooth Tiger": "a muscular big cat with an extremely long pair of curved saber fangs jutting from its upper jaw",
  "Dodo Bird": "a plump flightless bird with a large curved beak, small stubby wings, and stout legs",
  "Giant Sloth": "a huge shaggy-furred ground sloth with long curved claws and a hunched, lumbering posture",
  "Cave Bear": "a massive prehistoric bear with a broad skull, thick fur, and powerful clawed paws",
  "Irish Elk": "a large deer with enormous palmate antlers spanning wider than its entire body",
  "Dire Wolf": "a large, muscular wolf with a broad skull, thick fur, and powerful jaws",
  "Moa Bird": "a tall flightless bird with a long neck, small head, and powerful legs — no visible wings",
  "Fire Dragon": "a serpentine reptilian dragon standing on four clawed legs, with large leathery bat-like wings, a long sinuous scaled body, horns on its head, and a long whip-like tail — never a bipedal dinosaur silhouette",
  "Phoenix": "a majestic fire bird with vast blazing feathered wings, a long flowing tail of flame, and an elegant crested head",
  "Griffin": "a creature with the front half of an eagle — including feathered wings, a hooked beak, and taloned front legs — and the hind half of a lion",
  "Kraken": "a colossal octopus/squid-like sea monster with a large soft bulbous head, big round eyes, a small beak-like mouth with NO teeth and NO reptilian jaw, and many long writhing rubbery tentacles covered in suckers instead of legs or arms — never a toothy reptilian face",
  "Chimera": "a creature with a lion's muscular body, a goat's head emerging from its back, and a serpent's head at the end of its tail",
  "Hydra": "a serpentine reptilian body with multiple long necks, each ending in its own snarling reptilian head",
  "Basilisk": "a giant legless serpent with a crowned, crested head and hypnotic glowing eyes",
  "Unicorn": "a graceful horse-like creature with a single long spiraled horn on its forehead and a flowing mane and tail",
};

// GenerateImage fetches reference images over the public internet, so private
// file URIs (base44.app/api/apps/.../files/...) can't be read and make the
// whole integration fail. Only pass publicly accessible URLs as references.
const isPublicRefUrl = (url: string) => !!url && !url.includes("base44.app/api/apps/");

const isStyleReferenceSubject = (baseName: string, isHybrid: boolean) =>
  !isHybrid && (baseName || "").toLowerCase() === "tyrannosaurus rex";

// Per-type colour gradients applied to the CREATURE only (not the background).
// The background stays a separate, atmospheric magical environment so the
// creature remains the focal point. Hyper Rare has no fixed gradient and falls
// back to a random palette.
const TYPE_COLOR_GRADIENTS: Record<string, string[]> = {
  Fire: ["#8B0000", "#FF2400", "#FF8C00", "#FFD700"],
  Lava: ["#1C1C1C", "#800000", "#FF2400", "#FF6A00"],
  Water: ["#0B3D91", "#1E90FF", "#00CED1", "#E0FFFF"],
  Ice: ["#AEEFFF", "#D6F5FF", "#FFFFFF", "#E6E6FA"],
  Rock: ["#2F4F4F", "#808080", "#C2B280", "#E5CDA7"],
  Wind: ["#FFFFFF", "#D6ECFF", "#ADD8E6", "#C0C0C0"],
  Earth: ["#5A3A1B", "#6B8E23", "#228B22", "#8A9A5B"],
  Magic: ["#4B0082", "#8A2BE2", "#00BFFF", "#FF66CC"],
};

const randomFrom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export interface CardArtInput {
  baseName: string;
  type: string;
  isHybrid?: boolean;
}

export interface ResolvedArtContext {
  typeBackgrounds: { type: string; imageUrl: string }[];
  creatureDescription?: string;
  referenceImageUrl?: string;
}

// Port of src/lib/cardImagePrompt.js buildCardImagePrompt. Builds the full
// creature-card prompt + the reference-image list, using admin-configured type
// backgrounds and the creature's approved reference image when present.
export function buildCardImagePrompt(cardData: CardArtInput, ctx: ResolvedArtContext = { typeBackgrounds: [] }) {
  const stance = randomFrom(CREATURE_STANCES);
  const gradient = TYPE_COLOR_GRADIENTS[cardData.type];
  const palette = gradient
    ? `a color gradient flowing through ${gradient.join(" → ")}`
    : randomFrom(CREATURE_COLOR_PALETTES);
  const bgRef = ctx.typeBackgrounds.find((b) => b.type === cardData.type && isPublicRefUrl(b.imageUrl));
  const backgroundInstruction = (bgRef
    ? `Include a background environment that matches the elemental mood, colors, and setting of the additional background reference image provided — use that reference ONLY for its environment style, do not copy any creature or object from it.`
    : `Include a background environment that fits a ${cardData.type} elemental setting (e.g. lava fields for Lava, icy tundra for Ice, storm clouds for Wind).`) + ` The background must NOT reuse the creature's color gradient — keep it a separate, atmospheric, magical ${cardData.type} environment that contrasts with the creature so the creature stays the clear focal point.`;

  const publicReferenceUrl = isPublicRefUrl(ctx.referenceImageUrl || "") ? (ctx.referenceImageUrl as string) : "";
  const referenceInstruction = publicReferenceUrl
    ? ` An admin-approved reference image of this exact creature is also provided — match its head shape, body structure, and anatomy precisely; only vary its pose and color scheme as instructed above, and ignore its background.`
    : "";

  const includeStyleRef = isStyleReferenceSubject(cardData.baseName, !!cardData.isHybrid);
  const styleInstruction = includeStyleRef
    ? `Use the style reference image ONLY for its art style, lighting, and mystical trading-card aesthetic — its actual creature, colors, face, head shape, and pose must be completely ignored and NOT copied.`
    : `Render in a mystical fantasy trading-card art style: rich painterly saturated colors, dramatic rim lighting, full-body digital-painting creature illustration with clean, sharp separation from the background. Do NOT incorporate any subject, pose, head shape, or body plan from any creature other than the one described above.`;

  const noTRexInstruction = ` Do NOT give it a Tyrannosaurus Rex or generic dinosaur face, head, or body unless it is actually a Tyrannosaurus Rex — the head and body shape described above must be followed precisely.`;

  const creatureDescription = ctx.creatureDescription || "";
  const prompt = cardData.isHybrid
    ? `A hybrid creature combining two creatures into one, robot-style, design guide: ${cardData.baseName} — ${creatureDescription}. Pose: ${stance}. Color the creature with ${palette}. Dynamic full-body illustration true to this exact hybrid description and anatomy. CRITICAL:${noTRexInstruction}${referenceInstruction} ${styleInstruction} ${backgroundInstruction} The creature must remain the clear, sharply rendered focal point standing out from the background. No text, no border, no frame`
    : `A ${cardData.type}-type ${cardData.baseName}. Its head, face, and full body must look EXACTLY like this: ${creatureDescription || CREATURE_ANATOMY[cardData.baseName] || `a creature true to a real ${cardData.baseName}`}. Pose: ${stance}. Color the creature with ${palette}. Dynamic full-body creature illustration, anatomically true to this exact creature.${noTRexInstruction}${referenceInstruction} ${styleInstruction} ${backgroundInstruction} The creature must remain the clear, sharply rendered focal point standing out from the background. No text, no border, no frame`;

  const existingImageUrls: string[] = [];
  if (includeStyleRef) existingImageUrls.push(STYLE_REFERENCE_URL);
  if (bgRef) existingImageUrls.push(bgRef.imageUrl);
  if (publicReferenceUrl) existingImageUrls.push(publicReferenceUrl);
  return { prompt, existingImageUrls };
}

// Simple live-AI-card prompt (port of the inline prompt in useBattleMatch).
// Uses only the shared style-reference image; no type background or creature
// description, matching the original live-battle art exactly.
export function buildAiCardPrompt(cardData: CardArtInput) {
  const prompt = `A ${cardData.type}-type ${cardData.baseName}, dynamic full-body creature illustration, matching the exact art style, color palette, lighting, and mystical trading-card aesthetic of the reference image, centered on a plain background, no text, no border, no frame`;
  return { prompt, existingImageUrls: [STYLE_REFERENCE_URL] };
}

// Egg-hatch recolour: the admin-stored baby image is the base. The model must
// keep the creature's pose, anatomy, face, and art style IDENTICAL to the source
// image, recolour the creature's body to the card type's gradient, AND place the
// creature on a fitting elemental type background (matching standard card
// creation). Used by hatchEgg so a hatched card looks like the stored egg-creature
// art, recoloured, on the correct type background.
export function buildEggHatchRecolorPrompt(
  cardData: CardArtInput,
  eggBabyImageUrl: string,
  typeBackgrounds: { type: string; imageUrl: string }[] = []
) {
  const gradient = TYPE_COLOR_GRADIENTS[cardData.type];
  const palette = gradient
    ? `a color gradient flowing through ${gradient.join(" → ")}`
    : randomFrom(CREATURE_COLOR_PALETTES);
  const bgRef = typeBackgrounds.find((b) => b.type === cardData.type && isPublicRefUrl(b.imageUrl));
  const backgroundInstruction = bgRef
    ? `Place the creature on a NEW background environment that matches the elemental mood, colors, and setting of the additional background reference image provided — use that reference ONLY for its environment style, do not copy any creature or object from it.`
    : `Place the creature on a NEW background environment that fits a ${cardData.type} elemental setting (e.g. lava fields for Lava, icy tundra for Ice, storm clouds for Wind).`;
  // Framed as "paint a scene around this creature" (compositing) rather than
  // "replace the plain background" (which maps to transparency/edit tasks and
  // primes the model to paint a literal checkerboard as the new background).
  // No negative prompts ("NO checkerboard") — those paradoxically summon the
  // artefact. Only positive, fully-rendered-painting language.
  const prompt = `Use the provided creature illustration as the character reference. Keep the creature's pose, anatomy, body structure, face, and art style IDENTICAL to the reference — do not redesign or restructure the creature. Recolor only the creature's body (skin, scales, fur, feathers, hide) using ${palette}, applied smoothly across the creature while preserving all shading, highlights, and texture detail. Then paint a complete, fully rendered, completely opaque ${cardData.type} elemental environment around the creature and place the recoloured creature standing within it. ${backgroundInstruction} The environment must be a separate, atmospheric, magical ${cardData.type} scene that contrasts with the creature's color gradient so the creature stays the clear focal point. The entire image must be a finished, fully opaque painting with every area completely filled in — a complete illustration, nothing left blank. Output the recoloured creature within the ${cardData.type} environment. No text, no border, no frame.`;
  const existingImageUrls = [eggBabyImageUrl];
  if (bgRef) existingImageUrls.push(bgRef.imageUrl);
  return { prompt, existingImageUrls };
}