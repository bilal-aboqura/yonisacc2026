import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-primary transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "flex items-center justify-center text-primary-foreground data-[state=unchecked]:hidden",
      )}
    >
      <Check className="h-3 w-3" />
    </SwitchPrimitives.Thumb>
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
