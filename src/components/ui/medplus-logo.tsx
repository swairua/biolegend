import { cn } from "@/lib/utils";

interface MedPlusLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function MedPlusLogo({ className, size = "md", showText = true }: MedPlusLogoProps) {
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
    <div className={cn("flex items-center space-x-2", className)}>
      {/* MedPlus Logo Image */}
      <div className={cn("relative", sizeClasses[size])}>
        <img
          src="https://cdn.builder.io/api/v1/image/assets%2Ff610fc3448214bbd90346186516b9f73%2Fe848f2f1c3e24c458361afb41be3633d?format=webp&width=800"
          alt="MedPlus Africa Logo"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Company Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={cn("font-bold text-primary", textSizeClasses[size])}>
            MEDPLUS
          </span>
          <span className={cn("text-xs text-muted-foreground -mt-1", size === "sm" && "text-[10px]")}>
            AFRICA
          </span>
        </div>
      )}
    </div>
  );
}
