export type CourseColor = {
  bg: string;    // background color (hex)
  text: string;  // text color (hex)
  border: string;// border color (hex)
};

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;

  if (hh >= 0 && hh < 1) { r1 = c; g1 = x; b1 = 0; }
  else if (hh >= 1 && hh < 2) { r1 = x; g1 = c; b1 = 0; }
  else if (hh >= 2 && hh < 3) { r1 = 0; g1 = c; b1 = x; }
  else if (hh >= 3 && hh < 4) { r1 = 0; g1 = x; b1 = c; }
  else if (hh >= 4 && hh < 5) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }

  const m = l - c / 2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function relativeLuminance(r: number, g: number, b: number): number {
  const srgb = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

export function getCourseColor(courseCode: string): CourseColor {
  const key = (courseCode || "").trim().toUpperCase();
  const h = hashString(key);

  // Spread hues around the wheel
  const hue = h % 360;
  const sat = 0.62;
  const light = 0.42;

  const { r, g, b } = hslToRgb(hue, sat, light);
  const bg = rgbToHex(r, g, b);

  // Slightly darker border for definition
  const { r: br, g: bg2, b: bb } = hslToRgb(hue, sat, Math.max(0, light - 0.08));
  const border = rgbToHex(br, bg2, bb);

  const lum = relativeLuminance(r, g, b);
  const text = lum < 0.45 ? "#FFFFFF" : "#0B0B0B";

  return { bg, text, border };
}
