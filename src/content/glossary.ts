/**
 * Definitions, keyed by slug. Term.astro looks an entry up at build time and
 * bakes the title and body into data attributes, so the glossary itself never
 * reaches the browser — a page with ten terms costs no more JS than one with a
 * single term. An id with no entry fails the build rather than rendering a
 * term that does nothing.
 */
export type GlossaryEntry = { title: string; body: string };

export const glossary = {
	'ai-builder': {
		title: 'AI builder',
		body: 'The person assembling an agent in Agent Studio. Usually a domain expert rather than an engineer — someone who knows the clinical workflow and can describe it, but would not write the integration themselves.',
	},
	cra: {
		title: 'Clinical Research Associate',
		body: 'The person who monitors a set of clinical trials on behalf of a sponsor: checking sites are following protocol, data is being recorded correctly, and issues are escalated. A representative AI builder for this product.',
	},
	'study-studio': {
		title: 'Study Studio',
		body: 'Another product in the Medable platform, used to build and configure clinical studies. It already had a status-change mechanism, which made it the obvious first place to look for a versioning pattern.',
	},
	dependency: {
		title: 'Dependency',
		body: 'Anything an agent draws on that is owned and versioned elsewhere — a prompt, a knowledge folder, a skill, a connector, a subagent. When one of these is edited, every agent using it receives an update.',
	},
	'mandatory-update': {
		title: 'Mandatory update',
		body: 'An update a workspace admin marks as required, typically for security. A builder cannot publish their agent while any mandatory update is outstanding.',
	},
	'progressive-disclosure': {
		title: 'Progressive disclosure',
		body: 'Showing only what is needed at each step, and letting people reach the rest on demand. Here: surfacing that updates exist without forcing the builder through every one before they can publish.',
	},
} as const satisfies Record<string, GlossaryEntry>;

export type TermId = keyof typeof glossary;
