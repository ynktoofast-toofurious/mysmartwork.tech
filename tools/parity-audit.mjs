import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const landingScriptPath = resolve(root, "script.js");
const landingStylesPath = resolve(root, "styles.css");

const script = readFileSync(landingScriptPath, "utf8");
const styles = readFileSync(landingStylesPath, "utf8");

const checks = [
  ["Section: Testimonials", /Temoignages|Témoignages/],
  ["Section: Why MwangazaMail", /Pourquoi MwangazaMail|Concu pour l'Afrique|Conçu pour l'Afrique/],
  ["Section: Purple CTA band", /Votre institution merite|Votre institution mérite/],
  ["Section: Detailed pricing heading", /Des prix transparents/],
  ["Section: Start now heading", /Transformez votre institution/],
  ["Section: Demo form fields", /Nom complet|Institution\s*\*|WhatsApp|Message \(optionnel\)/],
  ["Section: Footer columns", /PRODUIT|RESSOURCES|LEGAL|LÉGAL/],
  ["CTA button: Reserve demo", /Reserver ma demo gratuite|Réserver ma démo gratuite/],
  ["Footer contact email", /contact@mwangazamail\.cd/],
  ["Footer styles exist", /footer|site-footer|footer-grid/]
];

const softChecks = [
  ["FAQ target count >= 7", (() => {
    const block = script.match(/const faqItems = \[(.|\n)*?\];/);
    if (!block) return false;
    const entries = (block[0].match(/\[\s*"/g) || []).length;
    return entries >= 7;
  })()],
  ["Pricing tier detail (150/500/2500)", /150|500|2\s*500/.test(script)],
  ["Why section styles", /why|afrique|compare|contre|why-grid|why-section/i.test(styles)]
];

const failures = [];
for (const [label, pattern] of checks) {
  if (!pattern.test(script) && !pattern.test(styles)) failures.push(label);
}
for (const [label, pass] of softChecks) {
  if (!pass) failures.push(label);
}

if (failures.length) {
  console.log("PARITY AUDIT: FAIL");
  failures.forEach((f) => console.log(`- ${f}`));
  process.exit(1);
}

console.log("PARITY AUDIT: PASS");
