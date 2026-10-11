// PROTOTYPE (#128). Prints the WCAG 2.x contrast ratio of every text and rule colour against its
// page background, today's and the tuned one, for both themes:
//   node prototypes/tuned-ledger/contrast.mjs          (a Markdown table)
//   node prototypes/tuned-ledger/contrast.mjs --json
import { PALETTES, ROLES } from "./tokens.js";

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((at) => {
    const channel = Number.parseInt(hex.slice(at, at + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const rows = [];
for (const theme of ["light", "dark"]) {
  for (const [role, use] of ROLES) {
    const measure = (palette) => {
      const colours = PALETTES[palette][theme];
      return {
        colour: colours[role],
        ratio: Number(contrast(colours[role], colours.bg).toFixed(2)),
      };
    };
    rows.push({ theme, role, use, today: measure("today"), tuned: measure("tuned") });
  }
  // The live row's tint is a second background: the text on it is measured against it.
  for (const [role, use] of [
    ["fg", "Body text on a live row"],
    ["fg-4", "Asides on a live row"],
  ]) {
    const measure = (palette) => {
      const colours = PALETTES[palette][theme];
      return {
        colour: colours[role],
        ratio: Number(contrast(colours[role], colours["live-tint"]).toFixed(2)),
      };
    };
    rows.push({ theme, role, use, today: measure("today"), tuned: measure("tuned") });
  }
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  console.log("| Theme | Use | Today | Ratio | Tuned | Ratio |");
  console.log("| --- | --- | --- | ---: | --- | ---: |");
  for (const row of rows) {
    console.log(
      `| ${row.theme} | ${row.use} | \`${row.today.colour}\` | ${row.today.ratio.toFixed(2)} | \`${row.tuned.colour}\` | ${row.tuned.ratio.toFixed(2)} |`,
    );
  }
}
