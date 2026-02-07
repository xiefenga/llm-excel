import { Link } from "react-router";
import { ArrowLeft, Home } from "lucide-react";
import { useMemo } from "react";

import { Button } from "~/components/ui/button";
import { Logo } from "~/components/logo";

import type { Route } from "./+types/$";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "404 - Selgetabel" },
    { name: "description", content: "页面不存在" },
  ];
}

/* ------------------------------------------------------------------ */
/*  Floating spreadsheet cell fragments                                */
/* ------------------------------------------------------------------ */

const CELL_FRAGMENTS = [
  { content: "#REF!", x: "8%", y: "12%", delay: 0, size: "lg", color: "red" },
  { content: "=SUM(", x: "78%", y: "8%", delay: 0.8, size: "md", color: "emerald" },
  { content: "NULL", x: "85%", y: "55%", delay: 1.6, size: "sm", color: "blue" },
  { content: "#N/A", x: "12%", y: "72%", delay: 0.4, size: "md", color: "red" },
  { content: "A1:B4", x: "72%", y: "78%", delay: 1.2, size: "sm", color: "emerald" },
  { content: "...", x: "92%", y: "32%", delay: 2, size: "sm", color: "blue" },
  { content: "#404", x: "5%", y: "42%", delay: 0.6, size: "sm", color: "blue" },
  { content: "ERR", x: "65%", y: "18%", delay: 1.8, size: "sm", color: "red" },
] as const;

const colorMap = {
  red: {
    bg: "bg-red-500/[0.06] dark:bg-red-400/[0.08]",
    border: "border-red-300/30 dark:border-red-400/20",
    text: "text-red-400/70 dark:text-red-300/60",
  },
  emerald: {
    bg: "bg-emerald-500/[0.06] dark:bg-emerald-400/[0.08]",
    border: "border-emerald-300/30 dark:border-emerald-400/20",
    text: "text-emerald-500/70 dark:text-emerald-300/60",
  },
  blue: {
    bg: "bg-blue-500/[0.06] dark:bg-blue-400/[0.08]",
    border: "border-blue-300/30 dark:border-blue-400/20",
    text: "text-blue-400/70 dark:text-blue-300/60",
  },
} as const;

const sizeMap = {
  sm: "px-2.5 py-1.5 text-[10px]",
  md: "px-3 py-2 text-xs",
  lg: "px-4 py-2.5 text-sm",
} as const;

function FloatingCells() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {CELL_FRAGMENTS.map((cell, i) => {
        const c = colorMap[cell.color];
        const s = sizeMap[cell.size];
        return (
          <div
            key={i}
            className={`absolute rounded-md border font-mono backdrop-blur-sm ${c.bg} ${c.border} ${c.text} ${s}`}
            style={{
              left: cell.x,
              top: cell.y,
              animation: `cellFloat 6s ease-in-out infinite, cellFadeIn 0.8s ease-out forwards`,
              animationDelay: `${cell.delay}s, ${cell.delay}s`,
              opacity: 0,
            }}
          >
            {cell.content}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Scattered grid lines (Excel vibe)                                  */
/* ------------------------------------------------------------------ */

function GridBackground() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {/* Fine grid */}
      <div
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(5,150,105,0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(5,150,105,0.6) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      {/* Broken / fading grid overlay — gives the "glitch" feel */}
      <div className="absolute inset-0 bg-linear-to-b from-background via-transparent to-background" />
      <div className="absolute inset-0 bg-linear-to-r from-background via-transparent to-background" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Glowing orbs                                                       */
/* ------------------------------------------------------------------ */

function GlowOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-40"
        style={{
          background:
            "radial-gradient(circle, rgba(16,185,129,0.18) 0%, rgba(59,130,246,0.08) 40%, transparent 70%)",
          animation: "orbPulse 10s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -bottom-52 -right-24 h-[400px] w-[400px] rounded-full opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 65%)",
          animation: "orbPulse 12s ease-in-out infinite",
          animationDelay: "3s",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main 404 visual — the big number                                   */
/* ------------------------------------------------------------------ */

function Big404() {
  return (
    <div className="relative select-none" aria-hidden>
      {/* Shadow layer */}
      <span className="absolute inset-0 bg-linear-to-br from-emerald-600/20 to-blue-600/20 bg-clip-text text-[11rem] leading-none font-black tracking-tighter text-transparent blur-2xl sm:text-[14rem] md:text-[17rem]">
        404
      </span>
      {/* Main gradient text */}
      <span className="relative bg-linear-to-br from-emerald-500 via-teal-400 to-blue-500 bg-clip-text text-[11rem] leading-none font-black tracking-tighter text-transparent sm:text-[14rem] md:text-[17rem]">
        404
      </span>
      {/* Decorative scan-line */}
      <div
        className="absolute inset-0 overflow-hidden rounded-xl"
        style={{ mixBlendMode: "overlay" }}
      >
        <div
          className="absolute left-0 h-[2px] w-full bg-white/20"
          style={{ animation: "scanLine 4s linear infinite" }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Broken cell illustration                                           */
/* ------------------------------------------------------------------ */

function BrokenCellIllustration() {
  const cells = useMemo(
    () => [
      { w: 72, h: 28, x: 0, y: 0, text: "ID", header: true },
      { w: 100, h: 28, x: 72, y: 0, text: "Name", header: true },
      { w: 80, h: 28, x: 172, y: 0, text: "Value", header: true },
      { w: 72, h: 26, x: 0, y: 28, text: "001" },
      { w: 100, h: 26, x: 72, y: 28, text: "Alice" },
      { w: 80, h: 26, x: 172, y: 28, text: "128" },
      { w: 72, h: 26, x: 0, y: 54, text: "002" },
      { w: 100, h: 26, x: 72, y: 54, text: "???" },
      { w: 80, h: 26, x: 172, y: 54, text: "#N/A", error: true },
    ],
    []
  );

  return (
    <svg
      viewBox="0 0 252 80"
      className="mx-auto w-full max-w-[252px] opacity-0"
      style={{
        animation: "cellFadeIn 0.6s ease-out 0.6s forwards",
      }}
      aria-hidden
    >
      {cells.map((c, i) => (
        <g key={i}>
          <rect
            x={c.x}
            y={c.y}
            width={c.w}
            height={c.h ?? 26}
            fill={
              c.header
                ? "rgba(5,150,105,0.12)"
                : c.error
                  ? "rgba(239,68,68,0.08)"
                  : "rgba(255,255,255,0.03)"
            }
            stroke="rgba(148,163,184,0.15)"
            strokeWidth="1"
          />
          <text
            x={c.x + (c.w ?? 0) / 2}
            y={(c.y ?? 0) + (c.header ? 18 : 17)}
            textAnchor="middle"
            className={`text-[11px] ${c.header
              ? "fill-emerald-600/70 dark:fill-emerald-400/70 font-semibold"
              : c.error
                ? "fill-red-500/70 dark:fill-red-400/70"
                : "fill-foreground/40"
              }`}
            style={{ fontFamily: "ui-monospace, monospace" }}
          >
            {c.text}
          </text>
        </g>
      ))}
      {/* "Missing cell" dashed outline */}
      <rect
        x={172}
        y={54}
        width={80}
        height={26}
        fill="none"
        stroke="rgba(239,68,68,0.35)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        rx="2"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const NotFoundPage = () => {
  return (
    <main className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-background px-6 text-foreground">
      {/* Inline keyframes */}
      <style>{`
        @keyframes cellFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-14px) rotate(1.5deg); }
        }
        @keyframes cellFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes orbPulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.08); opacity: 0.45; }
        }
        @keyframes scanLine {
          0%   { top: -2px; }
          100% { top: 100%; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Background layers */}
      <GridBackground />
      <GlowOrbs />
      <FloatingCells />

      {/* Logo */}
      <div className="absolute top-4 left-0 px-6 flex items-center gap-3 opacity-0" style={{ animation: "fadeUp 0.5s ease-out forwards" }}>
        <Logo size={44} />
        <span className="text-2xl font-bold tracking-tight text-foreground">
          Selge<span className="text-brand">tabel</span>
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center mb-24">


        <Big404 />

        <div className="space-y-4 opacity-0 mb-4" style={{ animation: "fadeUp 0.6s ease-out 0.3s forwards" }}>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            这个单元格是空的
          </h1>
          <p className="mx-auto max-w-lg text-base leading-relaxed text-foreground/60 sm:text-lg">
            你访问的页面不存在或已被移动。
            <br className="hidden sm:block" />
            就像引用了一个不存在的单元格一样 —{" "}
            <span className="font-mono font-semibold text-red-500/90 dark:text-red-400/90">#REF!</span>
          </p>
        </div>

        {/* Mini spreadsheet illustration */}
        <div className="mt-2 mb-6 w-full max-w-xs">
          <BrokenCellIllustration />
        </div>



        {/* Actions */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 opacity-0" style={{ animation: "fadeUp 0.6s ease-out 0.5s forwards" }}>
          <Button
            asChild
            size="lg"
            className="h-12 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 px-8 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-700 hover:to-teal-700 hover:shadow-xl hover:shadow-emerald-500/30"
          >
            <Link to="/">
              <Home className="size-[18px]" />
              返回首页
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 rounded-xl border-border bg-background/80 px-8 text-base font-semibold text-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted"
          >
            <Link to="/login">
              <ArrowLeft className="size-[18px]" />
              去登录
            </Link>
          </Button>
        </div>

      </div>

      {/* Footer tagline — pinned to bottom */}
      <footer
        className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center pb-6 opacity-0"
        style={{ animation: "fadeUp 0.5s ease-out 0.8s forwards" }}
      >
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <span className="inline-block size-2 rounded-full bg-brand/60" />
          <span className="font-medium">Selgetabel · AI 驱动的 Excel 智能处理</span>
        </div>
      </footer>
    </main>
  );
};

export default NotFoundPage;
