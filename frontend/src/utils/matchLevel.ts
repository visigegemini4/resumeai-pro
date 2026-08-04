import type { MatchScore } from "../data/types";

/** 匹配度等级判定（≥80 高 / 50-79 中 / <50 低） */
export function getMatchLevel(score: number): "high" | "medium" | "low" {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

/** 等级对应的中文标签 */
export function getMatchLabel(level: "high" | "medium" | "low"): string {
  if (level === "high") return "匹配度较高";
  if (level === "medium") return "匹配度中等";
  return "匹配度较低";
}

/** 统计关键词命中数 */
export function countHits(score: MatchScore): number {
  return score.keywordHits.filter((k) => k.hit).length;
}
