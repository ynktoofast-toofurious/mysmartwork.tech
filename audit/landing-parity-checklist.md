# Landing Parity Checklist

Use this checklist before claiming baseline parity.

## Scope
- Baseline target: https://mwangazamail.base44.app/
- Local target: / (landing page)
- Compare both at desktop and mobile breakpoints.

## Required Sections (top-to-bottom)
- Header with full nav and CTA actions.
- Hero with browser/dashboard mock.
- Partner support strip.
- Problem section (stats + 4 cards).
- Solution timeline section.
- Features grid section.
- Demo tabs section.
- Testimonials metrics + 3 quote cards.
- Why MwangazaMail section (Concu pour l'Afrique...).
- Purple CTA banner (Votre institution merite...).
- Detailed pricing section (Des prix transparents...).
- FAQ section with 7 questions.
- Start-now section (Transformez votre institution...).
- Demo/contact form block (Nom complet, Institution, Email, WhatsApp, Message).
- Footer with Produit / Ressources / Legal columns + contact row.

## Functional Checks
- Se connecter opens portal.
- Portal submit redirects to /admin/.
- Demo tab switch works for 3 tabs.
- FAQ expand/collapse works.
- Header anchor links navigate to correct sections.

## Anti-regression Process
1. Run local server and visually compare sections by order and content.
2. Run: node tools/parity-audit.mjs
3. Capture screenshots for each major section group:
   - hero/problem/solution/features
   - testimonials/why/cta-pricing
   - faq/start-now/contact/footer
4. Deploy only if checklist is complete and audit script passes.
