import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { InvoiceAIResult, Article } from "../services/ai/types.js";
import { EXCHANGE_RATES } from "../services/ai/prompts.js";

export const exportRoutes = new Hono();

// Schemas
const ExportRequestSchema = z.object({
  invoices: z.array(z.any()).min(1, "At least one invoice is required"),
  format: z.enum(["csv", "json", "sage"]).default("csv"),
  options: z
    .object({
      convertToFCFA: z.boolean().optional().default(false),
      includeArticles: z.boolean().optional().default(true),
      dateFormat: z.string().optional().default("DD/MM/YYYY"),
    })
    .optional(),
});

type ExportRequest = z.infer<typeof ExportRequestSchema>;

/**
 * Convert amount to FCFA
 */
function convertToFCFA(amount: string, devise: string = "EUR"): number {
  const numericAmount = parseFloat(amount.replace(/[^\d.,]/g, "").replace(",", "."));
  if (isNaN(numericAmount)) return 0;

  const rate = EXCHANGE_RATES[devise.toUpperCase()] || EXCHANGE_RATES["EUR"];
  return Math.round(numericAmount * rate);
}

/**
 * Generate CSV content
 */
function generateCSV(invoices: InvoiceAIResult[], options: ExportRequest["options"]): string {
  const headers = [
    "Numéro Facture",
    "Date",
    "Fournisseur",
    "Type",
    "Total HT",
    "TVA",
    "Total TTC",
    "Devise",
    "Mode Paiement",
  ];

  if (options?.includeArticles) {
    headers.push("Articles");
  }

  const rows = invoices.map((inv) => {
    const row = [
      inv.numero_facture || "",
      inv.date_facture || "",
      inv.fournisseur || "",
      inv.type_document || inv.type_facture || "",
      inv.total_ht || "",
      inv.tva || "",
      inv.montant_total || "",
      inv.devise || "EUR",
      inv.mode_paiement || "",
    ];

    if (options?.includeArticles && inv.articles) {
      const articlesStr = inv.articles
        .map((a: Article) => `${a.designation} (${a.quantite}x${a.prix_unitaire})`)
        .join("; ");
      row.push(articlesStr);
    }

    return row;
  });

  // Escape CSV values
  const escapeCSV = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ].join("\n");

  return csvContent;
}

/**
 * Generate Sage-compatible export format
 */
function generateSageExport(
  invoices: InvoiceAIResult[],
  options: ExportRequest["options"]
): string {
  // Sage format (simplified - real implementation would follow Sage import specs)
  const sageLines = invoices.flatMap((inv) => {
    const lines: string[] = [];

    // Header line
    const totalFCFA = options?.convertToFCFA
      ? convertToFCFA(inv.montant_total || "0", inv.devise)
      : parseFloat(inv.montant_total?.replace(/[^\d.,]/g, "").replace(",", ".") || "0");

    lines.push(
      [
        "FAC", // Type
        inv.numero_facture || "",
        inv.date_facture || "",
        inv.fournisseur || "",
        totalFCFA.toFixed(2),
        inv.devise || "EUR",
      ].join(";")
    );

    // Article lines
    if (options?.includeArticles && inv.articles) {
      inv.articles.forEach((article: Article, idx: number) => {
        const montant = options?.convertToFCFA
          ? convertToFCFA(article.montant_ht || "0", inv.devise)
          : parseFloat(article.montant_ht?.replace(/[^\d.,]/g, "").replace(",", ".") || "0");

        lines.push(
          [
            "LIG",
            inv.numero_facture || "",
            (idx + 1).toString(),
            article.designation || "",
            article.quantite || "1",
            montant.toFixed(2),
          ].join(";")
        );
      });
    }

    return lines;
  });

  return sageLines.join("\n");
}

/**
 * POST /api/exports
 * Export invoices to various formats
 */
exportRoutes.post(
  "/",
  zValidator("json", ExportRequestSchema),
  async (c) => {
    const { invoices, format, options } = c.req.valid("json");

    console.log(`[Export] Generating ${format} export for ${invoices.length} invoices`);

    let content: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case "csv":
        content = generateCSV(invoices as InvoiceAIResult[], options);
        contentType = "text/csv; charset=utf-8";
        filename = `factures_export_${Date.now()}.csv`;
        break;

      case "sage":
        content = generateSageExport(invoices as InvoiceAIResult[], options);
        contentType = "text/plain; charset=utf-8";
        filename = `sage_import_${Date.now()}.txt`;
        break;

      case "json":
      default:
        content = JSON.stringify(invoices, null, 2);
        contentType = "application/json; charset=utf-8";
        filename = `factures_export_${Date.now()}.json`;
        break;
    }

    return c.json({
      success: true,
      data: {
        content,
        contentType,
        filename,
        invoiceCount: invoices.length,
      },
    });
  }
);

/**
 * POST /api/exports/download
 * Generate and return file for direct download
 */
exportRoutes.post(
  "/download",
  zValidator("json", ExportRequestSchema),
  async (c) => {
    const { invoices, format, options } = c.req.valid("json");

    let content: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case "csv":
        content = generateCSV(invoices as InvoiceAIResult[], options);
        contentType = "text/csv; charset=utf-8";
        filename = `factures_export_${Date.now()}.csv`;
        break;

      case "sage":
        content = generateSageExport(invoices as InvoiceAIResult[], options);
        contentType = "text/plain; charset=utf-8";
        filename = `sage_import_${Date.now()}.txt`;
        break;

      case "json":
      default:
        content = JSON.stringify(invoices, null, 2);
        contentType = "application/json; charset=utf-8";
        filename = `factures_export_${Date.now()}.json`;
        break;
    }

    c.header("Content-Type", contentType);
    c.header("Content-Disposition", `attachment; filename="${filename}"`);

    return c.body(content);
  }
);
