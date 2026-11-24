"use client";

import { useState } from "react";
import {
  MorejoyIslandProvider,
  MorejoyIsland,
  useMorejoyActivities,
  MOREJOY_THEMES,
  type MorejoyIslandTheme,
} from "@/components/island/morejoy-island";

function DemoContent() {
  const activities = useMorejoyActivities();
  const [activeTab, setActiveTab] = useState<string>("lesson");

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "16px 16px 40px" }}>
      {/* ── 顶部展示区：灵动岛放置在容器顶部 ── */}
      <div
        style={{
          position: "relative",
          width: "100%",
          minHeight: 120,
          background: "linear-gradient(180deg, #FFFFFF 0%, #FAF8F5 100%)",
          borderRadius: 20,
          border: "1px solid rgba(220, 210, 195, 0.65)",
          boxShadow: "0 6px 20px rgba(26, 18, 1, 0.04)",
          paddingTop: 16,
          marginBottom: 20,
          overflow: "visible",
        }}
      >
        <MorejoyIsland placement="container" />
        <div style={{ textAlign: "center", paddingTop: 46, paddingBottom: 10 }}>
          <span style={{ fontSize: 11, color: "#8A6517", fontWeight: 600 }}>
            ✦ 牧哲学堂 · 动态灵动岛（支持长按/轻触展开）✦
          </span>
        </div>
      </div>

      {/* ── 场景模拟控制台 ── */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 18,
          padding: "20px 18px",
          border: "1px solid rgba(220, 210, 195, 0.65)",
          boxShadow: "0 4px 14px rgba(26, 18, 1, 0.03)",
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <span style={{ width: 3, height: 14, borderRadius: 2, background: "#14574D" }} />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1a1201" }}>
            一键模拟学堂家校真实场景
          </h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button
            type="button"
            onClick={() => {
              setActiveTab("lesson");
              activities.showLessonActivity();
            }}
            style={{
              padding: "12px 10px",
              borderRadius: 12,
              background: activeTab === "lesson" ? "#14574D" : "#FAF8F5",
              color: activeTab === "lesson" ? "#FFFFFF" : "#1a1201",
              border: activeTab === "lesson" ? "1px solid #14574D" : "1px solid #E8E0D5",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ fontSize: 16, marginBottom: 4 }}>📖</div>
            <div>上课中状态</div>
            <div style={{ fontSize: 10.5, opacity: 0.75, marginTop: 2 }}>倒计时与接送通知</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("feedback");
              activities.showFeedbackActivity();
            }}
            style={{
              padding: "12px 10px",
              borderRadius: 12,
              background: activeTab === "feedback" ? "#E8784A" : "#FAF8F5",
              color: activeTab === "feedback" ? "#FFFFFF" : "#1a1201",
              border: activeTab === "feedback" ? "1px solid #E8784A" : "1px solid #E8E0D5",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ fontSize: 16, marginBottom: 4 }}>🏆</div>
            <div>随堂测验满分</div>
            <div style={{ fontSize: 10.5, opacity: 0.75, marginTop: 2 }}>学情报告即时触达</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("hour");
              activities.showHourAlert(2, 6);
            }}
            style={{
              padding: "12px 10px",
              borderRadius: 12,
              background: activeTab === "hour" ? "#B25E00" : "#FAF8F5",
              color: activeTab === "hour" ? "#FFFFFF" : "#1a1201",
              border: activeTab === "hour" ? "1px solid #B25E00" : "1px solid #E8E0D5",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ fontSize: 16, marginBottom: 4 }}>⌛</div>
            <div>消课与余额预警</div>
            <div style={{ fontSize: 10.5, opacity: 0.75, marginTop: 2 }}>扣课及低余额提示</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("meal");
              activities.showMealActivity();
            }}
            style={{
              padding: "12px 10px",
              borderRadius: 12,
              background: activeTab === "meal" ? "#14574D" : "#FAF8F5",
              color: activeTab === "meal" ? "#FFFFFF" : "#1a1201",
              border: activeTab === "meal" ? "1px solid #14574D" : "1px solid #E8E0D5",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ fontSize: 16, marginBottom: 4 }}>🍱</div>
            <div>晚托就餐打卡</div>
            <div style={{ fontSize: 10.5, opacity: 0.75, marginTop: 2 }}>17:45 膳食与晚自习</div>
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            type="button"
            onClick={() => activities.api.expand()}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 10,
              background: "#14574D",
              border: "1px solid #14574D",
              color: "#FFFFFF",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🔍 点击展开卡片详情
          </button>
          <button
            type="button"
            onClick={() => activities.api.collapse()}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 10,
              background: "#FAF8F5",
              border: "1px solid #DFD7CB",
              color: "#685D4E",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            💊 收起为灵动胶囊
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setActiveTab("none");
            activities.clearActivity();
          }}
          style={{
            width: "100%",
            marginTop: 8,
            padding: "9px 0",
            borderRadius: 10,
            background: "#F2ECE3",
            border: "1px solid #DFD7CB",
            color: "#685D4E",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ✕ 清空灵动岛状态（静默休眠）
        </button>
      </div>

      {/* ── 场景价值说明卡片 ── */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 16,
          padding: "16px",
          border: "1px solid rgba(220, 210, 195, 0.55)",
          fontSize: 12.5,
          color: "#685D4E",
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontWeight: 700, color: "#1a1201", marginBottom: 6 }}>
          💡 牧哲学堂专属适配优化亮点：
        </div>
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          <li>
            <strong>温润墨玉皮肤</strong>：摒弃了原生 iOS 冷硬的全黑塑料感，采用暗墨玉（<code>#0D2E28</code>）与浅金细光边框，完美契合学堂儒雅调性。
          </li>
          <li>
            <strong>手势流体展开</strong>：支持手指轻触直接展开详情卡片，并带有原生级物理弹簧阻尼。
          </li>
          <li>
            <strong>按需事件驱动</strong>：无任务时保持静默，上课/下课/评语提交时自动浮现，不遮挡日常浏览。
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function IslandDemoPage() {
  const [themeName, setThemeName] = useState<keyof typeof MOREJOY_THEMES>("darkJade");

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#FAF8F5",
        fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ padding: "16px 16px 0", textAlign: "center" }}>
        <h1 style={{ fontSize: 19, fontWeight: 800, color: "#1a1201", margin: "4px 0" }}>
          牧哲学堂 · 灵动岛 (Dynamic Island)
        </h1>
        <p style={{ fontSize: 12, color: "#8A6517", margin: 0 }}>
          基于 opencoredev/islandcn 深度定制的学堂微交互系统
        </p>

        {/* 主题微调切换 */}
        <div style={{ display: "inline-flex", gap: 6, marginTop: 10, padding: 3, background: "#EFE8DC", borderRadius: 999 }}>
          {(
            [
              ["darkJade", "墨玉流金"],
              ["morejoyGreen", "学堂墨绿"],
              ["warmAmber", "提分暖橙"],
              ["appleBlack", "经典纯黑"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setThemeName(key)}
              style={{
                border: "none",
                background: themeName === key ? "#FFFFFF" : "transparent",
                color: themeName === key ? "#14574D" : "#7A6F61",
                fontWeight: themeName === key ? 700 : 500,
                fontSize: 11.5,
                padding: "3px 10px",
                borderRadius: 999,
                cursor: "pointer",
                boxShadow: themeName === key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <MorejoyIslandProvider theme={MOREJOY_THEMES[themeName]}>
        <DemoContent />
      </MorejoyIslandProvider>
    </main>
  );
}
