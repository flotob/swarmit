/**
 * Multi-step progress status bar.
 * Shows each pipeline step with status (pending/active/done/error/skipped).
 */

const ICONS = {
  pending: '○',
  active: '◉',
  done: '●',
  error: '✗',
  skipped: '◌',
};

const COLORS = {
  pending: 'var(--text-muted)',
  active: 'var(--accent)',
  done: '#22c55e',
  error: '#ef4444',
  skipped: 'var(--text-muted)',
};

/**
 * Create a status bar with named steps.
 * @param {string[]} stepNames
 * @returns {{ el: HTMLElement, setStatus(step, status, detail?), setResult(refs) }}
 */
export function createStatusBar(stepNames) {
  const container = document.createElement('div');
  container.style.cssText = 'margin: 16px 0; font-size: 13px; font-family: var(--font-mono);';

  const stepEls = {};

  for (const name of stepNames) {
    const row = document.createElement('div');
    row.style.cssText = 'padding: 4px 0; display: flex; gap: 8px; align-items: baseline;';

    const icon = document.createElement('span');
    icon.textContent = ICONS.pending;
    icon.style.color = COLORS.pending;

    const label = document.createElement('span');
    label.textContent = name;
    label.style.color = COLORS.pending;

    const detail = document.createElement('span');
    detail.style.cssText = 'color: var(--text-muted); font-size: 11px; word-break: break-all;';

    row.appendChild(icon);
    row.appendChild(label);
    row.appendChild(detail);
    container.appendChild(row);

    stepEls[name] = { icon, label, detail };
  }

  // Result area (shown after pipeline completes)
  const resultBox = document.createElement('pre');
  resultBox.style.cssText = 'margin-top: 12px; padding: 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); font-size: 12px; white-space: pre-wrap; word-break: break-all; display: none;';
  container.appendChild(resultBox);

  return {
    el: container,

    setStatus(step, status, detailText) {
      const s = stepEls[step];
      if (!s) return;
      s.icon.textContent = ICONS[status] || ICONS.pending;
      s.icon.style.color = COLORS[status] || COLORS.pending;
      s.label.style.color = status === 'pending' ? COLORS.pending : 'var(--text)';
      if (detailText !== undefined) {
        s.detail.textContent = detailText ? ` — ${detailText}` : '';
      }
    },

    setResult(content) {
      resultBox.style.display = 'block';
      resultBox.textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    },
  };
}
