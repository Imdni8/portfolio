/** A numbered callout: a pin pinned to a shot, and the line it explains.
    Shared by AnnotatedFigure so a figure's static pins and any future
    drag-revealed compare can't drift into different shapes. */
export interface Note {
	/** position of the pin, as a percentage of the frame */
	x: number;
	y: number;
	text: string;
	/** overrides the pin's badge (default: its 1-based position in the array)
	    — give several pins the same label + text to point at multiple spots
	    that share one callout, e.g. a "★" bonus note. */
	label?: string;
}

/** Collapses notes sharing the same `text` into one line, marked with the
    label of the first pin that carries it. */
export const dedupeNotes = (notes: Note[]) => {
	const seen = new Set<string>();
	const items: { marker: string; text: string }[] = [];
	notes.forEach((note, i) => {
		if (seen.has(note.text)) return;
		seen.add(note.text);
		items.push({ marker: note.label ?? String(i + 1), text: note.text });
	});
	return items;
};
