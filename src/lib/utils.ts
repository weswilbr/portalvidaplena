import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Detecta se está rodando em dispositivo móvel */
function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Abre conversa do WhatsApp:
 * - Mobile → abre o app via whatsapp:// (link nativo)
 * - Desktop → abre WhatsApp Web
 */
export function openWhatsApp(phone: string, message?: string) {
  const clean = phone.replace(/\D/g, "");
  if (!clean) return;
  const text = message ? encodeURIComponent(message) : "";
  if (isMobileDevice()) {
    window.open(`whatsapp://send?phone=${clean}${text ? `&text=${text}` : ""}`, "_self");
  } else {
    window.open(`https://web.whatsapp.com/send?phone=${clean}${text ? `&text=${text}` : ""}`, "_blank");
  }
}

/**
 * Retorna o href correto para tags <a>:
 * - Mobile → whatsapp://send?phone=...
 * - Desktop → https://wa.me/...
 */
export function getWhatsAppHref(phone: string, message?: string): string {
  const clean = phone.replace(/\D/g, "");
  const text = message ? encodeURIComponent(message) : "";
  if (isMobileDevice()) {
    return `whatsapp://send?phone=${clean}${text ? `&text=${text}` : ""}`;
  }
  return `https://wa.me/${clean}${text ? `?text=${text}` : ""}`;
}
