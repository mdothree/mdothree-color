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

const TW_DIRS = { 0: 't', 45: 'tr', 90: 'r', 135: 'br', 180: 'b', 225: 'bl', 270: 'l', 315: 'tl' };

export function gradientTailwind(stops, type = 'linear', angle = 90) {
  if (type === 'linear') {
    const dir = TW_DIRS[((angle % 360) + 360) % 360];
    if (dir) {
      return `bg-gradient-to-${dir} from-[${stops[0]}] ${stops.length > 2 ? `via-[${stops[Math.floor(stops.length/2)]}] ` : ''}to-[${stops[stops.length-1]}]`;
    }
  }
  // Radial, conic and non-45-degree linear gradients: Tailwind arbitrary value (spaces become underscores)
  const css = type === 'radial' ? radialGradientCSS(stops)
            : type === 'conic'  ? conicGradientCSS(stops)
            : linearGradientCSS(stops, angle);
  return `bg-[${css.replace(/, /g, ',').replace(/ /g, '_')}]`;
}
