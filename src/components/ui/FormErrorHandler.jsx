import React from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Shows a friendly error message when a form submission fails.
 * Parses Supabase error messages into human-readable text.
 */
export default function FormErrorHandler({ error }) {
  if (!error) return null;

  const getMessage = (err) => {
    if (typeof err === "string") return err;
    const msg = err?.message || err?.toString() || "Something went wrong";

    if (msg.includes("Could not find the") && msg.includes("column")) {
      const col = msg.match(/'([^']+)' column/)?.[1];
      return col
        ? `A technical issue occurred (missing field: ${col}). Please run the latest schema migration in Supabase or try again shortly.`
        : "A technical issue occurred with the database. Please try again shortly.";
    }
    if (msg.includes("column") && msg.includes("does not exist")) {
      const col = msg.match(/column \"([^\"]+)\"/)?.[1];
      return col
        ? `A technical issue occurred (missing field: ${col}). Please run the latest schema migration in Supabase.`
        : "A technical issue occurred with the database schema.";
    }
    if (msg.includes("duplicate key")) return "This already exists. Please check and try again.";
    if (msg.includes("violates not-null")) return "Please fill in all required fields.";
    if (msg.includes("JWT")) return "Your session has expired. Please sign in again.";
    if (msg.includes("network") || msg.includes("fetch")) return "Connection error. Please check your internet and try again.";
    return msg;
  };

  return (
    <Alert variant="destructive" className="mt-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{getMessage(error)}</AlertDescription>
    </Alert>
  );
}
