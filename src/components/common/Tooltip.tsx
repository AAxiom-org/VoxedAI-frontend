import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

interface TooltipProps {
  content: React.ReactNode;
  title?: string;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
}

const Tooltip = ({
  children,
  content,
  title,
  side = "top",
  align = "center",
  delayDuration = 300,
}: TooltipProps) => {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={5}
            className="relative z-50 select-none shadow-xs transition-opacity px-3 py-2 rounded-lg border border-adaptive dark:border bg-card max-w-xs"
          >
            <span className="flex items-center whitespace-pre-wrap font-semibold normal-case text-center">
              <div className="text-center leading-0.5">
                {title && (
                  <span className="block text-xs text-token-text-tertiary text-muted mb-0.1">
                    {title}
                  </span>
                )}
                <span className="text-adaptive text-xs">{content}</span>
              </div>
            </span>
            <TooltipPrimitive.Arrow className="fill-gray-950">
              <svg
                className="relative top-[-4px] h-2 w-2 rotate-45 transform shadow-xs dark:border-r dark:border-b border-adaptive bg-gray-950"
                width={10}
                height={5}
                viewBox="0 0 30 10"
                preserveAspectRatio="none"
                style={{ display: "block" }}
              />
            </TooltipPrimitive.Arrow>
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};

export default Tooltip;