/**
 * API Client pour le Lettrage SYSCOHADA
 * Gestion du rapprochement des écritures comptables
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ============================================================================
// TYPES
// ============================================================================

export interface LigneLettrable {
  id: number;
  journal_entry_id: number;
  compte_numero: string;
  compte_libelle?: string;
  date_piece: string;
  numero_piece: string;
  libelle: string;
  debit: number;
  credit: number;
  solde: number;
  lettre?: string;
  date_lettrage?: string;
  tiers_id?: number;
  tiers_nom?: string;
  anciennete_jours: number;
}

export interface GroupeLettrage {
  compte: string;
  compte_libelle?: string;
  lignes: LigneLettrable[];
  total_debit: number;
  total_credit: number;
  solde: number;
  nb_lignes_lettrees: number;
  nb_lignes_non_lettrees: number;
}

export interface PropositionLettrage {
  lignes: LigneLettrable[];
  lettre_proposee: string;
  confiance: number;
  raison: string;
}

export interface StatistiquesLettrage {
  compte: string;
  total_lignes: number;
  lignes_lettrees: number;
  lignes_non_lettrees: number;
  taux_lettrage: number;
  solde_non_lettre: number;
  derniere_activite?: string;
}

export interface LettrageRequest {
  ligne_ids: number[];
  compte: string;
  lettre?: string;
}

export interface LettrageResponse {
  success: boolean;
  lettre: string;
  lignes_lettrees: number;
  message?: string;
}

export interface DelettrageRequest {
  lettre: string;
  compte: string;
}

export interface AutoLettrageRequest {
  compte: string;
  tolerance?: number;
  criteres?: {
    meme_montant?: boolean;
    meme_tiers?: boolean;
    meme_reference?: boolean;
  };
}

export interface AutoLettrageResponse {
  success: boolean;
  groupes_lettres: number;
  lignes_lettrees: number;
  details: Array<{
    lettre: string;
    lignes: number[];
    montant: number;
  }>;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Récupère les lignes lettrables pour un compte
 */
export async function getLignesALettrer(
  compte: string,
  options?: {
    nonLettreesUniquement?: boolean;
    dateDebut?: string;
    dateFin?: string;
    tiersId?: number;
  }
): Promise<LigneLettrable[]> {
  const params = new URLSearchParams();
  params.append('compte', compte);
  
  if (options?.nonLettreesUniquement) {
    params.append('non_lettrees', 'true');
  }
  if (options?.dateDebut) {
    params.append('date_debut', options.dateDebut);
  }
  if (options?.dateFin) {
    params.append('date_fin', options.dateFin);
  }
  if (options?.tiersId) {
    params.append('tiers_id', options.tiersId.toString());
  }
  
  const response = await fetch(`${API_BASE}/api/lettrage/lignes?${params}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur lors de la récupération des lignes');
  }
  
  return response.json();
}

/**
 * Récupère un groupe de lettrage pour un compte
 */
export async function getGroupeLettrage(compte: string): Promise<GroupeLettrage> {
  const response = await fetch(`${API_BASE}/api/lettrage/groupe/${encodeURIComponent(compte)}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur lors de la récupération du groupe');
  }
  
  return response.json();
}

/**
 * Effectue le lettrage de plusieurs lignes
 */
export async function effectuerLettrage(request: LettrageRequest): Promise<LettrageResponse> {
  const response = await fetch(`${API_BASE}/api/lettrage/effectuer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur lors du lettrage');
  }
  
  return response.json();
}

/**
 * Annule un lettrage existant
 */
export async function annulerLettrage(request: DelettrageRequest): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/api/lettrage/annuler`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur lors de l\'annulation du lettrage');
  }
  
  return response.json();
}

/**
 * Lettrage automatique par l'IA
 */
export async function lettrageAutomatique(request: AutoLettrageRequest): Promise<AutoLettrageResponse> {
  const response = await fetch(`${API_BASE}/api/lettrage/auto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur lors du lettrage automatique');
  }
  
  return response.json();
}

/**
 * Récupère les propositions de lettrage de l'IA
 */
export async function getPropositionsLettrage(compte: string): Promise<PropositionLettrage[]> {
  const response = await fetch(`${API_BASE}/api/lettrage/propositions/${encodeURIComponent(compte)}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur lors de la récupération des propositions');
  }
  
  return response.json();
}

/**
 * Récupère les statistiques de lettrage pour un compte
 */
export async function getStatistiquesLettrage(compte: string): Promise<StatistiquesLettrage> {
  const response = await fetch(`${API_BASE}/api/lettrage/stats/${encodeURIComponent(compte)}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur lors de la récupération des statistiques');
  }
  
  return response.json();
}

/**
 * Récupère la liste des comptes avec lignes non lettrées
 */
export async function getComptesNonLettres(): Promise<Array<{
  compte: string;
  libelle: string;
  nb_lignes: number;
  solde: number;
}>> {
  const response = await fetch(`${API_BASE}/api/lettrage/comptes-non-lettres`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur lors de la récupération des comptes');
  }
  
  return response.json();
}

/**
 * Vérifie si un groupe de lignes peut être lettré
 */
export function canLettrer(lignes: LigneLettrable[], tolerance: number = 0.01): {
  canLettrer: boolean;
  totalDebit: number;
  totalCredit: number;
  ecart: number;
  raison?: string;
} {
  if (lignes.length < 2) {
    return {
      canLettrer: false,
      totalDebit: 0,
      totalCredit: 0,
      ecart: 0,
      raison: 'Il faut au moins 2 lignes pour effectuer un lettrage',
    };
  }
  
  const comptes = new Set(lignes.map(l => l.compte_numero));
  if (comptes.size > 1) {
    return {
      canLettrer: false,
      totalDebit: 0,
      totalCredit: 0,
      ecart: 0,
      raison: 'Toutes les lignes doivent appartenir au même compte',
    };
  }
  
  const dejaLettrees = lignes.filter(l => l.lettre);
  if (dejaLettrees.length > 0) {
    return {
      canLettrer: false,
      totalDebit: 0,
      totalCredit: 0,
      ecart: 0,
      raison: `${dejaLettrees.length} ligne(s) déjà lettrée(s)`,
    };
  }
  
  const totalDebit = lignes.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = lignes.reduce((sum, l) => sum + (l.credit || 0), 0);
  const ecart = Math.abs(totalDebit - totalCredit);
  
  if (ecart > tolerance) {
    return {
      canLettrer: false,
      totalDebit,
      totalCredit,
      ecart,
      raison: `Écart de ${ecart.toFixed(2)} € entre débit et crédit`,
    };
  }
  
  return {
    canLettrer: true,
    totalDebit,
    totalCredit,
    ecart,
  };
}

/**
 * Génère la prochaine lettre de lettrage (côté client pour preview)
 */
export function generateNextLettre(currentLettre?: string): string {
  if (!currentLettre) return 'AA';
  
  const chars = currentLettre.split('');
  let i = chars.length - 1;
  
  while (i >= 0) {
    if (chars[i] === 'Z') {
      chars[i] = 'A';
      i--;
    } else {
      chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
      break;
    }
  }
  
  if (i < 0) {
    return 'A' + chars.join('');
  }
  
  return chars.join('');
}
