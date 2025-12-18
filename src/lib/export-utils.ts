// Export utilities for PDF, Excel, and Image download

// Export utilities for PDF, Excel, and Image download

export interface InvoiceExportData {
  fournisseur: string;
  montant_total: string;
  date_facture: string;
  numero_facture: string;
  tva: string;
  total_ht?: string; // New
  total_tva?: string; // New
  type_facture?: string;
  articles: {
    designation: string;
    quantite: string;
    unite?: string; // New
    prix_unitaire: string;
    prix_unitaire_ht?: string; // New
    taux_tva?: string; // New
    montant_tva?: string; // New
    total: string;
  }[];
  extra_fields?: Record<string, string>;
  ai_comment?: string;
}

// Generate PDF from invoice data
export async function exportToPDF(data: InvoiceExportData): Promise<void> {
  // Create a printable HTML document
  const htmlContent = generatePDFHTML(data);

  // Open in new window and print
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

function generatePDFHTML(data: InvoiceExportData): string {
  // Determine displayed columns based on data content
  const hasUnite = data.articles.some(a => a.unite && a.unite !== "undefined");
  const hasHT = data.articles.some(a => a.prix_unitaire_ht && a.prix_unitaire_ht !== "undefined");
  // const hasTVA = data.articles.some(a => (a.taux_tva && a.taux_tva !== "undefined") || (a.montant_tva && a.montant_tva !== "undefined"));

  const articlesRows = data.articles
    .map(
      (article) => `
      <tr>
        <td>${article.designation}</td>
        <td class="center">${article.quantite}</td>
        ${hasUnite ? `<td class="center">${article.unite || '-'}</td>` : ''}
        <td class="right">${article.prix_unitaire}</td>
        ${hasHT ? `<td class="right mono">${article.prix_unitaire_ht || '-'}</td>` : ''}
        <td class="right row-total">${article.total}</td>
      </tr>
    `
    )
    .join("");

  const extraFieldsHTML = data.extra_fields
    ? Object.entries(data.extra_fields)
      .map(
        ([key, value]) => `
          <div style="margin-bottom: 4px;">
            <span style="color: #6b7280; font-size: 13px;">${key}:</span>
            <span style="font-weight: 500; margin-left: 6px;">${value}</span>
          </div>
        `
      )
      .join("")
    : "";

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Facture ${data.numero_facture}</title>
      <style>
        @page { size: A4; margin: 2.5cm; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; line-height: 1.5; font-size: 13px; max-width: 800px; margin: 0 auto; }
        
        /* Header */
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #eee; }
        .invoice-title { font-size: 32px; font-weight: bold; color: #2c3e50; text-transform: uppercase; letter-spacing: 1px; }
        .invoice-meta { text-align: right; }
        .meta-item { margin-bottom: 4px; }
        .meta-label { font-weight: bold; color: #7f8c8d; font-size: 11px; text-transform: uppercase; }
        .meta-value { font-weight: 600; font-size: 14px; }

        /* Addresses */
        .addresses { display: flex; justify-content: space-between; margin-bottom: 40px; gap: 40px; }
        .address-box { flex: 1; }
        .box-title { font-size: 11px; font-weight: bold; color: #7f8c8d; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        .company-name { font-size: 16px; font-weight: bold; margin-bottom: 5px; color: #2c3e50; }
        .address-lines { white-space: pre-line; color: #555; }

        /* Details List */
        .details-section { background: #f9f9f9; padding: 15px; border-radius: 4px; margin-bottom: 30px; border: 1px solid #eee; }
        .details-grid { display: flex; flex-wrap: wrap; gap: 15px 30px; }
        .detail-item { display: flex; flex-direction: column; min-width: 150px; }
        .detail-label { font-size: 10px; font-weight: bold; color: #7f8c8d; text-transform: uppercase; }
        .detail-value { font-size: 13px; font-weight: 500; word-break: break-all; }

        /* Table */
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { text-align: left; padding: 12px 8px; border-bottom: 2px solid #2c3e50; color: #2c3e50; font-weight: bold; font-size: 11px; text-transform: uppercase; }
        td { padding: 12px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
        .right { text-align: right; }
        .center { text-align: center; }
        .mono { font-family: 'Courier New', monospace; }
        .row-total { font-weight: bold; color: #2c3e50; }

        /* Totals */
        .totals-container { display: flex; justify-content: flex-end; page-break-inside: avoid; }
        .totals-table { width: 300px; border-collapse: collapse; }
        .totals-table td { padding: 8px 0; border-bottom: 1px solid #eee; }
        .totals-table .total-label { font-weight: 600; color: #7f8c8d; }
        .totals-table .total-amount { text-align: right; font-weight: 600; font-family: 'Courier New', monospace; font-size: 14px; }
        .totals-table .final-row td { border-top: 2px solid #2c3e50; border-bottom: none; padding-top: 15px; color: #2c3e50; font-size: 16px; }
        .totals-table .final-row .total-amount { font-size: 18px; font-weight: bold; }

        /* Footer */
        .footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 20px; text-align: center; font-size: 10px; color: #95a5a6; border-top: 1px solid #eee; background: white; }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <div>
          <div class="invoice-title">FACTURE</div>
          <div style="color: #7f8c8d; margin-top: 5px;">Ref: ${data.numero_facture}</div>
        </div>
        <div class="invoice-meta">
          <div class="meta-item">
            <div class="meta-label">Date d'émission</div>
            <div class="meta-value">${data.date_facture}</div>
          </div>
          ${data.type_facture ? `
          <div class="meta-item" style="margin-top: 10px;">
            <div class="meta-label">Type</div>
            <div class="meta-value" style="text-transform: capitalize;">${data.type_facture}</div>
          </div>` : ''}
        </div>
      </div>

      <!-- Addresses -->
      <div class="addresses">
        <div class="address-box">
          <div class="box-title">Émetteur</div>
          <div class="company-name">${data.fournisseur}</div>
          <div class="address-lines">
            ${data.extra_fields?.["Adresse fournisseur"] || ''}
            ${data.extra_fields?.["Téléphone"] ? `Tél: ${data.extra_fields["Téléphone"]}` : ''}
            ${data.extra_fields?.["Email"] || ''}
          </div>
        </div>
        <div class="address-box">
          <div class="box-title">Adressé à</div>
          <div class="company-name">Mon Entreprise</div>
          <div class="address-lines">
            ${data.extra_fields?.["Adresse client"] || 'Adresse non renseignée'}
          </div>
        </div>
      </div>

      <!-- Extra Details (Full Width Grid) -->
      ${extraFieldsHTML ? `
      <div class="details-section">
        <div class="box-title" style="margin-bottom: 15px; border: none;">Informations Complémentaires</div>
        <div class="details-grid">
          ${data.extra_fields ? Object.entries(data.extra_fields).filter(([k]) => !['Adresse fournisseur', 'Téléphone', 'Email', 'Adresse client'].includes(k)).map(([k, v]) => `
            <div class="detail-item">
              <span class="detail-label">${k}</span>
              <span class="detail-value">${v}</span>
            </div>
          `).join('') : ''}
        </div>
      </div>
      ` : ''}

      <!-- Articles Table -->
      <table>
        <thead>
          <tr>
            <th style="width: 40%">Désignation</th>
            <th class="center" style="width: 10%">Qté</th>
            ${hasUnite ? `<th class="center" style="width: 10%">Unité</th>` : ''}
            <th class="right" style="width: 12%">Prix Uni.</th>
            ${hasHT ? `<th class="right" style="width: 12%">P.U. HT</th>` : ''}
            <th class="right" style="width: 15%">Total</th>
          </tr>
        </thead>
        <tbody>
          ${articlesRows}
        </tbody>
      </table>

      <!-- Totals -->
      <div class="totals-container">
        <table class="totals-table">
          <tr>
            <td class="total-label">Total HT</td>
            <td class="total-amount">${data.total_ht || (data.tva ? 'Calculé...' : data.montant_total)}</td>
          </tr>
          <tr>
            <td class="total-label">Total TVA</td>
            <td class="total-amount">${data.total_tva || data.tva || '0,00 €'}</td>
          </tr>
          <tr class="final-row">
            <td class="total-label">Net à Payer</td>
            <td class="total-amount">${data.montant_total}</td>
          </tr>
        </table>
      </div>

      <!-- Footer -->
      <div class="footer">
        Généré le ${new Date().toLocaleDateString("fr-FR")} via Fact Capture AI
      </div>
    </body>
    </html>
  `;
}

// Generate Excel (CSV) from invoice data with Transposed Metadata Layout
export function exportToExcel(data: InvoiceExportData): void {
  const BOM = "\uFEFF"; // UTF-8 BOM for Excel compatibility
  let csv = BOM;

  // 1. HEADER ROW (Metadata Keys)
  let headerKeys = ["Facture", "Date", "Fournisseur", "Type"];
  let headerValues = [data.numero_facture, data.date_facture, data.fournisseur, data.type_facture || ""];

  if (data.extra_fields) {
    Object.keys(data.extra_fields).forEach(key => headerKeys.push(key));
    Object.values(data.extra_fields).forEach(val => headerValues.push(val));
  }

  // Write Metadata Rows
  csv += headerKeys.join(";") + "\n";
  csv += headerValues.join(";") + "\n";

  csv += "\n"; // Empty row spacing

  // 2. ARTICLES TABLE
  // Check available columns
  const hasUnite = data.articles.some(a => a.unite && a.unite !== "undefined");
  const hasHT = data.articles.some(a => a.prix_unitaire_ht && a.prix_unitaire_ht !== "undefined");
  const hasTVA = data.articles.some(a => (a.taux_tva && a.taux_tva !== "undefined") || (a.montant_tva && a.montant_tva !== "undefined"));

  // Build header
  let articleHeaders = ["Désignation", "Quantité"];
  if (hasUnite) articleHeaders.push("Unité");
  articleHeaders.push("Prix Unitaire");
  if (hasHT) articleHeaders.push("P.U. HT");
  if (hasTVA) {
    articleHeaders.push("% TVA");
    articleHeaders.push("Montant TVA");
  }
  articleHeaders.push("Total");

  csv += articleHeaders.join(";") + "\n";

  // Build rows
  data.articles.forEach((article) => {
    let row = [article.designation, article.quantite];
    if (hasUnite) row.push(article.unite || "");
    row.push(article.prix_unitaire);
    if (hasHT) row.push(article.prix_unitaire_ht || "");
    if (hasTVA) {
      row.push(article.taux_tva || "");
      row.push(article.montant_tva || "");
    }
    row.push(article.total);
    csv += row.join(";") + "\n";
  });

  csv += "\n";

  // 3. FOOTER TOTALS (Aligned to right under Total column ideally, or separated)
  // To align roughly, we can add empty cells
  const emptyCellsCount = articleHeaders.length - 2; // -2 for Label + Value
  const emptyPrefix = ";".repeat(emptyCellsCount > 0 ? emptyCellsCount : 0);

  csv += `${emptyPrefix}Total HT;${data.total_ht || ""} \n`;
  csv += `${emptyPrefix}Total TVA;${data.total_tva || data.tva} \n`;
  csv += `${emptyPrefix}TOTAL TTC;${data.montant_total} \n`;

  // Download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `facture_${data.numero_facture || "export"}_${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Download image
export function downloadImage(imageData: string, filename?: string): void {
  const link = document.createElement("a");
  link.href = imageData;
  link.download = filename || `facture_${Date.now()}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Convert file to base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Extract text from PDF (basic - uses browser rendering)
export async function extractTextFromPDF(file: File): Promise<string> {
  // For PDF analysis, we'll send the base64 to the AI
  const base64 = await fileToBase64(file);
  return base64;
}
