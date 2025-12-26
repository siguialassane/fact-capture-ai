/**
 * Service de Régénération d'Écriture Comptable avec DeepSeek
 * 
 * Permet de transformer une écriture d'un journal à un autre
 * avec régénération complète par l'IA.
 */

import { supabase } from "../../lib/supabase";
import type { JournalCode } from "./types";

// Configuration OpenRouter
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DEEPSEEK_MODEL = process.env.GEMINI_MODEL || "deepseek/deepseek-chat";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Informations supplémentaires pour la régénération
 */
export interface RegenerateAdditionalInfo {
    new_tiers_name?: string;
    new_tiers_type: "client" | "fournisseur";
    payment_mode: "especes" | "carte_bancaire" | "virement" | "cheque" | "credit";
    reason: string;
}

/**
 * Requête de régénération
 */
export interface RegenerateEntryRequest {
    entry_id: string;
    target_journal: JournalCode;
    additional_info: RegenerateAdditionalInfo;
}

/**
 * Structure d'une ligne d'écriture régénérée
 */
export interface RegeneratedLine {
    numero_compte: string;
    libelle_compte: string;
    libelle_ligne: string;
    debit: number;
    credit: number;
}

/**
 * Écriture régénérée par l'IA
 */
export interface RegeneratedEntry {
    date_piece: string;
    numero_piece: string;
    journal_code: JournalCode;
    journal_libelle: string;
    libelle_general: string;
    tiers_code?: string;
    tiers_nom?: string;
    lignes: RegeneratedLine[];
    total_debit: number;
    total_credit: number;
    equilibre: boolean;
    commentaires?: string;
}

/**
 * Résultat de la régénération
 */
export interface RegenerateResult {
    success: boolean;
    proposed_entry?: RegeneratedEntry;
    reasoning?: string;
    changes_summary?: {
        old_journal: JournalCode;
        new_journal: JournalCode;
        old_tiers?: string;
        new_tiers?: string;
        accounts_changed: number;
    };
    error?: string;
}

/**
 * Mapping des journaux vers leurs caractéristiques
 */
const JOURNAL_INFO: Record<JournalCode, {
    libelle: string;
    contrepartie_compte: string;
    contrepartie_libelle: string;
    tiers_type: "client" | "fournisseur" | "banque" | "caisse" | "divers";
}> = {
    AC: { libelle: "Journal des Achats", contrepartie_compte: "4011", contrepartie_libelle: "Fournisseurs", tiers_type: "fournisseur" },
    VE: { libelle: "Journal des Ventes", contrepartie_compte: "4111", contrepartie_libelle: "Clients", tiers_type: "client" },
    BQ: { libelle: "Journal de Banque", contrepartie_compte: "5211", contrepartie_libelle: "Banque", tiers_type: "banque" },
    CA: { libelle: "Journal de Caisse", contrepartie_compte: "571", contrepartie_libelle: "Caisse", tiers_type: "caisse" },
    OD: { libelle: "Journal des Opérations Diverses", contrepartie_compte: "", contrepartie_libelle: "Divers", tiers_type: "divers" },
};

/**
 * Construit le prompt pour DeepSeek
 */
function buildRegeneratePrompt(
    existingEntry: any,
    existingLines: any[],
    targetJournal: JournalCode,
    additionalInfo: RegenerateAdditionalInfo
): string {
    const originalJournal = existingEntry.journal_code as JournalCode;
    const targetInfo = JOURNAL_INFO[targetJournal];
    const originalInfo = JOURNAL_INFO[originalJournal];

    return `Tu es un expert-comptable SYSCOHADA. Tu dois TRANSFORMER une écriture comptable existante pour la déplacer vers un autre journal.

## ÉCRITURE ORIGINALE (Journal ${originalJournal} - ${originalInfo.libelle})

**Informations générales:**
- Date: ${existingEntry.date_piece}
- N° Pièce: ${existingEntry.numero_piece}
- Libellé: ${existingEntry.libelle || existingEntry.libelle_general}
- Tiers: ${existingEntry.tiers_nom || "Non spécifié"}
- Montant Total: ${existingEntry.total_debit} FCFA

**Lignes actuelles:**
${existingLines.map((l, i) => `${i + 1}. Compte ${l.compte_numero || l.numero_compte || "?"} - ${l.libelle || l.libelle_ligne || "?"} | Débit: ${l.debit || 0} | Crédit: ${l.credit || 0}`).join('\n')}

## TRANSFORMATION DEMANDÉE

**Nouveau journal cible:** ${targetJournal} - ${targetInfo.libelle}
**Nouveau type de tiers:** ${additionalInfo.new_tiers_type}
**Nouveau nom du tiers:** ${additionalInfo.new_tiers_name || existingEntry.tiers_nom || "À déterminer"}
**Mode de paiement:** ${additionalInfo.payment_mode}
**Raison:** ${additionalInfo.reason}

## RÈGLES DE TRANSFORMATION

1. **Changer le compte de contrepartie** selon le nouveau journal:
   - AC (Achats) → 4011 Fournisseurs
   - VE (Ventes) → 4111 Clients  
   - BQ (Banque) → 5211 Banque
   - CA (Caisse) → 571 Caisse

2. **Adapter les comptes de charge/produit** si nécessaire:
   - Achat → Comptes 60xx (Charges)
   - Vente → Comptes 70xx (Produits)

3. **Inverser le sens** si on passe d'achat à vente ou vice versa:
   - Achat: Débit (6xxx, 4452) / Crédit (401x, 521x, 571)
   - Vente: Débit (411x, 521x, 571) / Crédit (7xxx, 4431)

4. **Conserver le montant total** et l'équilibre

## FORMAT DE RÉPONSE (JSON STRICT)

\`\`\`json
{
  "date_piece": "YYYY-MM-DD",
  "numero_piece": "CODE-ANNEE-MOIS-NUMERO",
  "journal_code": "${targetJournal}",
  "journal_libelle": "${targetInfo.libelle}",
  "libelle_general": "Description adaptée",
  "tiers_nom": "Nom du tiers",
  "lignes": [
    {
      "numero_compte": "XXXX",
      "libelle_compte": "Nom du compte",
      "libelle_ligne": "Description de la ligne",
      "debit": 0.00,
      "credit": 0.00
    }
  ],
  "total_debit": 0.00,
  "total_credit": 0.00,
  "equilibre": true,
  "commentaires": "Transformation de ${originalJournal} vers ${targetJournal}"
}
\`\`\`

IMPORTANT: 
- total_debit DOIT ÊTRE ÉGAL à total_credit
- Les montants doivent être des nombres, pas des chaînes
- Réponds UNIQUEMENT avec le JSON`;
}

/**
 * Régénère une écriture comptable pour un nouveau journal avec DeepSeek
 */
export async function regenerateEntryForJournal(
    request: RegenerateEntryRequest
): Promise<RegenerateResult> {
    const { entry_id, target_journal, additional_info } = request;

    if (!OPENROUTER_API_KEY) {
        return {
            success: false,
            error: "OPENROUTER_API_KEY non configurée",
        };
    }

    try {
        console.log(`[Regenerate] Régénération écriture ${entry_id} vers ${target_journal}...`);

        // 1. Récupérer l'écriture existante
        const { data: existingEntry, error: fetchError } = await supabase
            .from("journal_entries")
            .select("*")
            .eq("id", entry_id)
            .single();

        if (fetchError || !existingEntry) {
            return {
                success: false,
                error: `Écriture non trouvée: ${entry_id}`,
            };
        }

        // 2. Récupérer les lignes
        const { data: existingLines, error: linesError } = await supabase
            .from("journal_entry_lines")
            .select("*")
            .eq("entry_id", entry_id)
            .order("numero_ligne");

        if (linesError) {
            console.error("[Regenerate] Erreur récupération lignes:", linesError);
        }

        const lines = existingLines || [];
        const oldJournal = existingEntry.journal_code as JournalCode;

        // Si même journal, pas besoin de régénérer
        if (oldJournal === target_journal) {
            return {
                success: false,
                error: "L'écriture est déjà dans ce journal",
            };
        }

        // 3. Appeler DeepSeek pour régénérer
        const prompt = buildRegeneratePrompt(
            existingEntry,
            lines,
            target_journal,
            additional_info
        );

        const startTime = Date.now();

        const response = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": process.env.APP_URL || "http://localhost:3001",
                "X-Title": "Fact Capture AI - Journal Regeneration",
            },
            body: JSON.stringify({
                model: DEEPSEEK_MODEL,
                messages: [
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                temperature: 0.1, // Très déterministe pour la comptabilité
                max_tokens: 2000,
            }),
        });

        const duration = Date.now() - startTime;

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Regenerate] Erreur API DeepSeek:", errorText);
            return {
                success: false,
                error: `Erreur API: ${response.status}`,
            };
        }

        const result = await response.json() as {
            choices?: Array<{
                message?: {
                    content?: string;
                    reasoning_content?: string;
                };
            }>;
        };

        const content = result.choices?.[0]?.message?.content;
        const reasoning = result.choices?.[0]?.message?.reasoning_content;

        if (!content) {
            return {
                success: false,
                error: "Pas de réponse de DeepSeek",
            };
        }

        // 4. Parser la réponse JSON
        let entryData: any;
        try {
            // Nettoyer les balises markdown si présentes
            let cleanContent = content;
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                cleanContent = jsonMatch[1];
            }
            entryData = JSON.parse(cleanContent);
        } catch (parseError) {
            console.error("[Regenerate] Erreur parsing JSON:", parseError);
            console.log("[Regenerate] Contenu brut:", content);
            return {
                success: false,
                error: "Impossible de parser la réponse de DeepSeek",
            };
        }

        // 5. Construire l'écriture régénérée
        const targetInfo = JOURNAL_INFO[target_journal];

        const proposedEntry: RegeneratedEntry = {
            date_piece: entryData.date_piece || existingEntry.date_piece,
            numero_piece: entryData.numero_piece || `${target_journal}-${new Date().toISOString().slice(0, 7).replace("-", "-")}-TEMP`,
            journal_code: target_journal,
            journal_libelle: targetInfo.libelle,
            libelle_general: entryData.libelle_general || existingEntry.libelle || existingEntry.libelle_general,
            tiers_code: entryData.tiers_code,
            tiers_nom: entryData.tiers_nom || additional_info.new_tiers_name || existingEntry.tiers_nom,
            lignes: (entryData.lignes || []).map((l: any) => ({
                numero_compte: l.numero_compte,
                libelle_compte: l.libelle_compte || "",
                libelle_ligne: l.libelle_ligne || l.libelle_compte || "",
                debit: Number(l.debit) || 0,
                credit: Number(l.credit) || 0,
            })),
            total_debit: Number(entryData.total_debit) || 0,
            total_credit: Number(entryData.total_credit) || 0,
            equilibre: Math.abs((entryData.total_debit || 0) - (entryData.total_credit || 0)) < 0.01,
            commentaires: entryData.commentaires || `Régénéré depuis ${oldJournal} en ${duration}ms`,
        };

        console.log(`[Regenerate] Écriture régénérée en ${duration}ms - Équilibre: ${proposedEntry.equilibre}`);

        return {
            success: true,
            proposed_entry: proposedEntry,
            reasoning: reasoning || "Transformation effectuée selon les règles SYSCOHADA",
            changes_summary: {
                old_journal: oldJournal,
                new_journal: target_journal,
                old_tiers: existingEntry.tiers_nom,
                new_tiers: proposedEntry.tiers_nom,
                accounts_changed: proposedEntry.lignes.length,
            },
        };
    } catch (error) {
        console.error("[Regenerate] Erreur:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erreur inconnue",
        };
    }
}

/**
 * Sauvegarde l'écriture régénérée et supprime l'ancienne
 */
export async function saveRegeneratedEntry(
    oldEntryId: string,
    newEntry: RegeneratedEntry,
    iaModel: string = "deepseek/deepseek-chat"
): Promise<{ success: boolean; newEntryId?: string; error?: string }> {
    try {
        // 1. Vérifier que l'écriture est équilibrée
        if (!newEntry.equilibre) {
            return {
                success: false,
                error: "L'écriture n'est pas équilibrée",
            };
        }

        // 2. Récupérer l'exercice courant
        const exerciceCode = `${new Date().getFullYear()}`;

        // 3. Insérer la nouvelle écriture
        const { data: entry, error: entryError } = await supabase
            .from("journal_entries")
            .insert({
                numero_piece: newEntry.numero_piece,
                date_piece: newEntry.date_piece,
                date_comptable: new Date().toISOString().split("T")[0],
                journal_code: newEntry.journal_code,
                exercice_code: exerciceCode,
                libelle: newEntry.libelle_general,
                tiers_code: newEntry.tiers_code,
                tiers_nom: newEntry.tiers_nom,
                montant_total: newEntry.total_debit,
                total_debit: newEntry.total_debit,
                total_credit: newEntry.total_credit,
                statut: "brouillon",
                genere_par_ia: true,
                ia_model: iaModel,
                notes: newEntry.commentaires,
            })
            .select()
            .single();

        if (entryError || !entry) {
            console.error("[Regenerate] Erreur insertion écriture:", entryError);
            return {
                success: false,
                error: `Erreur insertion: ${entryError?.message}`,
            };
        }

        // 4. Insérer les lignes
        const lignesData = newEntry.lignes.map((ligne, index) => ({
            entry_id: entry.id,
            compte_numero: ligne.numero_compte,
            libelle_compte: ligne.libelle_compte,
            libelle: ligne.libelle_ligne,
            debit: ligne.debit,
            credit: ligne.credit,
            numero_ligne: index + 1,
            ligne_ordre: index + 1,
        }));

        const { error: lignesError } = await supabase
            .from("journal_entry_lines")
            .insert(lignesData);

        if (lignesError) {
            console.error("[Regenerate] Erreur insertion lignes:", lignesError);
            // Rollback: supprimer l'écriture si les lignes échouent
            await supabase.from("journal_entries").delete().eq("id", entry.id);
            return {
                success: false,
                error: `Erreur insertion lignes: ${lignesError.message}`,
            };
        }

        // 5. Supprimer les anciennes lignes
        const { error: deleteOldLinesError } = await supabase
            .from("journal_entry_lines")
            .delete()
            .eq("entry_id", oldEntryId);

        if (deleteOldLinesError) {
            console.error("[Regenerate] Erreur suppression anciennes lignes:", deleteOldLinesError);
        }

        // 6. Supprimer l'ancienne écriture
        const { error: deleteOldError } = await supabase
            .from("journal_entries")
            .delete()
            .eq("id", oldEntryId);

        if (deleteOldError) {
            console.error("[Regenerate] Erreur suppression ancienne écriture:", deleteOldError);
            // Note: On continue quand même car la nouvelle écriture est créée
        }

        // 7. Logger l'audit
        await supabase.from("control_audit_log").insert({
            control_type: "entry_regenerated",
            entity_type: "journal_entry",
            entity_id: entry.id,
            status: "passed",
            message: `Écriture régénérée: ${oldEntryId} → ${entry.id}`,
            details: {
                old_entry_id: oldEntryId,
                new_entry_id: entry.id,
                new_journal: newEntry.journal_code,
                genere_par_ia: true,
            },
            executed_by: "user",
        });

        console.log(`[Regenerate] Écriture sauvegardée: ${entry.id} (ancienne: ${oldEntryId} supprimée)`);

        return {
            success: true,
            newEntryId: entry.id,
        };
    } catch (error) {
        console.error("[Regenerate] Erreur sauvegarde:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erreur inconnue",
        };
    }
}
