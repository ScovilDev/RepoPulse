import { toneForScore } from '../score.js';

const TONE_COLORS = {
  green: '#2ea043',
  yellow: '#d29922',
  red: '#cf222e',
} as const;

export function badgeColor(score: number): string {
  return TONE_COLORS[toneForScore(score)];
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
}

/** Rough character-width estimate for Verdana 11px, used by shields-style badges. */
function textWidth(text: string): number {
  return Math.round(text.length * 6.2);
}

/**
 * Render a shields-style badge: `RepoPulse: 87/100`.
 * Pure SVG with no external fonts, images or scripts.
 */
export function renderSvgBadge(score: number): string {
  const safeScore = clampScore(score);
  const label = 'RepoPulse:';
  const value = `${safeScore}/100`;
  const color = badgeColor(safeScore);

  const padding = 6;
  const labelWidth = textWidth(label) + padding * 2;
  const valueWidth = textWidth(value) + padding * 2;
  const totalWidth = labelWidth + valueWidth;
  const labelCenter = labelWidth / 2 + 0.5;
  const valueCenter = labelWidth + valueWidth / 2;
  const title = escapeXml(`${label} ${value}`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${title}">
  <title>${title}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelCenter}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(label)}</text>
    <text x="${labelCenter}" y="14">${escapeXml(label)}</text>
    <text x="${valueCenter}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${valueCenter}" y="14">${value}</text>
  </g>
</svg>
`;
}
