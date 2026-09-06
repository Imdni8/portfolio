import type { BoltIconName } from './icons';

/**
 * The scripted conversation, and the chrome around it.
 *
 * All of it is data rather than markup so the runner in BoltShell.tsx is one
 * index walking one array, and so replacing the placeholder copy with the real
 * transcript never touches a component. Copy here is a stand-in drawn from the
 * reference screenshot; the exact wording, study names and counts are pending.
 *
 * Timing convention: `after` is the pause *before* this unit lands, in ms. The
 * first unit is the reader's own message, so it is 0 — it appears the instant
 * they press send.
 */

/** A leaf is one thing that lands in the thread, whether at the top level or
 *  nested inside an agent card. */
export type Leaf =
	| { kind: 'user'; text: string; time: string }
	/** The collapsed "Thought for 2s ›" disclosure. Never expands — it is a
	 *  shape in the transcript, not a control. */
	| { kind: 'thought'; label: string }
	| { kind: 'text'; text: string; typewriter?: boolean }
	/** One row of the agent's working log. `meta` is the right-aligned count. */
	| { kind: 'tool'; icon: BoltIconName; label: string; meta?: string }
	| { kind: 'results'; items: string[] };

type Timed<T> = T & { after: number };

/** An agent card owns its own working log. Modelling the children as nested
 *  rather than flat is what lets the card's status line be *derived* — running
 *  while any child is still to land, done once they have all arrived — instead
 *  of needing a second "the agent finished" unit that mutates an earlier one.
 *  The reveal model stays strictly append-only that way. */
export type AgentBlock = {
	kind: 'agent';
	name: string;
	avatar: Extract<BoltIconName, `agent-${string}`>;
	running: string;
	done: string;
	children: Timed<Leaf>[];
};

export type Block = Timed<Leaf> | Timed<AgentBlock>;

/** What sits in the composer before the reader presses send. */
export const prompt =
	'find non-compliant studies using @regulatory agent and then prepare the a report using @dashboarding agent';

export const timeline: Block[] = [
	{
		after: 0,
		kind: 'user',
		text: prompt,
		time: '10:52 PM',
	},
	{ after: 450, kind: 'thought', label: 'Thought for 2s' },
	{
		after: 600,
		kind: 'text',
		text: 'Got it. Starting with looking up studies.',
		typewriter: true,
	},
	{
		after: 500,
		kind: 'agent',
		name: 'Regulatory agent',
		avatar: 'agent-regulatory',
		running: 'Searching study database…',
		done: 'Searched study database',
		children: [
			{ after: 600, kind: 'tool', icon: 'link', label: 'Fetching URL' },
			{
				after: 750,
				kind: 'tool',
				icon: 'hammer',
				label: 'Reading study databases',
				meta: '100 results',
			},
			{
				after: 500,
				kind: 'results',
				items: ['Study name', 'Study name', 'Study name', 'Study name', 'Study name'],
			},
		],
	},
	{
		after: 700,
		kind: 'text',
		text: '12 studies are out of compliance. Handing off to the dashboarding agent.',
		typewriter: true,
	},
	{
		after: 600,
		kind: 'agent',
		name: 'Dashboarding agent',
		avatar: 'agent-dashboarding',
		running: 'Preparing report…',
		done: 'Prepared report',
		children: [
			{ after: 650, kind: 'tool', icon: 'file-text', label: 'Reading report templates' },
			{ after: 750, kind: 'tool', icon: 'chart-column', label: 'Composing charts', meta: '4 charts' },
		],
	},
];

/**
 * The flat reveal order: an agent card is one unit, and so is each of its
 * children. `revealed` in BoltShell.tsx counts these, and every other piece of
 * the view is derived from that one number.
 */
export type Unit = { after: number; text?: string; typewriter?: boolean };

/** Only a `text` leaf carries copy the runner has to type out; every other
 *  kind lands whole. */
const asUnit = (leaf: Timed<Leaf>): Unit =>
	leaf.kind === 'text'
		? { after: leaf.after, text: leaf.text, typewriter: leaf.typewriter }
		: { after: leaf.after };

export const units: Unit[] = timeline.flatMap((block) =>
	block.kind === 'agent' ? [{ after: block.after }, ...block.children.map(asUnit)] : [asUnit(block)],
);

/**
 * Where each block — and, for an agent, each of its children — sits in that
 * flat order. Computed once here rather than re-derived per render, and it is
 * what lets the view ask "has unit N landed yet?" without counting.
 */
export type Placed = { block: Block; index: number; childIndexes: number[] };

export const placed: Placed[] = (() => {
	const out: Placed[] = [];
	let index = 0;
	for (const block of timeline) {
		const at = index++;
		const childIndexes: number[] = [];
		if (block.kind === 'agent') for (const _ of block.children) childIndexes.push(index++);
		out.push({ block, index: at, childIndexes });
	}
	return out;
})();

export const totalUnits = units.length;

/** Milliseconds per character for a `typewriter` line. */
export const TYPE_MS = 16;

/* The static chrome. None of it is interactive — it exists so the thread is
   read as sitting inside a product rather than floating on the page. */

export const topNav = ['Studies', 'Library', 'Sites', 'Users', 'Agents', 'Apps'] as const;
export const activeNav = 'Agents';

export const chats: { label: string; dot: 'active' | 'amber' | 'idle' }[] = [
	{ label: 'Non-compliant studies report', dot: 'active' },
	{ label: 'Error analysis', dot: 'active' },
	{ label: 'Protocol deviation summary', dot: 'amber' },
	{ label: 'Site onboarding checklist', dot: 'active' },
	{ label: 'i5 Design Framework Ca…', dot: 'idle' },
];

export const sidebarGroups: { label: string; items: { label: string; icon: BoltIconName }[] }[] = [
	{
		label: 'Manage',
		items: [
			{ label: 'Knowledge', icon: 'book-open' },
			{ label: 'Skills', icon: 'graduation-cap' },
			{ label: 'Prompts', icon: 'message-square' },
			{ label: 'Credentials', icon: 'key-round' },
			{ label: 'Models', icon: 'cpu' },
			{ label: 'Triggers', icon: 'zap' },
			{ label: 'Connectors', icon: 'blocks' },
			{ label: 'Memory', icon: 'database' },
			{ label: 'Validation', icon: 'badge-check' },
		],
	},
	{
		label: 'Monitor',
		items: [
			{ label: 'Analytics', icon: 'chart-column' },
			{ label: 'Activity log', icon: 'file-text' },
		],
	},
];

export const chatTitle = 'Non-compliant studies report';
