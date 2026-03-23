/**
 * Hash-based client-side router.
 */

const routes = [];
let container = null;
let notFoundHandler = null;

export function register(pattern, handler) {
  // Convert pattern like '#/r/:slug/comments/:rootSubId' to a regex
  const paramNames = [];
  const regexStr = pattern.replace(/:([a-zA-Z]+)/g, (_match, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  routes.push({
    pattern,
    regex: new RegExp(`^${regexStr}$`),
    paramNames,
    handler,
  });
}

export function setNotFound(handler) {
  notFoundHandler = handler;
}

export function init(el) {
  container = el;
  window.addEventListener('hashchange', () => resolve());
  resolve();
}

export function navigate(hash) {
  window.location.hash = hash;
}

function resolve() {
  const hash = window.location.hash || '#/';

  for (const route of routes) {
    const match = hash.match(route.regex);
    if (match) {
      const params = {};
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1]);
      });
      container.innerHTML = '';
      route.handler(container, params);
      return;
    }
  }

  // No match
  if (notFoundHandler) {
    container.innerHTML = '';
    notFoundHandler(container);
  }
}
