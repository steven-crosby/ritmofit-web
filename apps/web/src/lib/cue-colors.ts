/**
 * The cue-tag palette (design system `02-color-system.md`). `cues.color` is a
 * free hex in the data model, but the picker rations the brand: instructors
 * choose from copper / cyan / amber / ember / bone tags — never the reserved
 * **plasma** peak accent (`#FF2E88` / `#FF6AAE` / `#D11A68`), which stays for
 * All-Out glow and the Live sprint pulse only. Rationing is enforced here, not
 * in the column. Hex values are the design-token primitives (`tokens.json`).
 */
export type CueColorTag = { name: string; hex: string };

export const CUE_COLOR_TAGS: readonly CueColorTag[] = [
  { name: 'Copper', hex: '#E07E3C' }, // copper-400 (brand)
  { name: 'Cyan', hex: '#3AC0D4' }, // cyan-400
  { name: 'Amber', hex: '#F2B838' }, // amber-400
  { name: 'Ember', hex: '#E8654F' }, // ember-400
  { name: 'Bone', hex: '#C9BEAA' }, // bone-300 (neutral)
];

/** Case-insensitive lookup of a tag's display name; `null` for an unknown hex. */
export function tagLabel(hex: string): string | null {
  const target = hex.toLowerCase();
  return CUE_COLOR_TAGS.find((t) => t.hex.toLowerCase() === target)?.name ?? null;
}
