/**
 * useToast — Adapter hook
 *
 * Maps the legacy `toast({ title, description, variant })` API
 * to the new Sonner-based toast system with animated UI.
 *
 * `variant: "destructive"` → mapped to `error`
 * default (no variant)     → mapped to `success`
 */
import { useCallback } from "react";
import { showToast } from "@/components/ui/toast";
import type { Variant } from "@/components/ui/toast";

interface LegacyToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

function mapVariant(legacy?: "default" | "destructive"): Variant {
  if (legacy === "destructive") return "error";
  return "success";
}

function toast(props: LegacyToastProps) {
  showToast({
    title: typeof props.title === "string" ? props.title : undefined,
    message: typeof props.description === "string" ? props.description : "",
    variant: mapVariant(props.variant),
  });
}

function useToast() {
  const toastFn = useCallback((props: LegacyToastProps) => {
    toast(props);
  }, []);

  return { toast: toastFn };
}

export { useToast, toast };
