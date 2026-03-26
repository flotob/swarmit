<script setup>
import { computed } from 'vue'
import { Marked } from 'marked'
import DOMPurify from 'dompurify'
import { bzzToGatewayUrl } from '../protocol/references.js'

const props = defineProps({
  text: { type: String, default: '' },
})

function escapeAttr(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const md = new Marked({
  renderer: {
    image({ href, title, text }) {
      const src = bzzToGatewayUrl(href) || href
      const titleAttr = title ? ` title="${escapeAttr(title)}"` : ''
      return `<img src="${escapeAttr(src)}" alt="${escapeAttr(text)}"${titleAttr} class="max-w-full rounded-md my-2" />`
    },
  },
  breaks: true,
  gfm: true,
})

const html = computed(() => {
  if (!props.text) return ''
  const raw = md.parse(props.text)
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'code', 'pre', 'blockquote',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'img', 'hr'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'rel', 'target'],
    ADD_ATTR: ['target'],
  })
})
</script>

<template>
  <div class="prose prose-invert prose-sm max-w-none" v-html="html" />
</template>

<style>
.prose p { margin-bottom: 0.75em; }
.prose p:last-child { margin-bottom: 0; }
.prose code {
  background: var(--secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.875em;
}
.prose pre {
  background: var(--secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  overflow-x: auto;
}
.prose pre code {
  background: none;
  padding: 0;
}
.prose blockquote {
  border-left: 3px solid var(--border);
  padding-left: 12px;
  color: var(--muted-foreground);
  margin: 0.75em 0;
}
.prose a { color: var(--primary); }
.prose a:hover { text-decoration: underline; }
.prose img { max-width: 100%; border-radius: 8px; }
.prose ul, .prose ol { padding-left: 1.5em; margin: 0.5em 0; }
.prose li { margin: 0.25em 0; }
.prose h1, .prose h2, .prose h3, .prose h4 { color: var(--foreground); margin: 1em 0 0.5em; }
</style>
