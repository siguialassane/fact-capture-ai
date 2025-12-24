import Dexie, { type Table } from "dexie";

export interface InvoiceData {
  id?: number;
  image: string;
  createdAt: Date;
  analyzed: boolean;
  data?: {
    fournisseur: string;
    montant_total: string;
    date_facture: string;
    numero_facture: string;
    tva: string;
    articles: {
      designation: string;
      quantite: string;
      prix_unitaire: string;
      total: string;
    }[];
  };
}

export class InvoiceDB extends Dexie {
  invoices!: Table<InvoiceData>;

  constructor() {
    super("InvoiceScanner");
    this.version(1).stores({
      invoices: "++id, createdAt, analyzed",
    });
  }
}

export const db = new InvoiceDB();

export async function saveInvoice(imageBase64: string): Promise<number> {
  // Clear previous invoices before saving new one
  await db.invoices.clear();
  
  return await db.invoices.add({
    image: imageBase64,
    createdAt: new Date(),
    analyzed: false,
  });
}

export async function getLatestInvoice(): Promise<InvoiceData | undefined> {
  return await db.invoices.orderBy("createdAt").last();
}

export async function updateInvoiceData(
  id: number,
  data: InvoiceData["data"]
): Promise<void> {
  await db.invoices.update(id, { data, analyzed: true });
}
