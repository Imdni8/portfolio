/**
 * Definitions behind the underlined terms in the case studies. `Term.astro`
 * looks an entry up at build time and bakes it into the markup, so adding a
 * definition here costs nothing at runtime.
 *
 * `body` is a list of paragraphs. Keep them short — the popover sits on top of
 * the paragraph the reader is in the middle of.
 */
export interface GlossaryEntry {
	/** heading of the popover, set as a question in the draft */
	title: string;
	body: string[];
}

export const glossary = {
	'ai-builder': {
		title: 'Who are AI builders?',
		body: [
			'“Agent builder” is an assignable user role in the agent studio platform. They have the permission to create and share agents.',
			'The agents they create can be used by other users in the workspace.',
		],
	},

	dependency: {
		title: 'What is dependency?',
		body: [
			'An agent could comprise of one or more of the following from the library: prompts, skills, knowledge folders, the model, connectors, triggers, subagents from the library. Together, we call them agent dependencies.',
			'Versioning is implemented at a dependency level too. So whenever it’s modified, a new version is created. And all versions are tracked.',
			'To lay the foundation of agent versioning, we had first implemented dependency versioning in previous sprints.',
		],
	},

	'mandatory-updates': {
		title: 'What are mandatory updates?',
		body: [
			'Updates that are crucial for security, like connector or trigger updates, are mandatory.',
		],
	},

	'study-studio': {
		title: 'What is Study Studio?',
		body: [
			'Medable’s platform is divided into several parts (called “studios”), each facilitating a stage in the clinical trial process.',
			'Study studio is the part where customers can create and launch studies.',
		],
	},

	cra: {
		title: 'Who is a CRA?',
		body: [
			'A Clinical Research Associate monitors a set of trial sites on behalf of the sponsor, checking that each one is running the protocol correctly and that the data coming off it holds up.',
		],
	},
} as const satisfies Record<string, GlossaryEntry>;

export type TermId = keyof typeof glossary;
