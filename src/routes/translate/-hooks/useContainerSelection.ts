import React from "react";
import { useEffect, useRef } from "react";

/**
 * Tracks text selection made inside `containerRef`. On mouseup (only when the
 * cursor has entered the container), extracts the current selection and calls
 * `onSelect(text)` if the selection's range actually lives inside the
 * container. Collapses the mouseup/getSelection/container-contains logic that
 * was previously copy-pasted across SearchResultCard and MessageItem, which
 * had drifted apart in subtle ways (e.g. inconsistent `raw` semantics).
 */
export function useContainerSelection(
	containerRef: React.RefObject<HTMLElement | null>,
	onSelect: (text: string) => void,
) {
	const isMouseInsideRef = useRef(false);
	// Keep the latest onSelect in a ref so the mouseup handler doesn't need to
	// be re-created when the caller's closure changes (e.g. MessageItem's
	// chat.content-dependent callback), keeping handler identity stable.
	const onSelectRef = useRef(onSelect);
	useEffect(() => {
		onSelectRef.current = onSelect;
	}, [onSelect]);

	const handleMouseEnter = () => { isMouseInsideRef.current = true; };
	const handleMouseLeave = () => { isMouseInsideRef.current = false; };
	const handleMouseUp = () => {
		if (!isMouseInsideRef.current) return;
		const selection = window.getSelection();
		const text = selection?.toString().trim();
		if (!text || !selection || selection.rangeCount === 0) return;
		const range = selection.getRangeAt(0);
		if (containerRef.current?.contains(range.commonAncestorContainer)) {
			onSelectRef.current(text);
		}
	};

	return { handleMouseEnter, handleMouseLeave, handleMouseUp };
}
