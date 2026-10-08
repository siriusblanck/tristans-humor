import styles from "./scene.module.css";

// Low Memorial Library, front elevation, in the night palette: the shallow dome, the drum's
// three thermal windows, the ten-column portico, the wings, the steps with Alma Mater, and
// two lamps. Drawn for a 1200 × 560 frame; the plaza runs past the frame's edges so wide and
// tall windows never show the drawing's border.

const COLUMNS = Array.from({ length: 10 }, (_, i) => 330 + i * 60);
const RIBS = [420, 470, 520, 680, 730, 780];
const THERMAL_WINDOWS = [470, 600, 730];
const WING_WINDOWS = [192, 228, 264, 900, 936, 972].flatMap((x, i) => [326, 398].map((y, j) => ({ x, y, lit: (i + j) % 3 === 0 })));
const STEPS = Array.from({ length: 10 }, (_, s) => ({ y: 484 + s * 7.6, x: 280 - s * 34, width: 640 + s * 68, shade: s % 2 ? "#18204D" : "#1E275A" }));
const LAMPS = [250, 950];

export default function LowLibrary() {
  return (
    <svg className={styles.low} viewBox="0 0 1200 560" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <defs>
        <radialGradient id="low-haze" cx="50%" cy="40%" r="46%"><stop offset="0" stopColor="#B9D9EB" stopOpacity=".16" /><stop offset="1" stopColor="#B9D9EB" stopOpacity="0" /></radialGradient>
        <linearGradient id="low-dome" x1="0" x2="1"><stop offset="0" stopColor="#1A2252" /><stop offset=".62" stopColor="#2A3570" /><stop offset="1" stopColor="#3E4B8C" /></linearGradient>
        <linearGradient id="low-stone" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2A3570" /><stop offset="1" stopColor="#161E48" /></linearGradient>
        <linearGradient id="low-column" x1="0" x2="1"><stop offset="0" stopColor="#222C62" /><stop offset=".6" stopColor="#3E4B8C" /><stop offset="1" stopColor="#26306A" /></linearGradient>
        <radialGradient id="low-lamp"><stop offset="0" stopColor="#F2C46B" stopOpacity=".4" /><stop offset="1" stopColor="#F2C46B" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="600" cy="250" rx="580" ry="270" fill="url(#low-haze)" />
      <rect x="-3000" y="560" width="7200" height="2400" fill="#161E47" />
      <rect x="170" y="300" width="860" height="184" fill="#141B45" />
      <rect x="160" y="292" width="880" height="10" fill="#26306A" />
      {WING_WINDOWS.map(({ x, y, lit }) => (
        <rect key={`${x}-${y}`} className={lit ? styles.lit : undefined} x={x} y={y} width="16" height="36" rx="1.5" fill="#F2C46B" opacity={lit ? 0.45 : 0.1} />
      ))}
      <path d="M360 204A240 126 0 0 1 840 204Z" fill="url(#low-dome)" />
      {RIBS.map((bx) => (
        <path key={bx} d={`M600 78Q${600 + (bx - 600) * 0.92} 98 ${bx} 204`} stroke="rgba(185,217,235,.12)" strokeWidth="1.3" fill="none" />
      ))}
      <path d="M600 78A240 126 0 0 1 840 204" stroke="rgba(185,217,235,.45)" strokeWidth="2" fill="none" />
      <rect x="592" y="62" width="16" height="17" fill="#2A3570" />
      <circle cx="600" cy="58" r="6" fill="#3E4B8C" />
      <rect x="350" y="204" width="500" height="12" fill="#2A3570" />
      <rect x="338" y="216" width="524" height="12" fill="#1F2858" />
      <rect x="372" y="228" width="456" height="84" fill="url(#low-stone)" />
      {THERMAL_WINDOWS.map((cx) => (
        <g key={cx}>
          <path className={styles.lit} d={`M${cx - 36} 300A36 36 0 0 1 ${cx + 36} 300Z`} fill="#F2C46B" opacity=".5" />
          <path d={`M${cx - 12} 300V268M${cx + 12} 300V268M${cx - 36} 300H${cx + 36}`} stroke="#141B45" strokeWidth="3" />
        </g>
      ))}
      <rect x="290" y="312" width="620" height="10" fill="#3B4888" />
      <rect x="300" y="322" width="600" height="34" fill="url(#low-stone)" />
      <path d="M336 339H864" stroke="rgba(237,226,200,.16)" strokeWidth="3" strokeDasharray="7 4" />
      <rect x="300" y="356" width="600" height="117" fill="#0B1030" />
      <rect className={styles.lit} x="576" y="394" width="48" height="79" fill="#F2C46B" opacity=".3" />
      <rect x="452" y="402" width="24" height="40" fill="#F2C46B" opacity=".14" />
      <rect x="724" y="402" width="24" height="40" fill="#F2C46B" opacity=".14" />
      {COLUMNS.map((cx) => (
        <g key={cx}>
          <rect x={cx - 17} y="356" width="34" height="9" fill="#3B4888" />
          <circle cx={cx - 13} cy="362" r="4.5" fill="#34407C" />
          <circle cx={cx + 13} cy="362" r="4.5" fill="#34407C" />
          <rect x={cx - 11} y="365" width="22" height="100" fill="url(#low-column)" />
          <path d={`M${cx - 4} 368V462M${cx + 4} 368V462`} stroke="rgba(11,16,48,.25)" strokeWidth="1" />
          <rect x={cx - 16} y="465" width="32" height="8" fill="#2A3570" />
        </g>
      ))}
      <rect x="280" y="473" width="640" height="11" fill="#2A3570" />
      {STEPS.map(({ y, x, width, shade }) => (
        <g key={y}>
          <rect x={x} y={y} width={width} height="7.7" fill={shade} />
          <path d={`M${x} ${y}H${x + width}`} stroke="rgba(185,217,235,.08)" />
        </g>
      ))}
      <rect x="586" y="512" width="28" height="24" fill="#10173D" />
      <path d="M589 512L611 512L607 492L593 492Z" fill="#141B45" />
      <circle cx="600" cy="486" r="5" fill="#141B45" />
      <path d="M594 497L580 490M606 497L620 490M620 490L623 470" stroke="#141B45" strokeWidth="3" strokeLinecap="round" />
      <path d="M600 481A5 5 0 0 1 605 486M607 492L611 512" stroke="rgba(185,217,235,.35)" strokeWidth="1" fill="none" />
      {LAMPS.map((x) => (
        <g key={x}>
          <circle cx={x} cy="414" r="70" fill="url(#low-lamp)" />
          <rect x={x - 2.5} y="420" width="5" height="140" fill="#0E1438" />
          <path d={`M${x - 9} 406H${x + 9}L${x} 397Z`} fill="#0E1438" />
          <rect className={styles.lit} x={x - 7} y="406" width="14" height="16" rx="2" fill="#F2C46B" opacity=".9" />
        </g>
      ))}
    </svg>
  );
}
