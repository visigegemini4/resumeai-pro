import { useApp } from "../data/AppContext";
import { Card } from "../components/Card";
import { CopyButton } from "../components/CopyButton";
import { Skeleton } from "../components/Skeleton";

/**
 * 简历中心：以「标准简历格式」呈现优化版简历。
 * 使用 structuredResume 结构化数据，按板块卡片化排版（基本信息/求职意向/教育/工作/项目/技能），
 * 呈现真实简历版式。复制按钮仍使用 optimizedResume 纯文本，便于粘贴到投递渠道。
 */
export function ResumeTab() {
  const { state } = useApp();
  const { optimizeResult, loading } = state;

  if (loading.optimize || !optimizeResult) {
    return (
      <Card className="p-6">
        <Skeleton variant="resume" />
      </Card>
    );
  }

  const { structuredResume: r, optimizedResume } = optimizeResult;
  const hasStructured =
    r &&
    (r.basic?.name ||
      (r.education && r.education.length > 0) ||
      (r.experience && r.experience.length > 0));

  return (
    <div className="space-y-4">
      <Card className="p-6 sm:p-8">
        {hasStructured ? (
          <div className="space-y-6">
            {/* 基本信息 + 求职意向 */}
            <div className="text-center pb-4 border-b border-mint-light/60">
              {r.basic?.name && (
                <h2 className="text-xl font-bold text-ink mb-2">
                  {r.basic.name}
                </h2>
              )}
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                {r.basic?.phone && <span>📱 {r.basic.phone}</span>}
                {r.basic?.email && <span>✉ {r.basic.email}</span>}
                {r.basic?.location && <span>📍 {r.basic.location}</span>}
              </div>
              {r.objective && (
                <p className="mt-3 text-sm text-mint-dark font-medium">
                  求职意向：{r.objective}
                </p>
              )}
            </div>

            {/* 教育背景 */}
            {r.education && r.education.length > 0 && (
              <ResumeSection title="教育背景">
                {r.education.map((e, i) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3"
                  >
                    <span className="text-xs text-ink-muted shrink-0 sm:w-32">
                      {e.period}
                    </span>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-ink">
                        {e.school}
                      </span>
                      {e.degree && (
                        <span className="text-sm text-ink-muted"> · {e.degree}</span>
                      )}
                      <span className="text-sm text-ink-muted"> · {e.major}</span>
                    </div>
                  </div>
                ))}
              </ResumeSection>
            )}

            {/* 工作经历 */}
            {r.experience && r.experience.length > 0 && (
              <ResumeSection title="工作经历">
                {r.experience.map((exp, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                      <span className="text-xs text-ink-muted shrink-0 sm:w-32">
                        {exp.period}
                      </span>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-ink">
                          {exp.company}
                        </span>
                        <span className="text-sm text-mint-dark">
                          {" "}· {exp.role}
                        </span>
                      </div>
                    </div>
                    {exp.highlights && exp.highlights.length > 0 && (
                      <ul className="ml-4 sm:ml-36 space-y-1">
                        {exp.highlights.map((h, j) => (
                          <li
                            key={j}
                            className="text-sm text-ink leading-relaxed flex gap-1.5"
                          >
                            <span className="text-mint shrink-0">·</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </ResumeSection>
            )}

            {/* 项目经历 */}
            {r.projects && r.projects.length > 0 && (
              <ResumeSection title="项目经历">
                {r.projects.map((p, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                      <span className="text-xs text-ink-muted shrink-0 sm:w-32">
                        {p.period}
                      </span>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-ink">
                          {p.name}
                        </span>
                        {p.role && (
                          <span className="text-sm text-mint-dark">
                            {" "}· {p.role}
                          </span>
                        )}
                      </div>
                    </div>
                    {p.highlights && p.highlights.length > 0 && (
                      <ul className="ml-4 sm:ml-36 space-y-1">
                        {p.highlights.map((h, j) => (
                          <li
                            key={j}
                            className="text-sm text-ink leading-relaxed flex gap-1.5"
                          >
                            <span className="text-mint shrink-0">·</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </ResumeSection>
            )}

            {/* 专业技能 */}
            {r.skills && r.skills.length > 0 && (
              <ResumeSection title="专业技能">
                <div className="flex flex-wrap gap-2">
                  {r.skills.map((s, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-md bg-mint-light/50 text-xs text-ink"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </ResumeSection>
            )}
          </div>
        ) : (
          // 容错：AI 未返回结构化数据时回退到纯文本展示
          <pre className="whitespace-pre-wrap font-sans text-sm text-ink leading-relaxed">
            {optimizedResume}
          </pre>
        )}
      </Card>
      <div className="flex justify-center">
        <CopyButton content={optimizedResume} />
      </div>
    </div>
  );
}

/** 简历板块分区（带标题） */
function ResumeSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-mint-dark mb-2.5 pb-1 border-b border-mint-light/40">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
