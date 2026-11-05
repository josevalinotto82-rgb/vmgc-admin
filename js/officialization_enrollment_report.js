import { normalizeGender } from "./officialization_rules.js";

function categoryGenders(category) {
  const declared = normalizeGender(category.gender);
  if (["male", "female"].includes(declared)) return [declared];
  return [...new Set((category.tee_rules || []).map(rule => rule.gender || (Number(rule.reference?.category) === 1 ? "female" : "male")))];
}

export function enrollmentReport(bundle, groups, previewFor) {
  const pairMode = bundle.rules.isPair();
  const counts = new Map(bundle.categories.map(category => [String(category.id), { category, count: 0 }]));
  let incompletePlayers = 0, unclassified = 0, total = 0;
  for (const group of groups) {
    if (pairMode && group.type !== "pair") { incompletePlayers += group.registrations.length; continue; }
    total++;
    let category;
    if (pairMode && bundle.rules.isAmericana()) {
      // Americana groups are classified by the category's admitted genders,
      // never by the handicap or the first partner's individual category.
      const genders = [...new Set(group.registrations.map(reg => normalizeGender(reg.player?.gender)))];
      if (genders.some(gender => !["male", "female"].includes(gender))) { unclassified++; continue; }
      const compatible = bundle.categories.filter(item => genders.every(gender => categoryGenders(item).includes(gender)));
      const exact = compatible.filter(item => categoryGenders(item).length === genders.length);
      const candidates = exact.length ? exact : compatible;
      // Retain an explicit saved assignment where several categories match.
      const assigned = group.registrations.map(reg => reg.scorecard?.category_id || reg.category_id).filter(Boolean);
      category = candidates.length === 1 ? candidates[0] : candidates.find(item => assigned.length === group.registrations.length && assigned.every(id => String(id) === String(item.id)));
    } else {
      const preview = previewFor(group);
      category = preview.error ? null : preview.category;
    }
    const row = category && counts.get(String(category.id));
    if (row) row.count++; else unclassified++;
  }
  return { pairMode, total, incompletePlayers, unclassified, rows: [...counts.values()] };
}
