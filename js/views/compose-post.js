/**
 * Compose post view — #/r/:slug/submit
 * Form + multi-step publish pipeline with progress status bar.
 */

import { createStatusBar } from '../components/status-bar.js';
import { publishPost, POST_STEPS } from '../services/publish-pipeline.js';

export async function render(container, params) {
  const slug = params.slug || 'test';

  const div = document.createElement('div');
  div.className = 'placeholder-view';

  const h2 = document.createElement('h2');
  h2.textContent = `Submit to r/${slug}`;
  div.appendChild(h2);

  const back = document.createElement('a');
  back.href = `#/r/${encodeURIComponent(slug)}`;
  back.textContent = `\u2190 r/${slug}`;
  back.style.cssText = 'display: inline-block; margin-bottom: 16px; font-size: 13px;';
  div.appendChild(back);

  // Form
  const form = document.createElement('form');

  const titleLabel = document.createElement('label');
  titleLabel.textContent = 'Title';
  titleLabel.style.cssText = 'display: block; font-size: 13px; margin-bottom: 4px; color: var(--text-muted);';
  form.appendChild(titleLabel);

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.placeholder = 'Post title';
  titleInput.required = true;
  titleInput.style.cssText = 'width: 100%; padding: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-size: 14px; margin-bottom: 16px;';
  form.appendChild(titleInput);

  const bodyLabel = document.createElement('label');
  bodyLabel.textContent = 'Body (markdown)';
  bodyLabel.style.cssText = 'display: block; font-size: 13px; margin-bottom: 4px; color: var(--text-muted);';
  form.appendChild(bodyLabel);

  const bodyInput = document.createElement('textarea');
  bodyInput.placeholder = 'Write your post...';
  bodyInput.required = true;
  bodyInput.rows = 8;
  bodyInput.style.cssText = 'width: 100%; padding: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-size: 14px; font-family: var(--font-mono); resize: vertical; margin-bottom: 16px;';
  form.appendChild(bodyInput);

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-primary';
  submitBtn.textContent = 'Publish Post';
  form.appendChild(submitBtn);

  div.appendChild(form);

  // Status bar (hidden until publish starts)
  const status = createStatusBar(POST_STEPS);
  status.el.style.display = 'none';
  div.appendChild(status.el);

  // Submit handler
  let lastActiveStep = null;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = titleInput.value.trim();
    const bodyText = bodyInput.value.trim();
    if (!title || !bodyText) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Publishing...';
    titleInput.disabled = true;
    bodyInput.disabled = true;
    status.el.style.display = 'block';
    lastActiveStep = null;

    for (const step of POST_STEPS) {
      status.setStatus(step, 'pending');
    }

    try {
      const result = await publishPost({
        boardSlug: slug,
        title,
        bodyText,
        onStep: (step, s, detail) => {
          if (s === 'active') lastActiveStep = step;
          status.setStatus(step, s, detail);
        },
      });

      if (result.announced) {
        status.setResult(`Post published and announced on-chain.\n\nPost: ${result.contentRef}\nSubmission: ${result.submissionRef}`);
      } else {
        status.setResult(`Post published to Swarm (not announced on-chain yet).\n\nPost: ${result.contentRef}\nSubmission: ${result.submissionRef}\n\nThe post is stored on Swarm but not yet visible to curators.\nOn-chain announcement will be available once the contract is deployed.`);
      }

      submitBtn.textContent = 'Published';
    } catch (err) {
      if (lastActiveStep) {
        status.setStatus(lastActiveStep, 'error', err.message);
      }
      status.setResult(`Error: ${err.message}`);
      submitBtn.textContent = 'Publish Post';
      submitBtn.disabled = false;
      titleInput.disabled = false;
      bodyInput.disabled = false;
    }
  });

  container.appendChild(div);
}
