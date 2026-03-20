// services/gradientGenerator.js

export function linearGradientCSS(stops, angle = 90) {
  const stopStr = stops.map((s, i) => `${s} ${Math.round((i / (stops.length - 1)) * 100)}%`).join(', ');
  return `linear-gradient(${angle}deg, ${stopStr})`;
}

export function radialGradientCSS(stops) {
  const stopStr = stops.map((s, i) => `${s} ${Math.round((i / (stops.length - 1)) * 100)}%`).join(', ');
  return `radial-gradient(circle, ${stopStr})`;
}

export function conicGradientCSS(stops) {
  const stopStr = stops.map((s, i) => `${s} ${Math.round((i / (stops.length - 1)) * 360)}deg`).join(', ');
  return `conic-gradient(${stopStr})`;
}

export function gradientTailwind(stops) {
  return `bg-gradient-to-r from-[${stops[0]}] ${stops.length > 2 ? `via-[${stops[Math.floor(stops.length/2)]}] ` : ''}to-[${stops[stops.length-1]}]`;
}
