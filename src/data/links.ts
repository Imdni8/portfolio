/* Off-site destinations that more than one place links to.
   Declared once here rather than inline at each call site: the LinkedIn
   profile was written out independently in Footer.astro and about.astro, so
   changing the handle meant finding every copy and leaving a dead link on
   whichever page was missed. */
export const links = {
	instagram: 'https://www.instagram.com/oxytousif/',
	github: 'https://github.com/Imdni8',
	linkedin: 'https://www.linkedin.com/in/tousif-rahaman/',
	resume: 'https://drive.google.com/file/d/15AhrPiZ9VO-Q4cH8hQqKA49DYBKDYPa5/view?usp=sharing',
} as const;
