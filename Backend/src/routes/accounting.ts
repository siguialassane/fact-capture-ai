/**
 * Accounting Routes
 * 
 * Routes API pour la génération et gestion des écritures comptables
 */

import { Hono } from "hono";
import { registerGenerateRoutes } from "./accounting/handlers/generate";
import { registerRefineRoutes } from "./accounting/handlers/refine";
import { registerPlanComptableRoutes } from "./accounting/handlers/plan-comptable";
import { registerSaveRoutes } from "./accounting/handlers/save";
import { registerEntriesRoutes } from "./accounting/handlers/entries";
import { registerValidateEntryRoutes } from "./accounting/handlers/validate-entry";
import { registerDuplicatesRoutes } from "./accounting/handlers/duplicates";
import { registerTiersRoutes } from "./accounting/handlers/tiers";
import { registerContextRoutes } from "./accounting/handlers/context";
import { registerChatRoutes } from "./accounting/handlers/chat";

const accounting = new Hono();

registerGenerateRoutes(accounting);
registerRefineRoutes(accounting);
registerPlanComptableRoutes(accounting);
registerSaveRoutes(accounting);
registerEntriesRoutes(accounting);
registerValidateEntryRoutes(accounting);
registerDuplicatesRoutes(accounting);
registerTiersRoutes(accounting);
registerContextRoutes(accounting);
registerChatRoutes(accounting);

export default accounting;
