export type PrivacySettings = {
  birthdate?: boolean;
  whatsapp?: boolean;
  instagram?: boolean;
  website?: boolean;
  bio?: boolean;
  batch?: boolean;
};

export const DEFAULT_PRIVACY_SETTINGS: Required<PrivacySettings> = {
  birthdate: false,
  whatsapp: false,
  instagram: true,
  website: true,
  bio: true,
  batch: true,
};

export function resolvePrivacy(settings?: PrivacySettings | null) {
  return { ...DEFAULT_PRIVACY_SETTINGS, ...(settings || {}) };
}

export function normalizeUrl(value?: string | null) {
  if (!value) return '';
  const cleaned = value.trim();
  if (!cleaned) return '';
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `https://${cleaned}`;
}

export function instagramUrl(value?: string | null) {
  if (!value) return '';
  const cleaned = value.trim();
  if (!cleaned) return '';
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `https://instagram.com/${cleaned.replace(/^@/, '')}`;
}

export function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '').trim();
  if (!/^[\da-f]{6}$/i.test(normalized)) return { r: 23, g: 91, b: 69 };
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0')).join('')}`;
}

export function readableTextColor(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.56 ? '#18201d' : '#ffffff';
}

export function roleBadgeStyle(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const text = readableTextColor(hex);
  return {
    background: `rgba(${r}, ${g}, ${b}, 0.18)`,
    color: text === '#ffffff' ? hex : '#18201d',
    borderColor: `rgba(${r}, ${g}, ${b}, 0.38)`,
  };
}

export function solidRoleStyle(hex: string) {
  return {
    background: hex,
    color: readableTextColor(hex),
    borderColor: hex,
  };
}
