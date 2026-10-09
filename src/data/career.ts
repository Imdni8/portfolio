/* Where I've worked, as the résumé dates it — to the month. The homepage
   bio's "[6] years" is the sum of these, not a span from the first start
   date, because the career isn't one continuous stretch (Nov 2021 – Mar
   2022 is a gap). Most recent first, like the résumé.

   Both ends are inclusive: "Apr 2020 – Oct 2021" counts April and October.
   A month two stints share (Philips ended and Medable started in Dec 2025)
   counts once. Leave `end` off for a role that's still going; it then runs
   to the month the page is read. Months are 1-based here (April is 4). */

export interface YearMonth {
	year: number;
	month: number;
}

export interface Stint {
	company: string;
	role: string;
	start: YearMonth;
	end?: YearMonth;
}

export const stints: Stint[] = [
	{ company: 'Medable', role: 'Lead Product Designer', start: { year: 2025, month: 12 }, end: { year: 2026, month: 8 } },
	{ company: 'Philips', role: 'Senior UX Designer', start: { year: 2022, month: 4 }, end: { year: 2025, month: 12 } },
	{ company: 'J&J', role: 'UX Designer', start: { year: 2020, month: 4 }, end: { year: 2021, month: 10 } },
];
