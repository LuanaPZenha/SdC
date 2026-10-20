import { writeFileSync } from "fs";
import { seedCatalog } from "../src/content";

const catalog = seedCatalog();

function dollar(value: string): string {
  return `$sdc$${value.replaceAll("$sdc$", "")}$sdc$`;
}

function num(value: number | null): string {
  return value == null ? "NULL" : String(value);
}

const lines: string[] = ["BEGIN;"];
for (const district of catalog.districts) {
  lines.push(
    `INSERT INTO districts (id, name, official_district, population, elderly, tourism, commerce, schools, border, neighbors, svg_path, label_x, label_y) VALUES (${dollar(district.id)}, ${dollar(district.name)}, ${dollar(district.officialDistrict)}, ${district.population}, ${district.elderly}, ${district.tourism}, ${district.commerce}, ${district.schools}, ${district.border}, ${dollar(JSON.stringify(district.neighbors))}::jsonb, ${dollar(district.path)}, ${district.labelX}, ${district.labelY});`,
  );
}
for (const faction of catalog.factions) {
  lines.push(
    `INSERT INTO factions (id, name, description, weight, start_value) VALUES (${dollar(faction.id)}, ${dollar(faction.name)}, ${dollar(faction.description)}, ${faction.weight}, ${faction.start});`,
  );
}
for (const policy of catalog.policies) {
  lines.push(
    `INSERT INTO policies (id, name, category, summary, lesson, kind, cost, daily_cost, cooldown_days, max_uses, exclusive_group, effects) VALUES (${dollar(policy.id)}, ${dollar(policy.name)}, ${dollar(policy.category)}, ${dollar(policy.summary)}, ${dollar(policy.lesson)}, ${dollar(policy.kind)}, ${policy.cost}, ${policy.dailyCost}, ${policy.cooldownDays}, ${num(policy.maxUses)}, ${policy.exclusiveGroup ? dollar(policy.exclusiveGroup) : "NULL"}, ${dollar(JSON.stringify(policy.effects))}::jsonb);`,
  );
}
for (const event of catalog.events) {
  lines.push(
    `INSERT INTO events (id, title, category, priority, opening, body, lesson, month_start, month_end, day_start, day_end, repeatable, cooldown, trigger, choices) VALUES (${dollar(event.id)}, ${dollar(event.title)}, ${dollar(event.category)}, ${event.priority}, ${event.opening}, ${dollar(event.body)}, ${dollar(event.lesson)}, ${num(event.monthStart)}, ${num(event.monthEnd)}, ${num(event.dayStart)}, ${num(event.dayEnd)}, ${event.repeatable}, ${event.cooldown}, ${dollar(JSON.stringify(event.trigger))}::jsonb, ${dollar(JSON.stringify(event.choices))}::jsonb);`,
  );
}
for (const lesson of catalog.lessons) {
  lines.push(`INSERT INTO lessons (id, title, topic, body) VALUES (${dollar(lesson.id)}, ${dollar(lesson.title)}, ${dollar(lesson.topic)}, ${dollar(lesson.body)});`);
}
for (const tip of catalog.tips) {
  lines.push(`INSERT INTO tips (id, text, trigger) VALUES (${dollar(tip.id)}, ${dollar(tip.text)}, ${dollar(JSON.stringify(tip.trigger))}::jsonb);`);
}
for (const parameter of catalog.parameters) {
  lines.push(`INSERT INTO parameters (key, value, label, hint) VALUES (${dollar(parameter.key)}, ${parameter.value}, ${dollar(parameter.label)}, ${dollar(parameter.hint)});`);
}
for (const formula of catalog.formulas) {
  lines.push(
    `INSERT INTO formulas (id, label, expression, explanation) VALUES (${dollar(formula.id)}, ${dollar(formula.label)}, ${dollar(formula.expression)}, ${dollar(formula.explanation)});`,
  );
}
lines.push("COMMIT;");
writeFileSync(new URL("../db/seed.sql", import.meta.url), lines.join("\n"), "utf8");
console.log(`db/seed.sql gerado com ${catalog.events.length} eventos.`);
