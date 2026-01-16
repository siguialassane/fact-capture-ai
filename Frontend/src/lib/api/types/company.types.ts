export interface CompanyInfo {
  id?: string;
  raison_sociale?: string;
  forme_juridique?: string | null;
  capital_social?: number | null;
  devise?: string | null;
  rccm?: string | null;
  ncc?: string | null;
  adresse?: string | null;
  ville?: string | null;
  pays?: string | null;
  telephone?: string | null;
  email?: string | null;
  site_web?: string | null;
  secteur_activite?: string | null;
  logo_url?: string | null;
  date_creation?: string | null;
  exercice_debut?: number | null;
  created_at?: string;
  updated_at?: string;
}