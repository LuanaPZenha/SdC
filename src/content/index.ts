import { DISTRICTS, FACTIONS } from "@/content/districts";
import { EVENTS } from "@/content/events";
import { FORMULAS } from "@/content/formulas";
import { LESSONS, TIPS } from "@/content/lessons";
import { PARAMETERS } from "@/content/parameters";
import { POLICIES } from "@/content/policies";
import type { Catalog } from "@/lib/types";
import { validateCatalog } from "@/lib/validate";

const CATALOG: Catalog = {
  districts: DISTRICTS,
  factions: FACTIONS,
  policies: POLICIES,
  events: EVENTS,
  lessons: LESSONS,
  tips: TIPS,
  parameters: PARAMETERS,
  formulas: FORMULAS,
};

export function seedCatalog(): Catalog {
  const catalog = structuredClone(CATALOG);
  const errors = validateCatalog(catalog);
  if (errors.length > 0) {
    throw new Error(`Catálogo inválido:\n${errors.join("\n")}`);
  }
  return catalog;
}
