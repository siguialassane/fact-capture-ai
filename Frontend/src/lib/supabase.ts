import { createClient } from "@supabase/supabase-js";
import type { FlexibleInvoiceAIResult } from "./openrouter";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials not configured. Using local storage only.");
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

// Types for the invoices table
export interface InvoiceRecord {
  id?: number;
  image_path: string;
  image_url: string;
  image_base64?: string | null;
  ai_result?: FlexibleInvoiceAIResult | null;
  timestamp?: string;
  created_at?: string;
  updated_at?: string;
}

// Types for capture session (Web-PWA sync)
export interface CaptureSession {
  id?: string;
  status: "waiting" | "ready" | "captured" | "cancelled";
  created_at?: string;
  updated_at?: string;
}

// Re-export for convenience
export type { FlexibleInvoiceAIResult as InvoiceAIResult };

// ============ CAPTURE SESSION MANAGEMENT ============

// Web: Request a photo from PWA (creates a session)
export async function requestPhotoFromPWA(): Promise<CaptureSession | null> {
  try {
    // First, cancel any existing active sessions
    await supabase
      .from("capture_sessions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .in("status", ["waiting", "ready"]);

    // Create new session
    const { data, error } = await supabase
      .from("capture_sessions")
      .insert({
        status: "waiting",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating capture session:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Capture session error:", err);
    return null;
  }
}

// Web: Cancel photo request
export async function cancelPhotoRequest(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("capture_sessions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .in("status", ["waiting", "ready"]);

    return !error;
  } catch {
    return false;
  }
}

// PWA: Check if Web is waiting for a photo
export async function getActiveCaptureSession(): Promise<CaptureSession | null> {
  try {
    const { data, error } = await supabase
      .from("capture_sessions")
      .select("*")
      .eq("status", "waiting")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

// PWA: Mark session as ready (photo taken)
export async function markSessionAsCaptured(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("capture_sessions")
      .update({ status: "captured", updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    return !error;
  } catch {
    return false;
  }
}

// Subscribe to capture session changes (for both Web and PWA)
export function subscribeToCaptureSession(
  callback: (session: CaptureSession) => void
) {
  return supabase
    .channel("capture-session-channel")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "capture_sessions",
      },
      (payload) => {
        callback(payload.new as CaptureSession);
      }
    )
    .subscribe();
}

// ============ INVOICE MANAGEMENT ============

// Save invoice to Supabase
export async function saveInvoiceToSupabase(
  imageBase64: string,
  aiResult?: FlexibleInvoiceAIResult,
  sessionId?: string
): Promise<InvoiceRecord | null> {
  try {
    // Si sessionId fourni, marquer la session comme capturée
    if (sessionId) {
      await markSessionAsCaptured(sessionId);
    }

    const { data, error } = await supabase
      .from("invoices")
      .insert({
        image_path: `invoice_${Date.now()}`,
        image_url: imageBase64.substring(0, 100), // Truncated for URL field
        image_base64: imageBase64,
        ai_result: aiResult || null,
        timestamp: new Date().toISOString(),
        // Note: session_id column doesn't exist in the table
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving to Supabase:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Supabase save error:", err);
    return null;
  }
}

// Get latest invoice from Supabase
export async function getLatestInvoiceFromSupabase(): Promise<InvoiceRecord | null> {
  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching from Supabase:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Supabase fetch error:", err);
    return null;
  }
}

// Update invoice with AI result
export async function updateInvoiceAIResult(
  id: number,
  aiResult: FlexibleInvoiceAIResult
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("invoices")
      .update({
        ai_result: aiResult,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating invoice:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Supabase update error:", err);
    return false;
  }
}

// Get invoice by ID
export async function getInvoiceById(id: number): Promise<InvoiceRecord | null> {
  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching invoice by ID:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Supabase fetch error:", err);
    return null;
  }
}


// Get all invoices
export async function getAllInvoices(): Promise<InvoiceRecord[]> {
  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invoices:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Supabase fetch error:", err);
    return [];
  }
}

// Subscribe to real-time changes (for sync between mobile and desktop)
export function subscribeToInvoices(
  callback: (payload: { new: InvoiceRecord; old: InvoiceRecord | null }) => void
) {
  return supabase
    .channel("invoices-channel")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "invoices",
      },
      (payload) => {
        callback({
          new: payload.new as InvoiceRecord,
          old: payload.old as InvoiceRecord | null,
        });
      }
    )
    .subscribe();
}
