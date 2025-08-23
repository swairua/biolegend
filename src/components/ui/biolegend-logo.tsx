import { cn } from "@/lib/utils";

interface BiolegendLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function BiolegendLogo({ className, size = "md", showText = true }: BiolegendLogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl"
  };

  return (
    <div className={cn("flex items-center space-x-3", className)}>
      {/* Biolegend Logo Image */}
      <div className={cn("relative", sizeClasses[size])}>
        <img
          src="https://cdn.builder.io/api/v1/image/assets%2F69400b16069b456f9aaefcb4af79d463%2F1183a0a5c37e4fe69d12256c4d461bcd?format=webp&width=800"
          alt="Biolegend Scientific Ltd Logo"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Company Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={cn("font-bold text-primary", textSizeClasses[size])}>
            BIOLEGEND
          </span>
          <span className={cn("text-xs text-secondary font-medium -mt-1", size === "sm" && "text-[10px]")}>
            SCIENTIFIC LTD
          </span>
        </div>
      )}
    </div>
  );
}
