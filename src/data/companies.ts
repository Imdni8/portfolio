/* The companies' marks, shared by the homepage bio's tiles and the work
   list's metadata, so a logo is prepared in one place and a card can never
   show a different mark from the sentence above it.

   `tone` picks the tile's ground: `bare` for a mark drawn on a transparent
   ground (no tile behind it, the mark at full size), or the brand's own colour
   (`--brand-*` in tokens.css) with the mark in white on it. */
import medableRaw from '../assets/homepage/medable_logo.svg?raw';
import philipsRaw from '../assets/homepage/philips_shield.svg?raw';
import jnjRaw from '../assets/homepage/J&J_logo.svg?raw';

export type CompanyTone = 'bare' | 'medable' | 'jnj';

export interface CompanyMark {
	svg: string;
	tone: CompanyTone;
}

/* The single-colour logo files are drawn in white; recoloured to
   currentColor so they take the tile's ink. */
export const ink = (svg: string) => svg.replace(/(fill|stroke)="(white|#FFFEFE)"/g, '$1="currentColor"');

/* Medable's file is its square mark followed by the wordmark; a tile shows
   the mark alone, by narrowing the viewBox to the mark's own 22×22. */
const medableMark = ink(medableRaw).replace('width="92" height="22" viewBox="0 0 92 22"', 'width="22" height="22" viewBox="0 0 22 22"');

/* Keyed by the name content writes in a case study's `company` field. */
export const companyMarks: Record<string, CompanyMark> = {
	Medable: { svg: medableMark, tone: 'medable' },
	Philips: { svg: philipsRaw, tone: 'bare' },
	'J&J': { svg: ink(jnjRaw), tone: 'jnj' },
};
