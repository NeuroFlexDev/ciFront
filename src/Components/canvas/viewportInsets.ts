/** Measure overlays only when framing a diagram; opening a drawer never moves the board. */
export function canvasViewportInsets(workspace: HTMLElement) {
  const bounds = workspace.getBoundingClientRect();
  const header = workspace.querySelector('[data-canvas-toolbar]')?.getBoundingClientRect();
  const insets = {
    left: 28,
    right: 28,
    top: header ? header.bottom - bounds.top + 72 : 28,
    bottom: 88,
  };
  for (const panel of Array.from(
    workspace.querySelectorAll<HTMLElement>('[data-canvas-panel]:not([hidden])'),
  )) {
    const rect = panel.getBoundingClientRect();
    if (panel.dataset.side === 'left')
      insets.left = Math.max(insets.left, rect.right - bounds.left + 20);
    else insets.right = Math.max(insets.right, bounds.right - rect.left + 20);
  }
  return {
    padding: {
      left: `${insets.left}px`,
      right: `${insets.right}px`,
      top: `${insets.top}px`,
      bottom: `${insets.bottom}px`,
    } as const,
    needsPanelCollapse: bounds.width - insets.left - insets.right < 240,
  };
}
