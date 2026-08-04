import { getMatchLabel } from "../utils/matchLevel";
import type { MatchScore } from "../data/types";

interface ProgressRingProps {
  score: MatchScore;
  label: string; // "优化前" / "优化后"
}

const LEVEL_COLOR: Record<string, string> = {
  high: "#5db996", // 薄荷绿
  medium: "#f59e0b", // 琥珀黄
  low: "#ef4444", // 红
};

/** SVG 圆形进度环，中间显示分数 */
export function ProgressRing({ score, label }: ProgressRingProps) {
  const { score: value, level, keywordHits } = score;
  const size = 112;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = LEVEL_COLOR[level];
  const hitCount = keywordHits.filter((k) => k.hit).length;
  const total = keywordHits.length || 15;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e8f5f0"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-3xl font-bold"
            style={{ color }}
          >
            {value}
          </span>
          <span className="text-xs text-ink-muted">分</span>
        </div>
      </div>
      <div className="text-sm font-medium text-ink">{label}</div>
      <div className="text-xs text-ink-muted">
        关键词命中：{hitCount}/{total}
      </div>
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
        style={{ backgroundColor: `${color}1a`, color }}
      >
        {getMatchLabel(level)}
      </span>
    </div>
  );
}
