---
target: critique the design (homepage)
total_score: 22
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 2
target_identity: "file:/Users/tousifrahaman/Documents/portfolio/src/pages/index.astro"
target_fingerprint: "sha256:f3a519c9f77b0e2ddadf2cb38d1c51f9874fd4513dc3c2aed9cc697bcfd5ffa4"
target_path: /Users/tousifrahaman/Documents/portfolio/src/pages/index.astro
timestamp: 2026-10-08T17-07-45Z
slug: src-pages-index-astro
---
# Homepage critique — src/pages/index.astro
Method: dual-agent. Score 22/32 (69%, Acceptable, upper edge). n/a: 7, 10.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of status | 3 | Bio reveals reflow surrounding text |
| 2 | Real world match | 2 | Logo-only employers/school; "[6] years" reads as widget |
| 3 | User control | 3 | 3/6 cards exit to Drive/Slides, weakly signalled |
| 4 | Consistency | 2 | Toggle vs hover-link tiles; role copy mismatch (HomeHero vs og:description); mixed title styles |
| 5 | Error prevention | 3 | Little to go wrong; commit fetch fails safe |
| 6 | Recognition | 2 | Employers recognisable only by 24px logo |
| 7 | Flexibility | n/a | Single-page portfolio |
| 8 | Aesthetic | 3 | Calm; six same-weight cards; dark bars invert emphasis |
| 9 | Error recovery | 3 | Clean degradation |
| 10 | Help | n/a | Portfolio |

## Specificity
Authored details (live GitHub bars, calendar tile, </> mark, inline brand tiles, mascot) on a category-default skeleton; the work cards are the most generic element.
Detector: CLI 0. In-page 20 findings: ai-color-palette x3 (FP, sanctioned ring), tight-leading x5 (FP for single-line titles), undersized-ui-text x10 (10px badges, deliberate but legit legibility question), cramped-padding x1 (noise), layout-transition x1 (dev toolbar artefact).

## Priority issues
1. [P1] No contact path anywhere (no mailto in src; footer has no links). Fix: visible email in bio end / footer. clarify
2. [P1] Employers/school logo-only until hover (HomeBio.astro:90-116). Fix: names visible by default. clarify
3. [P2] Dark commit bars inverted: --commit-empty gray-400 ~14:1 vs active #008043 ~4:1. Fix: dim empty to gray-700/800, brighten active. colorize
4. [P2] Work cards low-information (title/industry/year only), 3/6 external Drive decks, `external` status undocumented in CLAUDE.md; ~3000px of same-weight cards. Fix: company + outcome titles, separate decks. distill + clarify
5. [P3] Reveal layout shift (calendar reflows paragraph, companies push siblings). polish

## Personas
Jordan: no employer names, no company on cards, Drive exits, no email. Sam: card titles are <p> (no heading nav), chip text leads accessible name, 12px commit hit area. Casey: hover-only reveals, ~24x30 targets, first card below fold at 390x844, heavy Drive viewers.

## Minor
code-mark gap before period; faint link underline in light; mobile right-aligned tagline orphaned; quiet "Selected work" label; 17x32 brand hit area.

## Questions
Cards built with the calendar tile's care? Is hiding Philips/J&J the right modesty? End on a CTA instead of copyright?
