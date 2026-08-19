import { useEffect, useRef, useState } from 'react';

export interface RailStep {
	id: string;
	label: string;
}

interface Props {
	steps: RailStep[];
	/** id of the element whose scroll span drives the progress line */
	bodyId?: string;
}

const clamp = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * Sticky step bar for a case study: highlights the step you are reading and
 * shows how far through the piece you are. Sections opt in by rendering
 * `data-section data-group="<step id>"`.
 */
export default function SectionRail({ steps, bodyId = 'case-study-body' }: Props) {
	const [active, setActive] = useState(steps[0]?.id ?? '');
	const [progress, setProgress] = useState(0);
	const listRef = useRef<HTMLOListElement>(null);

	useEffect(() => {
		if (!steps.length) return;

		const sections = Array.from(
			document.querySelectorAll<HTMLElement>('[data-section][data-group]'),
		);
		const body = document.getElementById(bodyId);
		if (!sections.length || !body) return;

		let frame = 0;

		const measure = () => {
			frame = 0;
			const scrollY = window.scrollY;

			// A section counts as active once its top passes a probe line sitting a
			// third of the way down the viewport — that is roughly where the eye is.
			const probe = scrollY + window.innerHeight * 0.34;
			let current = steps[0].id;
			for (const section of sections) {
				const top = section.getBoundingClientRect().top + scrollY;
				if (top <= probe && section.dataset.group) current = section.dataset.group;
			}
			setActive(current);

			const rect = body.getBoundingClientRect();
			const start = rect.top + scrollY;
			const span = rect.height - window.innerHeight;
			setProgress(clamp(span > 0 ? (scrollY - start) / span : scrollY > start ? 1 : 0));
		};

		const onScroll = () => {
			if (!frame) frame = requestAnimationFrame(measure);
		};

		measure();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll);
		return () => {
			if (frame) cancelAnimationFrame(frame);
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
		};
	}, [steps, bodyId]);

	// On narrow screens the bar scrolls sideways — keep the active step in view.
	useEffect(() => {
		const list = listRef.current;
		if (!list) return;
		const el = list.querySelector<HTMLElement>(`[data-step="${active}"]`);
		if (!el) return;
		const overflow = list.scrollWidth > list.clientWidth + 1;
		if (!overflow) return;
		const target = el.offsetLeft - (list.clientWidth - el.offsetWidth) / 2;
		list.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
	}, [active]);

	if (!steps.length) return null;

	return (
		<nav className="rail" aria-label="Case study sections">
			<div className="rail__inner">
				<ol className="rail__list" ref={listRef}>
					{steps.map((step) => {
						const isActive = step.id === active;
						return (
							<li key={step.id}>
								<a
									href={`#${step.id}`}
									className={isActive ? 'rail__step is-active' : 'rail__step'}
									data-step={step.id}
									aria-current={isActive ? 'true' : undefined}
								>
									{step.label}
								</a>
							</li>
						);
					})}
				</ol>
			</div>
			<div className="rail__track" aria-hidden="true">
				<div className="rail__progress" style={{ transform: `scaleX(${progress})` }} />
			</div>
		</nav>
	);
}
