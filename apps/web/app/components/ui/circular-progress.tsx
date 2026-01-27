interface CircularProgressProps {
  progress: number; // 0-100
  size?: number; // 默认 20 (对应 w-5 h-5)
  strokeWidth?: number; // 默认 2
  className?: string;
}

const CircularProgress = ({ progress, size = 20, strokeWidth = 2, className = "" }: CircularProgressProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress / 100);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg
        className="w-full h-full transform -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* 背景圆 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        {/* 进度圆 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-emerald-600 transition-all duration-300"
          strokeLinecap="round"
        />
      </svg>
      {/* 百分比文字 */}
      {/* <span className="absolute inset-0 flex items-center justify-center text-[8px] font-medium text-emerald-600">
        {Math.round(progress)}
      </span> */}
    </div>
  );
}


export default CircularProgress