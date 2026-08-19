import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs } from '../components/ui/Tabs';
import { Page, Group } from './_shared';

const CHAPTERS = [
	{ id: 'problem', label: 'Problem' },
	{ id: 'framing', label: 'Framing' },
	{ id: 'concepts', label: 'Concepts' },
	{ id: 'outcome', label: 'Outcome' },
];

const meta = {
	title: 'Components/Tabs',
	component: Tabs,
	args: { tabs: CHAPTERS },
} satisfies Meta<typeof Tabs>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Chapters: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<Page
			title="Tabs"
			lede="Chapter navigation for a case study. Set in Playfair, because a chapter name is voice rather than information."
		>
			<Group
				label="Default"
				note="State is carried by weight (500 → 700) as well as by colour and the underline. That redundancy is deliberate: the tab still reads as selected in greyscale, and for a reader who cannot distinguish the amber."
			>
				<Tabs tabs={CHAPTERS} />
			</Group>

			<Group
				label="Keyboard"
				note="A roving tabindex, so Tab enters the strip once rather than stopping at every chapter. Arrow keys move between tabs, Home and End jump to the ends. Focus the strip and try it."
			>
				<Tabs tabs={CHAPTERS} defaultTabId="concepts" />
			</Group>

			<Group label="Overflow" note="Long chapter lists scroll horizontally rather than wrapping — a wrapped tab rail loses the single-line rhythm that makes it scannable.">
				<div style={{ maxWidth: '26rem' }}>
					<Tabs
						tabs={[...CHAPTERS, { id: 'reflections', label: 'Reflections' }, { id: 'appendix', label: 'Appendix' }]}
					/>
				</div>
			</Group>
		</Page>
	),
};
