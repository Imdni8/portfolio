/* How long I've been designing, as the bio says it — "6 years, 6 months and
   7 days". Shared by HomeBio.astro, which writes it at build time so the
   page reads right without JS, and home-motion.ts, which rewrites it on the
   day the page is actually read. */

/** The day the career started. Months are 0-based in `Date`, so April is 3. */
export const CAREER_START = new Date(2020, 3, 1);

export interface Span {
	years: number;
	months: number;
	days: number;
}

/** Whole calendar years, months and days from `start` to `now`, borrowing
 *  from the month before when the day of the month hasn't come round yet. */
export const since = (start: Date, now: Date = new Date()): Span => {
	let years = now.getFullYear() - start.getFullYear();
	let months = now.getMonth() - start.getMonth();
	let days = now.getDate() - start.getDate();

	if (days < 0) {
		months -= 1;
		days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
	}
	if (months < 0) {
		years -= 1;
		months += 12;
	}

	return { years, months, days };
};

const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const formatYears = ({ years }: Span) => unit(years, 'year');

/** The word after the calendar tile, which carries the number itself. */
export const formatUnit = ({ years }: Span) => (years === 1 ? 'year' : 'years');

/** The part the hover reveals, after the years. */
export const formatRest = ({ months, days }: Span) => `, ${unit(months, 'month')} and ${unit(days, 'day')}`;
