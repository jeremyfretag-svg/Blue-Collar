import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  id: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

export default function FormField({ label, id, error, className, children }: Props) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
