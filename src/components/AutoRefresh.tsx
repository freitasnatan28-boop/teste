"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Recarrega os dados da página a cada X segundos (ex.: enquanto espera o QR code). */
export function AutoRefresh({ segundos = 5 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), segundos * 1000);
    return () => clearInterval(t);
  }, [router, segundos]);
  return null;
}
