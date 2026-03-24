/**
 * Create board view — #/create-board
 * Form to register a new board: publish metadata to Swarm + register on-chain.
 */

import { createStatusBar } from '../components/status-bar.js';
import { buildBoard } from '../protocol/objects.js';
import { ensureProviders, publishValidated } from '../services/publish-pipeline.js';
import { registerBoard } from '../chain/transactions.js';
import { isContractConfigured } from '../chain/contract.js';
import { navigate } from '../router.js';

const STEPS = [
  'Connect providers',
  'Publish board metadata',
  'Register on-chain',
];

export async function render(container) {
  const div = document.createElement('div');
  div.className = 'placeholder-view';

  const h2 = document.createElement('h2');
  h2.textContent = 'Create Board';
  div.appendChild(h2);

  const desc = document.createElement('p');
  desc.className = 'muted';
  desc.textContent = 'Register a new board on Swarm + Gnosis Chain.';
  div.appendChild(desc);

  // Form
  const form = document.createElement('form');

  const slugLabel = document.createElement('label');
  slugLabel.textContent = 'Slug (URL identifier, lowercase, no spaces)';
  slugLabel.style.cssText = 'display: block; font-size: 13px; margin-bottom: 4px; color: var(--text-muted);';
  form.appendChild(slugLabel);

  const slugInput = document.createElement('input');
  slugInput.type = 'text';
  slugInput.placeholder = 'e.g. tech, music, random';
  slugInput.required = true;
  slugInput.pattern = '[a-z0-9-]+';
  slugInput.style.cssText = 'width: 100%; padding: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-size: 14px; margin-bottom: 16px;';
  form.appendChild(slugInput);

  const titleLabel = document.createElement('label');
  titleLabel.textContent = 'Title';
  titleLabel.style.cssText = 'display: block; font-size: 13px; margin-bottom: 4px; color: var(--text-muted);';
  form.appendChild(titleLabel);

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.placeholder = 'Board display name';
  titleInput.required = true;
  titleInput.style.cssText = 'width: 100%; padding: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-size: 14px; margin-bottom: 16px;';
  form.appendChild(titleInput);

  const descLabel = document.createElement('label');
  descLabel.textContent = 'Description';
  descLabel.style.cssText = 'display: block; font-size: 13px; margin-bottom: 4px; color: var(--text-muted);';
  form.appendChild(descLabel);

  const descInput = document.createElement('textarea');
  descInput.placeholder = 'What is this board about?';
  descInput.required = true;
  descInput.rows = 3;
  descInput.style.cssText = 'width: 100%; padding: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-size: 14px; resize: vertical; margin-bottom: 16px;';
  form.appendChild(descInput);

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-primary';
  submitBtn.textContent = 'Create Board';
  form.appendChild(submitBtn);

  div.appendChild(form);

  // Status bar
  const status = createStatusBar(STEPS);
  status.el.style.display = 'none';
  div.appendChild(status.el);

  container.appendChild(div);

  // Submit handler
  let lastActiveStep = null;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const slug = slugInput.value.trim().toLowerCase();
    const title = titleInput.value.trim();
    const description = descInput.value.trim();
    if (!slug || !title || !description) return;

    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug) || slug.length > 32) {
      status.el.style.display = 'block';
      status.setResult('Slug must start and end with a letter/number, contain only a-z 0-9 hyphens, and be at most 32 characters.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';
    slugInput.disabled = true;
    titleInput.disabled = true;
    descInput.disabled = true;
    status.el.style.display = 'block';
    lastActiveStep = null;

    for (const step of STEPS) {
      status.setStatus(step, 'pending');
    }

    const setStep = (step, s, detail) => {
      if (s === 'active') lastActiveStep = step;
      status.setStatus(step, s, detail);
    };

    try {
      // Step 1: Connect providers
      setStep('Connect providers', 'active');
      const userAddress = await ensureProviders((msg) => setStep('Connect providers', 'active', msg));
      setStep('Connect providers', 'done', userAddress);

      // Step 2: Build + validate + publish board metadata
      setStep('Publish board metadata', 'active');

      const board = buildBoard({
        slug,
        title,
        description,
        governance: { chainId: 100, type: 'eoa', address: userAddress },
      });

      const result = await publishValidated(board, 'board');
      setStep('Publish board metadata', 'done', result.bzzUrl);

      // Step 3: Register on-chain
      let registered = false;
      if (isContractConfigured()) {
        setStep('Register on-chain', 'active');
        try {
          const tx = await registerBoard(slug, result.bzzUrl);
          setStep('Register on-chain', 'done', `tx: ${tx}`);
          registered = true;
          status.setResult(`Board r/${slug} created!\n\nMetadata: ${result.bzzUrl}\nTx: ${tx}`);
        } catch (txErr) {
          setStep('Register on-chain', 'error', txErr.message);
          status.setResult(`Board metadata published to Swarm, but on-chain registration failed.\n\nMetadata: ${result.bzzUrl}\nError: ${txErr.message}`);
        }
      } else {
        setStep('Register on-chain', 'skipped', 'Contract not configured');
        status.setResult(`Board metadata published to Swarm (not registered on-chain yet).\n\nMetadata: ${result.bzzUrl}`);
      }

      if (registered) {
        submitBtn.textContent = 'Created — redirecting...';
        setTimeout(() => navigate(`#/r/${slug}`), 1500);
      } else {
        submitBtn.textContent = 'Published (not registered)';
      }

    } catch (err) {
      if (lastActiveStep) {
        status.setStatus(lastActiveStep, 'error', err.message);
      }
      status.setResult(`Error: ${err.message}`);
      submitBtn.textContent = 'Create Board';
      submitBtn.disabled = false;
      slugInput.disabled = false;
      titleInput.disabled = false;
      descInput.disabled = false;
    }
  });
}
