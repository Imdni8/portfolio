/* How long I've been designing, as the bio says it — "6 years and 2
   months". Shared by HomeBio.astro, which writes it at build time so the
   page reads right without JS, and home-motion.ts, which rewrites it on the
   day the page is actually read (it only moves while a stint is open-ended).

   The total is the months actually worked, summed from the stints in
   src/data/career.ts — not a span from the first start date. */
import { stints, type Stint } from '../../data/career';

export interface Span {
	years: number;
	months: number;
}

/** Every month worked, counted once: both ends inclusive, gaps skipped, and a
 *  month two stints share (a handover) not counted twice. */
export const experience = (list: Stint[] = stints, now: Date = new Date()): Span => {
	const current = { year: now.getFullYear(), month: now.getMonth() + 1 };
	const worked = new Set<number>();
	for (const { start, end = current } of list) {
		const last = end.year * 12 + end.month;
		for (let m = start.year * 12 + start.month; m <= last; m++) worked.add(m);
	}
	return { years: Math.floor(worked.size / 12), months: worked.size % 12 };
};

const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const formatYears = ({ years }: Span) => unit(years, 'year');

/** The word after the calendar tile, which carries the number itself. */
export const formatUnit = ({ years }: Span) => (years === 1 ? 'year' : 'years');

/** The part the hover reveals, after the years — nothing on a whole year. */
export const formatRest = ({ months }: Span) => (months ? ` and ${unit(months, 'month')}` : '');
