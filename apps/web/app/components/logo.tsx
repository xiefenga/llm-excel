interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 100, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E40AF" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="excelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id="flowGradient" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>

      {/* Excel 表格 - 底层，占据整个区域 */}
      <g transform="translate(10, 20)">
        <rect x="0" y="0" width="80" height="60" rx="6" fill="url(#excelGradient)" />

        {/* 表头区域 */}
        <rect x="0" y="0" width="80" height="14" rx="6" fill="#047857" />
        <rect x="0" y="8" width="80" height="6" fill="#047857" />

        {/* 表头文字示意 */}
        <rect x="6" y="4" width="14" height="5" rx="1.5" fill="white" fillOpacity="0.9" />
        <rect x="28" y="4" width="18" height="5" rx="1.5" fill="white" fillOpacity="0.9" />
        <rect x="54" y="4" width="20" height="5" rx="1.5" fill="white" fillOpacity="0.9" />

        {/* 网格线 - 水平 */}
        <line x1="5" y1="28" x2="75" y2="28" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
        <line x1="5" y1="42" x2="75" y2="42" stroke="white" strokeWidth="1" strokeOpacity="0.5" />

        {/* 网格线 - 垂直 */}
        <line x1="26" y1="16" x2="26" y2="56" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
        <line x1="52" y1="16" x2="52" y2="56" stroke="white" strokeWidth="1" strokeOpacity="0.5" />

        {/* 单元格数据 - 第一行 */}
        <rect x="6" y="18" width="12" height="4" rx="1" fill="white" fillOpacity="0.4" />
        <rect x="30" y="18" width="16" height="4" rx="1" fill="white" fillOpacity="0.4" />
        <rect x="56" y="18" width="14" height="4" rx="1" fill="white" fillOpacity="0.4" />

        {/* 单元格数据 - 第二行 */}
        <rect x="6" y="32" width="10" height="4" rx="1" fill="white" fillOpacity="0.4" />
        <rect x="30" y="32" width="14" height="4" rx="1" fill="white" fillOpacity="0.4" />
        <rect x="56" y="32" width="12" height="4" rx="1" fill="white" fillOpacity="0.4" />

        {/* 单元格数据 - 第三行 */}
        <rect x="6" y="46" width="14" height="4" rx="1" fill="white" fillOpacity="0.4" />
        <rect x="30" y="46" width="10" height="4" rx="1" fill="white" fillOpacity="0.4" />
        <rect x="56" y="46" width="16" height="4" rx="1" fill="white" fillOpacity="0.4" />
      </g>

      {/* AI 大脑 - 叠加在表格右侧中间 */}
      <g transform="translate(42, 8)">
        {/* 大脑外轮廓 */}
        <path
          d="M24 2C16 2 9 9 9 18C9 22 11 26 14 29C11 32 9 36 9 41C9 48 14 54 22 54C25 54 27 53 29 52C32 55 36 58 42 58C48 58 52 55 55 52C57 53 59 54 62 54C70 54 75 48 75 41C75 36 73 32 70 29C73 26 75 22 75 18C75 9 68 2 60 2C54 2 50 5 47 9C44 5 40 2 34 2C30 2 27 2 24 2Z"
          fill="url(#brainGradient)"
          transform="scale(0.7)"
        />

        {/* 神经连接点 */}
        <circle cx="16" cy="18" r="3.5" fill="white" fillOpacity="0.95" />
        <circle cx="28" cy="10" r="3" fill="white" fillOpacity="0.9" />
        <circle cx="38" cy="20" r="3.5" fill="white" fillOpacity="0.95" />
        <circle cx="22" cy="30" r="3" fill="white" fillOpacity="0.9" />
        <circle cx="34" cy="34" r="3" fill="white" fillOpacity="0.9" />
        <circle cx="42" cy="26" r="2.5" fill="white" fillOpacity="0.85" />

        {/* 神经连接线 */}
        <line x1="16" y1="18" x2="28" y2="10" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
        <line x1="28" y1="10" x2="38" y2="20" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
        <line x1="16" y1="18" x2="38" y2="20" stroke="white" strokeWidth="1.8" strokeOpacity="0.75" />
        <line x1="16" y1="18" x2="22" y2="30" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
        <line x1="38" y1="20" x2="34" y2="34" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
        <line x1="22" y1="30" x2="34" y2="34" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
        <line x1="38" y1="20" x2="42" y2="26" stroke="white" strokeWidth="1.2" strokeOpacity="0.6" />
        <line x1="34" y1="34" x2="42" y2="26" stroke="white" strokeWidth="1.2" strokeOpacity="0.6" />

        {/* 神经脉冲动画 */}
        <circle r="2" fill="#60A5FA">
          <animateMotion
            path="M16 18 L28 10 L38 20"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
        <circle r="1.5" fill="#93C5FD">
          <animateMotion
            path="M38 20 L34 34 L22 30 L16 18"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      </g>

      {/* 数据流动效果 - 从大脑流向表格 */}
      <g>
        {/* 流动粒子 */}
        <circle r="2.5" fill="#3B82F6">
          <animateMotion
            path="M70 35 Q55 50, 35 65"
            dur="1.8s"
            repeatCount="indefinite"
          />
        </circle>
        <circle r="2" fill="#10B981">
          <animateMotion
            path="M65 40 Q50 55, 30 70"
            dur="1.8s"
            begin="0.6s"
            repeatCount="indefinite"
          />
        </circle>
        <circle r="1.5" fill="#22D3EE">
          <animateMotion
            path="M72 38 Q58 52, 40 68"
            dur="1.8s"
            begin="1.2s"
            repeatCount="indefinite"
          />
        </circle>
      </g>
    </svg>
  )
}

export function LogoWithText({
  size = 100,
  className = "",
  textClassName = "",
}: LogoProps & { textClassName?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Logo size={size} />
      <div className={textClassName}>
        <span className="text-xl font-bold tracking-tight text-foreground">
          Selge<span className="text-emerald-600">tabel</span>
        </span>
      </div>
    </div>
  )
}

// 静态版本（无动画）
export function LogoStatic({ size = 100, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="brainGradientStatic" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E40AF" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="excelGradientStatic" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>

      {/* Excel 表格 - 底层 */}
      <g transform="translate(10, 20)">
        <rect x="0" y="0" width="80" height="60" rx="6" fill="url(#excelGradientStatic)" />
        <rect x="0" y="0" width="80" height="14" rx="6" fill="#047857" />
        <rect x="0" y="8" width="80" height="6" fill="#047857" />
        <rect x="6" y="4" width="14" height="5" rx="1.5" fill="white" fillOpacity="0.9" />
        <rect x="28" y="4" width="18" height="5" rx="1.5" fill="white" fillOpacity="0.9" />
        <rect x="54" y="4" width="20" height="5" rx="1.5" fill="white" fillOpacity="0.9" />
        <line x1="5" y1="28" x2="75" y2="28" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
        <line x1="5" y1="42" x2="75" y2="42" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
        <line x1="26" y1="16" x2="26" y2="56" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
        <line x1="52" y1="16" x2="52" y2="56" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
        <rect x="6" y="18" width="12" height="4" rx="1" fill="white" fillOpacity="0.4" />
        <rect x="30" y="18" width="16" height="4" rx="1" fill="white" fillOpacity="0.4" />
        <rect x="56" y="18" width="14" height="4" rx="1" fill="white" fillOpacity="0.4" />
        <rect x="6" y="32" width="10" height="4" rx="1" fill="white" fillOpacity="0.4" />
        <rect x="30" y="32" width="14" height="4" rx="1" fill="white" fillOpacity="0.4" />
        <rect x="56" y="32" width="12" height="4" rx="1" fill="white" fillOpacity="0.4" />
        <rect x="6" y="46" width="14" height="4" rx="1" fill="white" fillOpacity="0.4" />
        <rect x="30" y="46" width="10" height="4" rx="1" fill="white" fillOpacity="0.4" />
        <rect x="56" y="46" width="16" height="4" rx="1" fill="white" fillOpacity="0.4" />
      </g>

      {/* AI 大脑 - 叠加在右侧中间 */}
      <g transform="translate(42, 8)">
        <path
          d="M24 2C16 2 9 9 9 18C9 22 11 26 14 29C11 32 9 36 9 41C9 48 14 54 22 54C25 54 27 53 29 52C32 55 36 58 42 58C48 58 52 55 55 52C57 53 59 54 62 54C70 54 75 48 75 41C75 36 73 32 70 29C73 26 75 22 75 18C75 9 68 2 60 2C54 2 50 5 47 9C44 5 40 2 34 2C30 2 27 2 24 2Z"
          fill="url(#brainGradientStatic)"
          transform="scale(0.7)"
        />
        <circle cx="16" cy="18" r="3.5" fill="white" fillOpacity="0.95" />
        <circle cx="28" cy="10" r="3" fill="white" fillOpacity="0.9" />
        <circle cx="38" cy="20" r="3.5" fill="white" fillOpacity="0.95" />
        <circle cx="22" cy="30" r="3" fill="white" fillOpacity="0.9" />
        <circle cx="34" cy="34" r="3" fill="white" fillOpacity="0.9" />
        <circle cx="42" cy="26" r="2.5" fill="white" fillOpacity="0.85" />
        <line x1="16" y1="18" x2="28" y2="10" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
        <line x1="28" y1="10" x2="38" y2="20" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
        <line x1="16" y1="18" x2="38" y2="20" stroke="white" strokeWidth="1.8" strokeOpacity="0.75" />
        <line x1="16" y1="18" x2="22" y2="30" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
        <line x1="38" y1="20" x2="34" y2="34" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
        <line x1="22" y1="30" x2="34" y2="34" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
        <line x1="38" y1="20" x2="42" y2="26" stroke="white" strokeWidth="1.2" strokeOpacity="0.6" />
        <line x1="34" y1="34" x2="42" y2="26" stroke="white" strokeWidth="1.2" strokeOpacity="0.6" />
      </g>

      {/* 静态数据流粒子 */}
      <circle cx="68" cy="38" r="2.5" fill="#3B82F6" />
      <circle cx="52" cy="52" r="2" fill="#22D3EE" />
      <circle cx="38" cy="66" r="2" fill="#10B981" />
    </svg>
  )
}
