"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { IslandProvider, Island, useIsland, type IslandProps } from "@/lib/island";
import { islandAccent } from "@/components/islandcn/theme";

export interface MorejoyIslandTheme {
  fill: string;
  keyline: string;
  accent: string;
}

export const MOREJOY_THEMES = {
  /** 墨玉流金（默认最典雅高质感） */
  darkJade: {
    fill: "#0D2E28",
    keyline: "rgba(214, 180, 91, 0.45)",
    accent: "#D6B45B",
  },
  /** 纯粹学堂墨绿 */
  morejoyGreen: {
    fill: "#14574D",
    keyline: "rgba(255, 255, 255, 0.28)",
    accent: "#46f0c6",
  },
  /** 提分暖橙 */
  warmAmber: {
    fill: "#241A14",
    keyline: "rgba(232, 120, 74, 0.5)",
    accent: "#E8784A",
  },
  /** 苹果经典全黑 */
  appleBlack: {
    fill: "#000000",
    keyline: "rgba(255, 255, 255, 0.16)",
    accent: "#ffffff",
  },
} as const;

const ThemeContext = createContext<{
  theme: MorejoyIslandTheme;
  setTheme?: (t: MorejoyIslandTheme) => void;
}>({
  theme: MOREJOY_THEMES.darkJade,
});

export interface MorejoyIslandProviderProps {
  children: ReactNode;
  theme?: MorejoyIslandTheme;
}

export function MorejoyIslandProvider({
  children,
  theme = MOREJOY_THEMES.darkJade,
}: MorejoyIslandProviderProps) {
  const value = useMemo(() => ({ theme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      <IslandProvider>
        <div
          style={
            {
              "--island-fill": theme.fill,
              "--island-keyline": theme.keyline,
              "--island-accent": theme.accent,
            } as React.CSSProperties
          }
        >
          {children}
        </div>
      </IslandProvider>
    </ThemeContext.Provider>
  );
}

export function MorejoyIsland(props: IslandProps) {
  return (
    <Island
      {...props}
      style={{
        zIndex: 9999,
        ...props.style,
      }}
    />
  );
}

/**
 * 牧哲学堂专属动态交互 Hook
 * 封装了 4 大典型教育场景的高级动画与状态控制
 */
export function useMorejoyActivities() {
  const island = useIsland();

  /** 1. 模拟：正在上课（倒计时与接送） */
  const showLessonActivity = (options?: {
    courseName?: string;
    teacherName?: string;
    remainingMinutes?: number;
    room?: string;
  }) => {
    const course = options?.courseName ?? "初二数学 · 尖子培优班";
    const teacher = options?.teacherName ?? "胡思彤 老师";
    const remaining = options?.remainingMinutes ?? 25;
    const room = options?.room ?? "201 多媒体教室";

    return island.start({
      id: "morejoy-lesson-live",
      label: `${course} 正在上课中，剩余 ${remaining} 分钟`,
      priority: 10,
      compact: {
        leading: (
          <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 2 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#32d74b",
                boxShadow: "0 0 8px #32d74b",
                display: "inline-block",
                animation: "pulse 1.8s infinite",
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF", letterSpacing: 0.3 }}>
              数学培优中
            </span>
          </div>
        ),
        trailing: (
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#D6B45B", paddingRight: 4 }}>
            余{remaining}m
          </span>
        ),
      },
      expanded: {
        leading: (
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg, #14574D 0%, #0D2E28 100%)",
              border: "1px solid rgba(214, 180, 91, 0.4)",
              display: "grid",
              placeItems: "center",
              fontSize: 24,
              boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            }}
          >
            📖
          </div>
        ),
        trailing: (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#D6B45B", lineHeight: 1 }}>
              {remaining}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
              MIN 倒计时
            </div>
          </div>
        ),
        center: (
          <div style={{ paddingLeft: 4 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", letterSpacing: 0.2 }}>
              {course}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
              主讲：{teacher} · {room}
            </div>
          </div>
        ),
        bottom: (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>
              <span>课堂进度：65 / 90 分钟</span>
              <span style={{ color: "#D6B45B" }}>预计 17:30 准时下课</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
              <div style={{ width: "72%", height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #14574D, #D6B45B)" }} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                type="button"
                onClick={() => alert("已向任课老师与学堂前台发送接送抵达通知！")}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 10,
                  background: "#14574D",
                  border: "1px solid rgba(214, 180, 91, 0.4)",
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🚗 我已到达校区接送
              </button>
              <button
                type="button"
                onClick={() => alert("本节课教学大纲：二次函数顶点式、解析式求法与极值综合大题")}
                style={{
                  padding: "0 14px",
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#FFFFFF",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                查看教学提纲
              </button>
            </div>
          </div>
        ),
      },
    });
  };

  /** 2. 模拟：随堂学情即时播报（满分/答题反馈） */
  const showFeedbackActivity = (options?: {
    quizTitle?: string;
    score?: number;
    teacherComment?: string;
  }) => {
    const title = options?.quizTitle ?? "《二次函数综合应用》当堂小测";
    const score = options?.score ?? 100;
    const comment = options?.teacherComment ?? "解题步骤规范，辅助线构造极佳，思维严谨！";

    return island.start({
      id: "morejoy-feedback-quiz",
      label: `收到随堂测验反馈：${title} 得分 ${score}分`,
      priority: 20,
      compact: {
        leading: (
          <div style={{ display: "flex", alignItems: "center", gap: 5, paddingLeft: 2 }}>
            <span style={{ color: "#E8784A", fontSize: 13 }}>✦</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>
              测验满分
            </span>
          </div>
        ),
        trailing: (
          <span style={{ fontSize: 13, fontWeight: 800, color: "#E8784A", paddingRight: 4 }}>
            {score}分
          </span>
        ),
      },
      expanded: {
        leading: (
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg, #E8784A 0%, #9C3A16 100%)",
              display: "grid",
              placeItems: "center",
              fontSize: 26,
              boxShadow: "0 4px 14px rgba(232, 120, 74, 0.4)",
            }}
          >
            🏆
          </div>
        ),
        trailing: (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#E8784A", lineHeight: 1 }}>
              {score}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
              满分答卷
            </div>
          </div>
        ),
        center: (
          <div style={{ paddingLeft: 4 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: "#FFFFFF" }}>
              {title}
            </div>
            <div style={{ fontSize: 11.5, color: "#D6B45B", marginTop: 2, fontWeight: 600 }}>
              班级排名：第 1 名 · 零失误交卷
            </div>
          </div>
        ),
        bottom: (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                fontSize: 12.5,
                color: "rgba(255,255,255,0.9)",
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: "#D6B45B", fontWeight: 700 }}>胡老师寄语：</span>
              {comment}
            </div>
            <button
              type="button"
              onClick={() => alert("正在跳转到当堂详细诊断学情报告页面...")}
              style={{
                width: "100%",
                marginTop: 10,
                height: 38,
                borderRadius: 10,
                background: "#E8784A",
                border: "none",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(232, 120, 74, 0.3)",
              }}
            >
              📊 查看完整学情诊断报告
            </button>
          </div>
        ),
      },
    });
  };

  /** 3. 模拟：消课与课时余额低预警 */
  const showHourAlert = (consumed = 2, remaining = 6) => {
    return island.start({
      id: "morejoy-hour-alert",
      label: `消课提醒：本次消耗 ${consumed} 课时，剩余 ${remaining} 课时`,
      priority: 15,
      compact: {
        leading: (
          <div style={{ display: "flex", alignItems: "center", gap: 5, paddingLeft: 2 }}>
            <span style={{ fontSize: 12 }}>⌛</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>
              消课 -{consumed}h
            </span>
          </div>
        ),
        trailing: (
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#FF9F0A", paddingRight: 4 }}>
            余{remaining}h
          </span>
        ),
      },
      expanded: {
        leading: (
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg, #B25E00 0%, #5E2F00 100%)",
              display: "grid",
              placeItems: "center",
              fontSize: 24,
            }}
          >
            ⌛
          </div>
        ),
        trailing: (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: "#FF9F0A", lineHeight: 1 }}>
              {remaining}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
              课时剩余
            </div>
          </div>
        ),
        center: (
          <div style={{ paddingLeft: 4 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
              课时核销与余额预警
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
              本次扣减：{consumed} 课时（初二数学强化）
            </div>
          </div>
        ),
        bottom: (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                background: "rgba(255, 159, 10, 0.15)",
                border: "1px solid rgba(255, 159, 10, 0.3)",
                color: "#FFD60A",
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              ⚠️ 您的剩余课时已不足 8 课时，请及时与教务顾问联系规划下阶段学习。
            </div>
            <button
              type="button"
              onClick={() => alert("正在联系学堂教务管理员...")}
              style={{
                width: "100%",
                marginTop: 10,
                height: 38,
                borderRadius: 10,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              📞 联系学堂教务咨询续课
            </button>
          </div>
        ),
      },
    });
  };

  /** 4. 模拟：晚托就餐打卡 */
  const showMealActivity = (time = "17:45") => {
    return island.start({
      id: "morejoy-meal-record",
      label: `晚间课业辅导营就餐打卡，时间 ${time}`,
      priority: 5,
      compact: {
        leading: (
          <div style={{ display: "flex", alignItems: "center", gap: 5, paddingLeft: 2 }}>
            <span style={{ fontSize: 13 }}>🍱</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>
              晚餐已就餐
            </span>
          </div>
        ),
        trailing: (
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "#32d74b", paddingRight: 4 }}>
            {time}
          </span>
        ),
      },
      expanded: {
        leading: (
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg, #14574D 0%, #0F3B34 100%)",
              display: "grid",
              placeItems: "center",
              fontSize: 24,
            }}
          >
            🍱
          </div>
        ),
        trailing: (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#32d74b", lineHeight: 1 }}>
              已就餐
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
              {time} 打卡
            </div>
          </div>
        ),
        center: (
          <div style={{ paddingLeft: 4 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
              学堂晚间膳食打卡
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
              荤素搭配营养套膳 · 饭后已休息15分钟
            </div>
          </div>
        ),
        bottom: (
          <div style={{ marginTop: 12, fontSize: 12.5, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
            孩子现已进入 <strong>302 自习答疑室</strong> 开始晚辅导，由晚课督学老师全程陪读辅导。
          </div>
        ),
      },
    });
  };

  /** 清空/关闭当前活动 */
  const clearActivity = () => {
    island.end("morejoy-lesson-live");
    island.end("morejoy-feedback-quiz");
    island.end("morejoy-hour-alert");
    island.end("morejoy-meal-record");
  };

  return {
    showLessonActivity,
    showFeedbackActivity,
    showHourAlert,
    showMealActivity,
    clearActivity,
    api: island,
  };
}
