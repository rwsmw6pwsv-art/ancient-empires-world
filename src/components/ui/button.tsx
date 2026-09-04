import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium tracking-wide transition-[filter,background-color,box-shadow,color] duration-100 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] active:brightness-125",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:bg-fg",
        secondary: "border border-border bg-raised text-fg hover:bg-surface",
        ghost: "text-muted hover:text-fg hover:bg-raised",
        danger: "bg-danger text-accent-fg hover:opacity-90",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-5 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
