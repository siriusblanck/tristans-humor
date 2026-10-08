/** Each cast member keeps the card hue they had in the original letter gallery. */
export function characterHue(sortOrder: number) {
  return (sortOrder * 41 + 14) % 360;
}
