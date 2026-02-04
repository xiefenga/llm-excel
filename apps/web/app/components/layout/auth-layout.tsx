import { MessageSquareText, Repeat, Eye, TableProperties } from "lucide-react";

import { Logo } from "~/components/logo";

import type { PropsWithChildren } from "react";

// 数据流动画组件
function DataFlowAnimation() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* 网格背景 */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(5, 150, 105, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(5, 150, 105, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* 数据流线条 - 垂直 */}
      {[...Array(6)].map((_, i) => (
        <div
          key={`v-${i}`}
          className="absolute w-px bg-linear-to-b from-transparent via-emerald-500/30 to-transparent"
          style={{
            left: `${15 + i * 15}%`,
            top: '-20%',
            height: '140%',
            animation: `dataFlowVertical ${3 + i * 0.5}s linear infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}

      {/* 数据流线条 - 水平 */}
      {[...Array(4)].map((_, i) => (
        <div
          key={`h-${i}`}
          className="absolute h-px bg-linear-to-r from-transparent via-blue-500/20 to-transparent"
          style={{
            top: `${20 + i * 20}%`,
            left: '-20%',
            width: '140%',
            animation: `dataFlowHorizontal ${4 + i * 0.7}s linear infinite`,
            animationDelay: `${i * 0.5}s`,
          }}
        />
      ))}

      {/* 浮动数据点 */}
      {[...Array(12)].map((_, i) => (
        <div
          key={`dot-${i}`}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{
            background: i % 2 === 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(59, 130, 246, 0.5)',
            left: `${10 + (i * 7) % 80}%`,
            top: `${5 + (i * 11) % 90}%`,
            animation: `floatDot ${4 + (i % 3)}s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
            boxShadow: i % 2 === 0
              ? '0 0 8px rgba(16, 185, 129, 0.4)'
              : '0 0 8px rgba(59, 130, 246, 0.3)',
          }}
        />
      ))}

      {/* 大光晕 */}
      <div
        className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full opacity-40"
        style={{
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
          animation: 'pulseGlow 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)',
          animation: 'pulseGlow 10s ease-in-out infinite',
          animationDelay: '2s',
        }}
      />
    </div>
  );
}

// 特性卡片组件
function FeatureCard({
  icon: Icon,
  title,
  description,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  delay: string;
}) {
  return (
    <div
      className="group flex items-start gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
      style={{
        animation: 'slideInLeft 0.6s ease-out forwards',
        animationDelay: delay,
        opacity: 0,
      }}
    >
      <div className="shrink-0 w-10 h-10 rounded-lg bg-linear-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-5 h-5 text-emerald-400" />
      </div>
      <div>
        <h3 className="font-semibold text-white/90 mb-1">{title}</h3>
        <p className="text-sm text-white/60 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen flex relative overflow-hidden bg-gray-50">
      {/* CSS Animations */}
      <style>{`
        @keyframes dataFlowVertical {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        @keyframes dataFlowHorizontal {
          0% { transform: translateX(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        @keyframes floatDot {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          50% { transform: translate(10px, -15px) scale(1.2); opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.1); opacity: 0.5; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeInUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Left Panel - Brand Showcase */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative bg-linear-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* 数据流动画背景 */}
        <DataFlowAnimation />

        {/* 内容区域 */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo */}
          <div
            className="flex items-center gap-3"
            style={{
              animation: 'slideInLeft 0.5s ease-out forwards',
            }}
          >
            <Logo size={48} />
            <h1 className="text-3xl font-bold bg-linear-to-r from-emerald-400 via-teal-400 to-blue-400 bg-clip-text text-transparent">
              Selgetabel
            </h1>
          </div>

          {/* 中间主要内容 */}
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <h2
              className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6"
              style={{
                animation: 'fadeInUp 0.6s ease-out forwards',
                animationDelay: '0.2s',
                opacity: 0,
              }}
            >
              AI 驱动的
              <br />
              <span className="bg-linear-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Excel 智能处理
              </span>
            </h2>
            <p
              className="text-lg text-white/60 mb-10 leading-relaxed"
              style={{
                animation: 'fadeInUp 0.6s ease-out forwards',
                animationDelay: '0.3s',
                opacity: 0,
              }}
            >
              用自然语言描述需求，AI 生成可执行操作并输出 Excel 公式，
              结果 100% 可复现，告别繁琐的公式编写。
            </p>

            {/* 特性列表 */}
            <div className="space-y-4">
              <FeatureCard
                icon={MessageSquareText}
                title="自然语言驱动"
                description="用中文描述需求，AI 自动生成结构化操作并执行"
                delay="0.4s"
              />
              <FeatureCard
                icon={Repeat}
                title="100% 可复现"
                description="每个操作都生成对应的 Excel 公式，结果可手动验证"
                delay="0.5s"
              />
              <FeatureCard
                icon={Eye}
                title="思路完全透明"
                description="实时展示分析思路和操作步骤，让您理解 AI 做了什么"
                delay="0.6s"
              />
              <FeatureCard
                icon={TableProperties}
                title="跨表智能处理"
                description="支持多文件、多 Sheet 联合处理，VLOOKUP、COUNTIFS 等"
                delay="0.7s"
              />
            </div>
          </div>

          {/* 底部 */}
          <div
            className="text-white/40 text-sm"
            style={{
              animation: 'fadeInUp 0.5s ease-out forwards',
              animationDelay: '0.8s',
              opacity: 0,
            }}
          >
            © 2026 Selgetabel. 让数据处理更简单。
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex flex-col min-h-screen relative">
        {/* 右侧装饰背景 */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-60"
            style={{
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-40"
            style={{
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.06) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Mobile Logo Header */}
        <header className="lg:hidden w-full px-6 py-6 flex items-center justify-center relative z-20">
          <div className="flex items-center gap-2">
            <Logo size={40} />
            <h1 className="text-2xl font-bold bg-linear-to-r from-emerald-600 via-teal-600 to-blue-600 bg-clip-text text-transparent">
              Selgetabel
            </h1>
          </div>
        </header>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 relative z-10">
          <div
            className="w-full max-w-md"
            style={{
              animation: 'slideInRight 0.5s ease-out forwards',
            }}
          >
            {children}
          </div>
        </div>

        {/* Mobile Footer */}
        <footer className="lg:hidden px-6 py-4 text-center text-gray-400 text-sm">
          © 2026 Selgetabel
        </footer>
      </div>
    </div>
  );
}
