/**
 * Backend API Client for Fact Capture AI
 *
 * Client API unifié utilisant le pattern COMPOSITION.
 * Chaque domaine métier a son propre client dans ./clients/
 * 
 * STRUCTURE:
 * - types/         → Définitions TypeScript par domaine
 * - clients/       → Clients API par domaine
 * - backend-client.ts → Façade qui compose tout (ce fichier)
 */

import { config } from "../config";

// ===== EXPORT DES TYPES =====
export * from "./types";

// ===== IMPORT DES CLIENTS INDIVIDUELS =====
import {
  HealthClient,
  AnalysisClient,
  InvoicesClient,
  AccountingClient,
  JournalsClient,
  GrandLivreClient,
  LettrageClient,
  EtatsFinanciersClient,
  AuditClient,
  SessionsClient,
  ExportClient,
  CompanyClient,
} from "./clients";

// ===== IMPORT DES TYPES POUR LES ALIASES =====
import type {
  InvoiceAIResult,
  ChatContext,
  AccountingEntry,
  StatutPaiement,
  JournalCode,
  RegenerateAdditionalInfo,
  RegeneratedEntry,
  CompanyInfo,
} from "./types";

const BACKEND_URL = config.backendUrl;

/**
 * BackendApiClient - Classe façade qui compose tous les clients
 * 
 * Utilise le pattern COMPOSITION pour déléguer les appels
 * aux clients spécialisés par domaine.
 */
class BackendApiClient {
  // Clients internes par domaine
  private health: HealthClient;
  private analysis: AnalysisClient;
  private invoices: InvoicesClient;
  private accounting: AccountingClient;
  private journals: JournalsClient;
  private grandLivre: GrandLivreClient;
  private lettrage: LettrageClient;
  private etatsFinanciers: EtatsFinanciersClient;
  private audit: AuditClient;
  private sessions: SessionsClient;
  private exports: ExportClient;
  private company: CompanyClient;

  constructor(baseUrl: string = BACKEND_URL) {
    this.health = new HealthClient(baseUrl);
    this.analysis = new AnalysisClient(baseUrl);
    this.invoices = new InvoicesClient(baseUrl);
    this.accounting = new AccountingClient(baseUrl);
    this.journals = new JournalsClient(baseUrl);
    this.grandLivre = new GrandLivreClient(baseUrl);
    this.lettrage = new LettrageClient(baseUrl);
    this.etatsFinanciers = new EtatsFinanciersClient(baseUrl);
    this.audit = new AuditClient(baseUrl);
    this.sessions = new SessionsClient(baseUrl);
    this.exports = new ExportClient(baseUrl);
    this.company = new CompanyClient(baseUrl);
  }

  // ===========================================================================
  // HEALTH - Déléguées au HealthClient
  // ===========================================================================
  healthCheck = () => this.health.healthCheck();
  readyCheck = () => this.health.readyCheck();

  // ===========================================================================
  // ANALYSIS - Déléguées au AnalysisClient
  // ===========================================================================
  analyzeImage = (imageBase64: string, isPdf?: boolean) =>
    this.analysis.analyzeImage(imageBase64, isPdf);
  analyzePDF = (pages: string[]) =>
    this.analysis.analyzePDF(pages);
  chat = (message: string, context: ChatContext, forceReanalyze?: boolean) =>
    this.analysis.chat(message, context, forceReanalyze);

  // ===========================================================================
  // INVOICES - Déléguées au InvoicesClient
  // ===========================================================================
  getInvoices = (limit?: number, offset?: number) =>
    this.invoices.getInvoices(limit, offset);
  getInvoicesWithEntries = (limit?: number, offset?: number) =>
    this.invoices.getInvoicesWithEntries(limit, offset);
  getLatestInvoice = () =>
    this.invoices.getLatestInvoice();
  getInvoice = (id: string) =>
    this.invoices.getInvoice(id);
  createInvoice = (imageBase64: string, aiResult?: InvoiceAIResult, sessionId?: string) =>
    this.invoices.createInvoice(imageBase64, aiResult, sessionId);
  updateInvoice = (id: string, aiResult: InvoiceAIResult) =>
    this.invoices.updateInvoice(id, aiResult);
  deleteInvoice = (id: string) =>
    this.invoices.deleteInvoice(id);
  clearTestInvoices = () =>
    this.invoices.clearTestInvoices();
  cleanupUnvalidatedInvoices = () =>
    this.invoices.cleanupUnvalidatedInvoices();

  // ===========================================================================
  // ACCOUNTING - Déléguées au AccountingClient
  // ===========================================================================
  generateAccountingEntry = (
    invoiceData: Record<string, unknown>,
    statutPaiement?: StatutPaiement,
    montantPartiel?: number
  ) => this.accounting.generateAccountingEntry(invoiceData, statutPaiement, montantPartiel);

  refineAccountingEntry = (
    previousEntry: AccountingEntry,
    userFeedback: string,
    originalInvoiceData: Record<string, unknown>
  ) => this.accounting.refineAccountingEntry(previousEntry, userFeedback, originalInvoiceData);

  getPlanComptable = () => this.accounting.getPlanComptable();

  saveAccountingEntry = (
    ecriture: AccountingEntry,
    options?: {
      invoiceId?: number;
      iaModel?: string;
      iaReasoning?: string;
      iaSuggestions?: string[];
    }
  ) => this.accounting.saveAccountingEntry(ecriture, options);

  getDuplicates = () => this.accounting.getDuplicates();
  getTiers = (type?: "fournisseur" | "client") => this.accounting.getTiers(type);
  getAccountingEntriesByInvoice = (invoiceId: string) => this.accounting.getEntriesByInvoice(invoiceId);
  chatAboutEntry = (message: string, entry: AccountingEntry) =>
    this.accounting.chatAboutEntry(message, entry);

  // ===========================================================================
  // JOURNALS - Déléguées au JournalsClient
  // ===========================================================================
  getJournaux = () => this.journals.getJournaux();
  getJournalStats = () => this.journals.getJournalStats();
  getJournalSummary = (periode?: string) => this.journals.getJournalSummary(periode);
  getJournalEntries = (
    journalCode: JournalCode,
    options?: { dateDebut?: string; dateFin?: string; statut?: string; limit?: number }
  ) => this.journals.getJournalEntries(journalCode, options);
  getNextPieceNumber = (journalCode: JournalCode, datePiece?: string) =>
    this.journals.getNextPieceNumber(journalCode, datePiece);
  correctEntryJournal = (entryId: string, newJournalCode: JournalCode, reason?: string) =>
    this.journals.correctEntryJournal(entryId, newJournalCode, reason);
  regenerateEntryWithAI = (
    entryId: string,
    targetJournal: JournalCode,
    additionalInfo: RegenerateAdditionalInfo
  ) => this.journals.regenerateEntryWithAI(entryId, targetJournal, additionalInfo);
  saveRegeneratedEntry = (oldEntryId: string, newEntry: RegeneratedEntry) =>
    this.journals.saveRegeneratedEntry(oldEntryId, newEntry);

  // ===========================================================================
  // GRAND LIVRE - Déléguées au GrandLivreClient
  // ===========================================================================
  getComptesWithSoldes = (options?: {
    classeDebut?: string;
    classeFin?: string;
    avecMouvements?: boolean;
  }) => this.grandLivre.getComptesWithSoldes(options);
  getGrandLivreCompte = (
    numeroCompte: string,
    options?: { dateDebut?: string; dateFin?: string; inclureLettres?: boolean }
  ) => this.grandLivre.getGrandLivreCompte(numeroCompte, options);
  getBalance = (options?: { dateArrete?: string; classeDebut?: string; classeFin?: string }) =>
    this.grandLivre.getBalance(options);
  searchComptes = (query: string, limit?: number) =>
    this.grandLivre.searchComptes(query, limit);
  searchGrandLivre = (filter: {
    compte_debut?: string;
    compte_fin?: string;
    date_debut?: string;
    date_fin?: string;
    journal_code?: string;
    tiers_code?: string;
    inclure_lettres?: boolean;
  }) => this.grandLivre.searchGrandLivre(filter);

  // ===========================================================================
  // LETTRAGE - Déléguées au LettrageClient
  // ===========================================================================
  getLignesALettrer = (filter?: {
    compte_debut?: string;
    compte_fin?: string;
    tiers_code?: string;
    date_debut?: string;
    date_fin?: string;
    statut?: "non_lettre" | "partiellement_lettre" | "lettre";
    journal_code?: string;
  }) => this.lettrage.getLignesALettrer(filter);
  getGroupesLettrage = (compte?: string) => this.lettrage.getGroupesLettrage(compte);
  getPropositionsLettrage = (compte: string, tiersCode?: string) =>
    this.lettrage.getPropositionsLettrage(compte, tiersCode);
  getStatistiquesLettrage = (compte: string) => this.lettrage.getStatistiquesLettrage(compte);
  effectuerLettrage = (ligneIds: number[], compte: string, tiersCode?: string) =>
    this.lettrage.effectuerLettrage(ligneIds, compte, tiersCode);
  annulerLettrage = (lettre: string, compte: string) =>
    this.lettrage.annulerLettrage(lettre, compte);
  lettrageAuto = (compte: string, options?: { tiersCode?: string; confianceMin?: number }) =>
    this.lettrage.lettrageAuto(compte, options);

  // ===========================================================================
  // ÉTATS FINANCIERS - Déléguées au EtatsFinanciersClient
  // ===========================================================================
  getBilan = (exercice: string) => this.etatsFinanciers.getBilan(exercice);
  getCompteResultat = (exercice: string) => this.etatsFinanciers.getCompteResultat(exercice);
  getIndicateursFinanciers = (exercice: string) =>
    this.etatsFinanciers.getIndicateursFinanciers(exercice);

  // ===========================================================================
  // AUDIT - Déléguées au AuditClient
  // ===========================================================================
  auditEtatsFinanciers = (exercice: string) => this.audit.auditEtatsFinanciers(exercice);
  auditRapide = (exercice: string) => this.audit.auditRapide(exercice);
  auditEcriture = (facture: object, ecriture: object) =>
    this.audit.auditEcriture(facture, ecriture);

  // ===========================================================================
  // SESSIONS - Déléguées au SessionsClient
  // ===========================================================================
  createSession = (desktopId?: string, expiresInMinutes?: number) =>
    this.sessions.createSession(desktopId, expiresInMinutes);
  getSession = (id: string) => this.sessions.getSession(id);
  updateSession = (id: string, updates: { status?: string; imageBase64?: string }) =>
    this.sessions.updateSession(id, updates);

  // ===========================================================================
  // EXPORT - Déléguées au ExportClient
  // ===========================================================================
  exportInvoices = (
    invoices: InvoiceAIResult[],
    format?: "csv" | "json" | "sage",
    options?: { convertToFCFA?: boolean; includeArticles?: boolean }
  ) => this.exports.exportInvoices(invoices, format, options);

  // ==========================================================================
  // COMPANY - Déléguées au CompanyClient
  // ==========================================================================
  getCompanyInfo = (): Promise<CompanyInfo | null> => this.company.getCompanyInfo();
  updateCompanyInfo = (payload: Partial<CompanyInfo>) => this.company.updateCompanyInfo(payload);
}

// ===========================================================================
// EXPORTS
// ===========================================================================

// Singleton instance
export const backendApi = new BackendApiClient();

// Export class for custom instances
export { BackendApiClient };

// Export individual clients for advanced usage
export * from "./clients";

// ===========================================================================
// ALIASES - Compatibilité avec les anciens imports
// ===========================================================================

// Alias pour JournalEntry
export type JournalEntry = AccountingEntry;

// Fonctions aliases

// Invoices
export const getInvoices = backendApi.getInvoices;
export const getInvoicesWithEntries = backendApi.getInvoicesWithEntries;
export const getLatestInvoice = backendApi.getLatestInvoice;
export const getInvoice = backendApi.getInvoice;
export const createInvoice = backendApi.createInvoice;
export const updateInvoice = backendApi.updateInvoice;
export const deleteInvoice = backendApi.deleteInvoice;
export const clearTestInvoices = backendApi.clearTestInvoices;

// Accounting
export const generateAccountingEntry = backendApi.generateAccountingEntry;
export const refineAccountingEntry = backendApi.refineAccountingEntry;
export const getPlanComptable = backendApi.getPlanComptable;
export const saveAccountingEntry = backendApi.saveAccountingEntry;
export const getDuplicates = backendApi.getDuplicates;
export const getTiers = backendApi.getTiers;
export const chatAboutEntry = backendApi.chatAboutEntry;

// Journals
export const getJournaux = backendApi.getJournaux;
export const getJournalStats = backendApi.getJournalStats;
export const getJournalSummary = backendApi.getJournalSummary;
export const getJournalEntries = backendApi.getJournalEntries;
export const getNextPieceNumber = backendApi.getNextPieceNumber;
export const correctEntryJournal = backendApi.correctEntryJournal;
export const regenerateEntryWithAI = backendApi.regenerateEntryWithAI;
export const saveRegeneratedEntry = backendApi.saveRegeneratedEntry;

// Grand Livre
export const getComptesWithSoldes = backendApi.getComptesWithSoldes;
export const getGrandLivreCompte = backendApi.getGrandLivreCompte;
export const getBalance = backendApi.getBalance;
export const searchComptes = backendApi.searchComptes;
export const searchGrandLivre = backendApi.searchGrandLivre;

// Lettrage
export const getLignesALettrer = backendApi.getLignesALettrer;
export const getGroupesLettrage = backendApi.getGroupesLettrage;
export const getPropositionsLettrage = backendApi.getPropositionsLettrage;
export const getStatistiquesLettrage = backendApi.getStatistiquesLettrage;
export const effectuerLettrage = backendApi.effectuerLettrage;
export const annulerLettrage = backendApi.annulerLettrage;
export const lettrageAuto = backendApi.lettrageAuto;

// États Financiers
export const getBilan = backendApi.getBilan;
export const getCompteResultat = backendApi.getCompteResultat;
export const getIndicateursFinanciers = backendApi.getIndicateursFinanciers;

// Audit
export const auditEtatsFinanciers = backendApi.auditEtatsFinanciers;
export const auditRapide = backendApi.auditRapide;
export const auditEcriture = backendApi.auditEcriture;
