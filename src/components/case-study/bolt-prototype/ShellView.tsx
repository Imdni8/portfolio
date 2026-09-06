import { useEffect, useRef } from 'react';
import { boltIcons, type BoltIconName } from './icons';
import {
	activeNav,
	chatTitle,
	chats,
	placed,
	prompt,
	sidebarGroups,
	topNav,
	type AgentBlock,
	type Leaf,
} from './script';

export type Phase = 'idle' | 'running' | 'done';

/**
 * The picture. Everything it draws is derived from `revealed`, `typedChars`
 * and `phase` — it holds no run state of its own, which is what lets
 * BoltShell.tsx render two of these at once (one in the card, one in the
 * expanded dialog) and have them stay identical without any syncing.
 *
 * The one thing it does own is the thread's scroll position, because that is a
 * property of *this* copy of the picture rather than of the run.
 */
type Props = {
	revealed: number;
	typedChars: number;
	phase: Phase;
	onRun: () => void;
	onStop: () => void;
	/** Marks the run control for solution-carousel.ts's tab-stop sweep. Only
	 *  the copy that lives inside a slide needs it; the modal's copy is in the
	 *  top layer and outside the track entirely. */
	sweepFocus?: boolean;
};

function Glyph({ name, className }: { name: BoltIconName; className?: string }) {
	return <i className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: boltIcons[name] }} />;
}

export default function ShellView({ revealed, typedChars, phase, onRun, onStop, sweepFocus }: Props) {
	const threadRef = useRef<HTMLDivElement>(null);

	// Follow the transcript down as it lands, including while a line types —
	// otherwise the newest unit is written below the fold on a card this short.
	useEffect(() => {
		const thread = threadRef.current;
		if (!thread) return;
		thread.scrollTop = thread.scrollHeight;
	}, [revealed, typedChars]);

	// …and again whenever the transcript's own box changes size, which the
	// state effect above cannot see. The modal's copy mounts inside a <dialog>
	// that showModal() has not opened yet, so it is display:none and its
	// scrollHeight is 0 — the effect above runs, scrolls nothing, and never
	// fires again because `revealed` is already at its final value. This
	// observer catches that 0 -> real transition, and every mid-line rewrap
	// that changes the column's height without changing either state value.
	useEffect(() => {
		const thread = threadRef.current;
		const content = thread?.firstElementChild;
		if (!thread || !content || typeof ResizeObserver !== 'function') return;

		const observer = new ResizeObserver(() => {
			thread.scrollTop = thread.scrollHeight;
		});
		observer.observe(content);
		return () => observer.disconnect();
	}, []);

	/** The unit that is mid-typewriter, if any: always the most recent one. */
	const typingUnit = revealed - 1;
	const reveal = (index: number, text: string, typewriter?: boolean) => {
		if (!typewriter || index !== typingUnit) return { shown: text, typing: false };
		return { shown: text.slice(0, typedChars), typing: typedChars < text.length };
	};

	const running = phase === 'running';

	const leaf = (unit: Leaf, index: number) => {
		switch (unit.kind) {
			case 'user':
				return (
					<div className="bolt-user bolt-in" key={index}>
						<div className="bolt-user__bubble">{unit.text}</div>
						<div className="bolt-user__time">{unit.time}</div>
					</div>
				);
			case 'thought':
				return (
					<div className="bolt-thought bolt-in" key={index}>
						<span>{unit.label}</span>
						<Glyph name="chevron-right" />
					</div>
				);
			case 'text': {
				const { shown, typing } = reveal(index, unit.text, unit.typewriter);
				return (
					<p className="bolt-text bolt-in" key={index}>
						{shown}
						{typing && <span className="bolt-text__caret" />}
					</p>
				);
			}
			case 'tool':
				return (
					<div className="bolt-tool bolt-in" key={index}>
						<Glyph name={unit.icon} />
						<span>{unit.label}</span>
						{unit.meta && <span className="bolt-tool__meta">{unit.meta}</span>}
					</div>
				);
			case 'results':
				return (
					<div className="bolt-results bolt-in" key={index}>
						{unit.items.map((name, i) => (
							<div className="bolt-results__row" key={i}>
								<Glyph name="study-mark" />
								<span>{name}</span>
							</div>
						))}
					</div>
				);
		}
	};

	const agent = (block: AgentBlock, index: number, childIndexes: number[]) => {
		const landed = childIndexes.filter((i) => i < revealed);
		const complete = landed.length === childIndexes.length;
		return (
			<div className="bolt-agent bolt-in" key={index} data-state={!complete && running ? 'running' : 'settled'}>
				<div className="bolt-agent__head">
					<div className="bolt-agent__avatar">
						<Glyph name={block.avatar} />
					</div>
					<div>
						<div className="bolt-agent__name">{block.name}</div>
						<div className="bolt-agent__status">
							<span>{complete ? block.done : block.running}</span>
							<Glyph name={complete ? 'check' : 'chevron-down'} />
						</div>
					</div>
				</div>
				{landed.length > 0 && (
					<div className="bolt-agent__log">
						{landed.map((unitIndex, i) => leaf(block.children[i], unitIndex))}
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="bolt-app">
			<header className="bolt-topbar">
				<div className="bolt-topbar__brand">
					<Glyph name="medable-mark" className="bolt-topbar__brand-mark" />
					<span className="bolt-topbar__brand-name">Medable</span>
				</div>
				<nav className="bolt-topbar__nav">
					{topNav.map((label) => (
						<span className="bolt-topbar__link" key={label} data-active={label === activeNav || undefined}>
							{label}
						</span>
					))}
				</nav>
				<div className="bolt-topbar__end">
					<span className="bolt-topbar__workspace">
						Workspace
						<Glyph name="chevron-down" />
					</span>
					<span className="bolt-topbar__divider" />
					<Glyph name="bell" className="bolt-topbar__icon" />
					<Glyph name="circle-user" className="bolt-topbar__avatar" />
				</div>
			</header>

			<div className="bolt-body">
				<aside className="bolt-sidebar">
					<div className="bolt-sidebar__label">Chat</div>
					<div className="bolt-sidebar__group">
						<Glyph name="bolt-mark" className="bolt-sidebar__group-mark" />
						Bolt
						<Glyph name="chevron-down" className="bolt-sidebar__group-caret" />
					</div>
					{chats.map((chat) => (
						<div className="bolt-sidebar__chat" key={chat.label} data-current={chat.dot === 'active' && chat.label === chatTitle ? '' : undefined}>
							<span className="bolt-sidebar__dot" data-dot={chat.dot} />
							<span>{chat.label}</span>
						</div>
					))}
					<div className="bolt-sidebar__chat">
						<Glyph name="inbox" className="bolt-sidebar__chat-icon" />
						<span>All chats</span>
					</div>
					<div className="bolt-sidebar__item">
						<Glyph name="agent-regulatory" />
						<span>Agents</span>
					</div>
					{sidebarGroups.map((group) => (
						<div key={group.label}>
							<div className="bolt-sidebar__rule" />
							<div className="bolt-sidebar__label">{group.label}</div>
							{group.items.map((item) => (
								<div className="bolt-sidebar__item" key={item.label}>
									<Glyph name={item.icon} />
									<span>{item.label}</span>
								</div>
							))}
						</div>
					))}
				</aside>

				<main className="bolt-main">
					<div className="bolt-titlebar">{chatTitle}</div>

					<div className="bolt-thread" ref={threadRef}>
						<div className="bolt-thread__inner">
							{placed.map(({ block, index, childIndexes }) =>
								index >= revealed
									? null
									: block.kind === 'agent'
										? agent(block, index, childIndexes)
										: leaf(block, index),
							)}
						</div>
					</div>

					<div className="bolt-composer">
						<div className="bolt-composer__inner">
							<div className="bolt-composer__box" data-state={running ? 'running' : 'idle'}>
								<Glyph name="plus" className="bolt-composer__plus" />
								<div className="bolt-composer__field" data-placeholder={running ? '' : undefined}>
									{running ? 'Working…' : prompt}
								</div>
								<Glyph name="mic" className="bolt-composer__mic" />
								<button
									type="button"
									className="bolt-composer__send"
									data-action={running ? 'stop' : 'send'}
									data-slide-focusable={sweepFocus ? '' : undefined}
									onClick={running ? onStop : onRun}
									aria-label={running ? 'Stop the demo' : phase === 'done' ? 'Replay the demo' : 'Send the prompt'}
								>
									<Glyph name={running ? 'square' : 'arrow-up'} />
								</button>
							</div>
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}
