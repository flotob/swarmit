/**
 * Debug fixture creation page — #/debug/create-fixtures
 * Publishes test protocol objects to Swarm and optionally registers on-chain.
 * Uses build* + validate() to prove the protocol layer before WP7.
 */

import * as state from '../state.js';
import { publishJSON, isAvailable as isSwarmAvailable, connect as connectSwarm, createFeed, updateFeed } from '../lib/swarm.js';
import { isAvailable as isWalletAvailable, connect as connectWallet } from '../lib/ethereum.js';
import { CONTRACT_ADDRESS, FREEDOM_ADAPTER } from '../config.js';
import { hexToBzz } from '../protocol/references.js';
import { validate, buildBoard, buildPost, buildReply, buildSubmission,
  buildUserFeedIndex, buildBoardIndex, buildThreadIndex, buildCuratorProfile } from '../protocol/objects.js';
import { registerBoard, announceSubmission, declareCurator } from '../chain/transactions.js';
import { isContractConfigured } from '../chain/contract.js';

// ============================================
// Helpers
// ============================================

function el(tag, props = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'style' && typeof v === 'object') {
      Object.assign(e.style, v);
    } else if (k === 'className') {
      e.className = v;
    } else if (k === 'textContent') {
      e.textContent = v;
    } else if (k === 'disabled') {
      e.disabled = v;
    } else if (k.startsWith('on')) {
      e.addEventListener(k.slice(2).toLowerCase(), v);
    } else {
      e.setAttribute(k, v);
    }
  }
  for (const child of children) {
    if (typeof child === 'string') {
      e.appendChild(document.createTextNode(child));
    } else if (child) {
      e.appendChild(child);
    }
  }
  return e;
}

function statusBox() {
  return el('pre', {
    style: {
      marginTop: '8px', padding: '12px', background: 'var(--surface)',
      border: '1px solid var(--border)', borderRadius: 'var(--radius)',
      fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
      maxHeight: '300px', overflow: 'auto',
    },
  });
}

function publishAndValidate(obj, label, status) {
  const result = validate(obj);
  if (!result.valid) {
    status.textContent = `[${label}] Validation failed:\n` + result.errors.join('\n');
    throw new Error(`Validation failed for ${label}`);
  }
  status.textContent += `[${label}] Validated OK\n`;
  return publishJSON(obj, label);
}

// ============================================
// Render
// ============================================

export async function render(container) {
  const div = el('div', { className: 'placeholder-view' });

  div.appendChild(el('h2', { textContent: 'Create Test Fixtures' }));
  div.appendChild(el('p', { className: 'muted', textContent: 'Publish test protocol objects to Swarm and optionally register on-chain.' }));

  // Status indicators
  const providerInfo = el('div', { style: { margin: '16px 0', fontSize: '13px' } });
  div.appendChild(providerInfo);

  const s = state.get();
  const swarmOk = isSwarmAvailable();
  const walletOk = isWalletAvailable();
  const contractOk = isContractConfigured();

  providerInfo.appendChild(el('div', {}, [
    `Swarm: ${swarmOk ? (s.swarmConnected ? 'Connected' : 'Detected (not connected)') : 'Not available'}`,
  ]));
  providerInfo.appendChild(el('div', {}, [
    `Wallet: ${walletOk ? (s.walletConnected ? `Connected (${s.userAddress})` : 'Detected (not connected)') : 'Not available'}`,
  ]));
  providerInfo.appendChild(el('div', {}, [
    `Contract: ${contractOk ? CONTRACT_ADDRESS : 'Not configured (placeholder)'}`,
  ]));

  // Connect buttons
  const connectRow = el('div', { style: { margin: '12px 0', display: 'flex', gap: '8px' } });

  if (swarmOk && !s.swarmConnected) {
    const btn = el('button', { className: 'btn btn-primary', textContent: 'Connect Swarm' });
    btn.addEventListener('click', async () => {
      try { await connectSwarm(); btn.textContent = 'Connected'; btn.disabled = true; } catch (e) { btn.textContent = e.message; }
    });
    connectRow.appendChild(btn);
  }
  if (walletOk && !s.walletConnected) {
    const btn = el('button', { className: 'btn btn-primary', textContent: 'Connect Wallet' });
    btn.addEventListener('click', async () => {
      try { await connectWallet(); btn.textContent = 'Connected'; btn.disabled = true; } catch (e) { btn.textContent = e.message; }
    });
    connectRow.appendChild(btn);
  }
  div.appendChild(connectRow);

  // ============================================
  // Section 1: Swarm-only fixtures
  // ============================================

  div.appendChild(el('h3', { textContent: '1. Publish Test Objects to Swarm', style: { marginTop: '24px' } }));
  div.appendChild(el('p', { className: 'muted', textContent: 'Creates a board, posts, replies, submissions, indexes, and a curator profile. Requires Swarm connection.' }));

  const swarmStatus = statusBox();
  const refsOutput = statusBox();
  refsOutput.style.display = 'none';

  // Store published refs for chain steps
  const refs = {};

  const publishBtn = el('button', {
    className: 'btn btn-primary',
    textContent: 'Publish All Test Objects',
    disabled: !swarmOk,
  });

  publishBtn.addEventListener('click', async () => {
    publishBtn.disabled = true;
    publishBtn.textContent = 'Publishing...';
    swarmStatus.textContent = '';
    refsOutput.style.display = 'none';

    try {
      // Require wallet connection so identity-coupled objects use the real address
      if (!state.get().walletConnected) {
        if (!isWalletAvailable()) {
          throw new Error('Wallet provider not available — open in Freedom Browser');
        }
        swarmStatus.textContent += 'Connecting wallet...\n';
        await connectWallet();
      }

      if (!state.get().swarmConnected) {
        swarmStatus.textContent += 'Connecting to Swarm...\n';
        await connectSwarm();
      }

      const userAddress = state.get().userAddress;
      if (!userAddress) throw new Error('No wallet address available after connect');
      refs._publishAddress = userAddress;
      swarmStatus.textContent += `Publishing as: ${userAddress}\n`;

      // Step 1: Create a user feed (for author refs)
      swarmStatus.textContent += 'Creating user feed...\n';
      let userFeedBzz;
      try {
        const feedResult = await createFeed(FREEDOM_ADAPTER.USER_FEED_NAME);
        userFeedBzz = feedResult.bzzUrl || hexToBzz(feedResult.manifestReference);
        swarmStatus.textContent += `User feed: ${userFeedBzz}\n`;
      } catch (e) {
        // Feed creation may fail if not connected with wallet — use placeholder
        userFeedBzz = 'bzz://' + '0'.repeat(64);
        swarmStatus.textContent += `User feed creation failed (${e.message}), using placeholder\n`;
      }

      const author = { address: userAddress, userFeed: userFeedBzz };

      // Step 2: Board
      swarmStatus.textContent += '\nBuilding board...\n';
      const board = buildBoard({
        slug: 'test',
        title: 'Test Board',
        description: 'A test board for fixture development',
        governance: { chainId: 100, type: 'eoa', address: userAddress },
      });
      const boardResult = await publishAndValidate(board, 'board', swarmStatus);
      refs.boardRef = boardResult.bzzUrl;
      swarmStatus.textContent += `Board published: ${refs.boardRef}\n`;

      // Step 3: Post
      swarmStatus.textContent += '\nBuilding post...\n';
      const post = buildPost({
        author,
        title: 'Hello Swarm!',
        body: { kind: 'markdown', text: 'This is the first test post on Swarmit. It was created by the fixture builder.' },
      });
      const postResult = await publishAndValidate(post, 'post', swarmStatus);
      refs.postRef = postResult.bzzUrl;
      swarmStatus.textContent += `Post published: ${refs.postRef}\n`;

      // Step 4: Submission for post
      swarmStatus.textContent += '\nBuilding submission (post)...\n';
      const postSubmission = buildSubmission({
        boardId: 'test',
        kind: 'post',
        contentRef: refs.postRef,
        author,
      });
      const postSubResult = await publishAndValidate(postSubmission, 'submission-post', swarmStatus);
      refs.postSubmissionRef = postSubResult.bzzUrl;
      swarmStatus.textContent += `Post submission published: ${refs.postSubmissionRef}\n`;

      // Step 5: Reply
      swarmStatus.textContent += '\nBuilding reply...\n';
      const reply = buildReply({
        author,
        body: { kind: 'markdown', text: 'Great first post! This is a test reply.' },
      });
      const replyResult = await publishAndValidate(reply, 'reply', swarmStatus);
      refs.replyRef = replyResult.bzzUrl;
      swarmStatus.textContent += `Reply published: ${refs.replyRef}\n`;

      // Step 6: Submission for reply
      swarmStatus.textContent += '\nBuilding submission (reply)...\n';
      const replySubmission = buildSubmission({
        boardId: 'test',
        kind: 'reply',
        contentRef: refs.replyRef,
        author,
        parentSubmissionId: refs.postSubmissionRef,
        rootSubmissionId: refs.postSubmissionRef,
      });
      const replySubResult = await publishAndValidate(replySubmission, 'submission-reply', swarmStatus);
      refs.replySubmissionRef = replySubResult.bzzUrl;
      swarmStatus.textContent += `Reply submission published: ${refs.replySubmissionRef}\n`;

      // Step 7: BoardIndex
      swarmStatus.textContent += '\nBuilding boardIndex...\n';
      const boardIndex = buildBoardIndex({
        boardId: 'test',
        curator: userAddress,
        entries: [
          { submissionId: refs.postSubmissionRef, submissionRef: refs.postSubmissionRef },
        ],
      });
      const boardIndexResult = await publishAndValidate(boardIndex, 'boardIndex', swarmStatus);
      refs.boardIndexRef = boardIndexResult.bzzUrl;
      swarmStatus.textContent += `BoardIndex published: ${refs.boardIndexRef}\n`;

      // Step 8: ThreadIndex
      swarmStatus.textContent += '\nBuilding threadIndex...\n';
      const threadIndex = buildThreadIndex({
        rootSubmissionId: refs.postSubmissionRef,
        curator: userAddress,
        nodes: [
          { submissionId: refs.postSubmissionRef, parentSubmissionId: null, depth: 0 },
          { submissionId: refs.replySubmissionRef, parentSubmissionId: refs.postSubmissionRef, depth: 1 },
        ],
      });
      const threadIndexResult = await publishAndValidate(threadIndex, 'threadIndex', swarmStatus);
      refs.threadIndexRef = threadIndexResult.bzzUrl;
      swarmStatus.textContent += `ThreadIndex published: ${refs.threadIndexRef}\n`;

      // Step 9: UserFeedIndex
      swarmStatus.textContent += '\nBuilding userFeedIndex...\n';
      const userFeedIndex = buildUserFeedIndex({
        author: userAddress,
        entries: [
          { submissionId: refs.postSubmissionRef, submissionRef: refs.postSubmissionRef, boardId: 'test', kind: 'post', createdAt: postSubmission.createdAt },
          { submissionId: refs.replySubmissionRef, submissionRef: refs.replySubmissionRef, boardId: 'test', kind: 'reply', createdAt: replySubmission.createdAt },
        ],
      });
      const userFeedResult = await publishAndValidate(userFeedIndex, 'userFeedIndex', swarmStatus);
      refs.userFeedIndexRef = userFeedResult.bzzUrl;
      swarmStatus.textContent += `UserFeedIndex published: ${refs.userFeedIndexRef}\n`;

      // Update user feed to point at the index
      if (userFeedBzz !== 'bzz://' + '0'.repeat(64)) {
        try {
          await updateFeed(FREEDOM_ADAPTER.USER_FEED_NAME, userFeedResult.reference);
          swarmStatus.textContent += `User feed updated to point at userFeedIndex\n`;
        } catch (e) {
          swarmStatus.textContent += `Feed update failed: ${e.message}\n`;
        }
      }

      // Step 10: GlobalIndex
      swarmStatus.textContent += '\nBuilding globalIndex...\n';
      const globalIndex = buildGlobalIndex({
        curator: userAddress,
        entries: [
          { boardId: 'test', submissionId: refs.postSubmissionRef, submissionRef: refs.postSubmissionRef },
        ],
      });
      const globalIndexResult = await publishAndValidate(globalIndex, 'globalIndex', swarmStatus);
      refs.globalIndexRef = globalIndexResult.bzzUrl;
      swarmStatus.textContent += `GlobalIndex published: ${refs.globalIndexRef}\n`;

      // Step 11: CuratorProfile — with feeds pointing at real indexes
      swarmStatus.textContent += '\nBuilding curatorProfile...\n';
      let boardFeedBzz;
      try {
        const boardFeedResult = await createFeed('curator-test-board');
        boardFeedBzz = boardFeedResult.bzzUrl || hexToBzz(boardFeedResult.manifestReference);
        await updateFeed('curator-test-board', boardIndexResult.reference);
        swarmStatus.textContent += `Curator board feed created and pointed at boardIndex\n`;
      } catch (e) {
        boardFeedBzz = refs.boardIndexRef; // fallback: use direct ref
        swarmStatus.textContent += `Board feed creation failed (${e.message}), using direct ref\n`;
      }

      let globalFeedBzz;
      try {
        const globalFeedResult = await createFeed('curator-global-index');
        globalFeedBzz = globalFeedResult.bzzUrl || hexToBzz(globalFeedResult.manifestReference);
        await updateFeed('curator-global-index', globalIndexResult.reference);
        swarmStatus.textContent += `Curator global feed created and pointed at globalIndex\n`;
      } catch (e) {
        globalFeedBzz = refs.globalIndexRef; // fallback: use direct ref
        swarmStatus.textContent += `Global feed creation failed (${e.message}), using direct ref\n`;
      }

      const curatorProfile = buildCuratorProfile({
        curator: userAddress,
        name: 'Test Curator',
        description: 'Chronological test fixtures — no moderation',
        globalIndexFeed: globalFeedBzz,
        boardFeeds: { test: boardFeedBzz },
      });
      const curatorResult = await publishAndValidate(curatorProfile, 'curatorProfile', swarmStatus);
      refs.curatorProfileRef = curatorResult.bzzUrl;
      swarmStatus.textContent += `CuratorProfile published: ${refs.curatorProfileRef}\n`;

      // Summary
      swarmStatus.textContent += '\n=== All objects published successfully ===\n';
      refsOutput.style.display = 'block';
      refsOutput.textContent = JSON.stringify(refs, null, 2);

    } catch (e) {
      swarmStatus.textContent += `\nERROR: ${e.message}\n`;
    }

    publishBtn.disabled = false;
    publishBtn.textContent = 'Publish All Test Objects';
  });

  div.appendChild(publishBtn);
  div.appendChild(swarmStatus);
  div.appendChild(el('h4', { textContent: 'Published References', style: { marginTop: '16px' } }));
  div.appendChild(refsOutput);

  // ============================================
  // Section 2: On-chain registration (needs contract + wallet)
  // ============================================

  div.appendChild(el('h3', { textContent: '2. Register On-Chain', style: { marginTop: '32px' } }));

  if (!contractOk) {
    div.appendChild(el('p', { className: 'muted', textContent: 'Contract not configured — on-chain registration disabled. Update CONTRACT_ADDRESS in config.js after deployment.' }));
  } else {
    div.appendChild(el('p', { className: 'muted', textContent: 'Register the published fixtures on Gnosis Chain. Requires wallet connection.' }));

    const chainStatus = statusBox();

    const registerBoardBtn = el('button', { className: 'btn btn-primary', textContent: 'Register Board', style: { marginRight: '8px' } });
    registerBoardBtn.addEventListener('click', async () => {
      if (!refs.boardRef) { chainStatus.textContent = 'Publish fixtures first'; return; }
      if (!state.get().walletConnected) { chainStatus.textContent = 'Connect wallet first'; return; }
      if (refs._publishAddress && state.get().userAddress?.toLowerCase() !== refs._publishAddress.toLowerCase()) {
        chainStatus.textContent = `Wallet mismatch: fixtures published by ${refs._publishAddress}, current wallet is ${state.get().userAddress}`;
        return;
      }
      chainStatus.textContent = 'Registering board...\n';
      try {
        const tx = await registerBoard('test', refs.boardRef);
        chainStatus.textContent += `Board registered: tx ${tx}\n`;
      } catch (e) { chainStatus.textContent += `Error: ${e.message}\n`; }
    });

    const announcePostBtn = el('button', { className: 'btn btn-primary', textContent: 'Announce Post', style: { marginRight: '8px' } });
    announcePostBtn.addEventListener('click', async () => {
      if (!refs.postSubmissionRef) { chainStatus.textContent = 'Publish fixtures first'; return; }
      if (!state.get().walletConnected) { chainStatus.textContent = 'Connect wallet first'; return; }
      if (refs._publishAddress && state.get().userAddress?.toLowerCase() !== refs._publishAddress.toLowerCase()) {
        chainStatus.textContent = `Wallet mismatch: fixtures published by ${refs._publishAddress}, current wallet is ${state.get().userAddress}`;
        return;
      }
      chainStatus.textContent = 'Announcing post...\n';
      try {
        const tx = await announceSubmission({
          boardSlug: 'test',
          submissionRef: refs.postSubmissionRef,
          parentSubmissionId: null,
          rootSubmissionId: null,
        });
        chainStatus.textContent += `Post announced: tx ${tx}\n`;
      } catch (e) { chainStatus.textContent += `Error: ${e.message}\n`; }
    });

    const announceReplyBtn = el('button', { className: 'btn btn-primary', textContent: 'Announce Reply', style: { marginRight: '8px' } });
    announceReplyBtn.addEventListener('click', async () => {
      if (!refs.replySubmissionRef || !refs.postSubmissionRef) { chainStatus.textContent = 'Publish fixtures first'; return; }
      if (!state.get().walletConnected) { chainStatus.textContent = 'Connect wallet first'; return; }
      if (refs._publishAddress && state.get().userAddress?.toLowerCase() !== refs._publishAddress.toLowerCase()) {
        chainStatus.textContent = `Wallet mismatch: fixtures published by ${refs._publishAddress}, current wallet is ${state.get().userAddress}`;
        return;
      }
      chainStatus.textContent = 'Announcing reply...\n';
      try {
        const tx = await announceSubmission({
          boardSlug: 'test',
          submissionRef: refs.replySubmissionRef,
          parentSubmissionId: refs.postSubmissionRef,
          rootSubmissionId: refs.postSubmissionRef,
        });
        chainStatus.textContent += `Reply announced: tx ${tx}\n`;
      } catch (e) { chainStatus.textContent += `Error: ${e.message}\n`; }
    });

    const declareCuratorBtn = el('button', { className: 'btn btn-primary', textContent: 'Declare Curator' });
    declareCuratorBtn.addEventListener('click', async () => {
      if (!refs.curatorProfileRef) { chainStatus.textContent = 'Publish fixtures first'; return; }
      if (!state.get().walletConnected) { chainStatus.textContent = 'Connect wallet first'; return; }
      if (refs._publishAddress && state.get().userAddress?.toLowerCase() !== refs._publishAddress.toLowerCase()) {
        chainStatus.textContent = `Wallet mismatch: fixtures published by ${refs._publishAddress}, current wallet is ${state.get().userAddress}`;
        return;
      }
      chainStatus.textContent = 'Declaring curator...\n';
      try {
        const tx = await declareCurator(refs.curatorProfileRef);
        chainStatus.textContent += `Curator declared: tx ${tx}\n`;
      } catch (e) { chainStatus.textContent += `Error: ${e.message}\n`; }
    });

    div.appendChild(el('div', { style: { margin: '12px 0' } }, [registerBoardBtn, announcePostBtn, announceReplyBtn, declareCuratorBtn]));
    div.appendChild(chainStatus);
  }

  container.appendChild(div);
}
