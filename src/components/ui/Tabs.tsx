import { useId, useState } from 'react';

export type Tab = { id: string; label: string };

export type TabsProps = {
	tabs: Tab[];
	/** Uncontrolled starting tab; omit to start on the first. */
	defaultTabId?: string;
	onChange?: (id: string) => void;
};

/**
 * Roving-tabindex tablist. Arrow keys move between tabs and Home/End jump to
 * the ends, which is what a screen-reader user expects from role="tablist" —
 * without it, Tab lands on every chapter one at a time.
 */
export const Tabs = ({ tabs, defaultTabId, onChange }: TabsProps) => {
	const [active, setActive] = useState(defaultTabId ?? tabs[0]?.id);
	const base = useId();

	const select = (id: string) => {
		setActive(id);
		onChange?.(id);
	};

	const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		const i = tabs.findIndex((t) => t.id === active);
		const last = tabs.length - 1;
		const next =
			e.key === 'ArrowRight' ? (i === last ? 0 : i + 1)
			: e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1)
			: e.key === 'Home' ? 0
			: e.key === 'End' ? last
			: -1;
		if (next < 0) return;
		e.preventDefault();
		select(tabs[next].id);
		document.getElementById(`${base}-${tabs[next].id}`)?.focus();
	};

	return (
		<div className="tabs" role="tablist" onKeyDown={onKeyDown}>
			{tabs.map((t) => {
				const selected = t.id === active;
				return (
					<button
						key={t.id}
						id={`${base}-${t.id}`}
						type="button"
						role="tab"
						className="tab type-nav-link"
						aria-selected={selected}
						tabIndex={selected ? 0 : -1}
						onClick={() => select(t.id)}
					>
						{t.label}
					</button>
				);
			})}
		</div>
	);
};
