"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendente, className }: { children: React.ReactNode; pendente?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className ?? "btn"} disabled={pending} aria-busy={pending}>
      {pending ? (pendente ?? "Aguarde…") : children}
    </button>
  );
}
