import { Logo } from "./index";
import type { LogoProps } from "./index";

export const LogoWithText = ({
  size = 100,
  className = "",
  textClassName = "",
}: LogoProps & { textClassName?: string }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Logo size={size} />
      <div className={textClassName}>
        <span className="text-xl font-bold tracking-tight text-foreground">
          Selge<span className="text-emerald-600">tabel</span>
        </span>
      </div>
    </div>
  );
};
