import {
  type ComputationResult,
  CATEGORIES,
  SIGN_COLORS,
  SIGN_NAMES,
  getPeakAndTrough,
} from "@/lib/varga-engine";

/**
 * Build a self-contained, printable HTML report of the varga analysis.
 *
 * Kept out of the component so the report markup (and its embedded stylesheet)
 * lives in one place and the export handler stays a one-liner.
 */
export function buildVargaHtmlReport(data: ComputationResult): string {
  const catRows = CATEGORIES.map(({ name, color, key }) => {
    const { peak, trough } = getPeakAndTrough(data[key]);
    return `<tr><td style="color:${color};font-weight:600">${name}</td><td>${peak}</td><td>${trough}</td><td>${peak - trough}</td></tr>`;
  }).join("");

  const signRows = Array.from({ length: 12 }, (_, i) => {
    const snum = i + 1;
    const { peak, trough } = getPeakAndTrough(data.signIvs[snum]);
    return `<tr><td style="color:${SIGN_COLORS[i]};font-weight:600">${SIGN_NAMES[snum]}</td><td>${peak}</td><td>${trough}</td><td>${peak - trough}</td></tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Varga Sign Analysis Report</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#0e0e14;color:#dcd8f0;padding:2rem;max-width:900px;margin:0 auto}
h1{font-size:1.5rem;background:linear-gradient(135deg,#9b7fe8,#f0c060);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:0.5rem}
h2{font-size:1.1rem;color:#9b7fe8;margin:1.5rem 0 0.5rem;border-bottom:1px solid #4a4860;padding-bottom:0.3rem}
table{width:100%;border-collapse:collapse;margin:0.5rem 0}
th,td{padding:0.4rem 0.6rem;text-align:left;border-bottom:1px solid rgba(74,72,96,0.3)}
th{color:#9b7fe8;font-size:0.8rem;text-transform:uppercase}
td{font-size:0.85rem}
.meta{color:#4a4860;font-size:0.75rem;margin-bottom:2rem}
.bar{height:8px;border-radius:4px;background:rgba(74,72,96,0.2);margin:2px 0}
.bar-fill{height:100%;border-radius:4px;opacity:0.85}
</style>
</head>
<body>
<h1>Varga Sign Analysis Report</h1>
<p class="meta">Generated ${new Date().toISOString()} | ${data.totalBoundaries.toLocaleString()} boundaries | ${data.totalIntervals.toLocaleString()} intervals | 16 vargas | 12 signs</p>

<h2>Category Peak &amp; Trough</h2>
<table><tr><th>Category</th><th>Peak</th><th>Trough</th><th>Range</th></tr>${catRows}</table>

<h2>Sign Peak &amp; Trough</h2>
<table><tr><th>Sign</th><th>Peak</th><th>Trough</th><th>Range</th></tr>${signRows}</table>

<p style="color:#4a4860;font-size:0.7rem;margin-top:2rem;text-align:center">
Varga Sign Analysis — Exact boundary computation using fractional arithmetic
</p>
</body></html>`;
}
