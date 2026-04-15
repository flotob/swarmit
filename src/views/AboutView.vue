<script setup>
import { Button } from '../components/ui/button'
import { ExternalLink } from 'lucide-vue-next'

// Freedom browser doesn't navigate ens:// links on regular clicks —
// window.open takes the same code path as "open in new tab" which works.
function navigate(e) {
  const href = e.currentTarget.getAttribute('href')
  if (href && !href.startsWith('http')) {
    e.preventDefault()
    window.open(href, '_blank')
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold text-foreground mb-6">About Swarmit</h1>

    <div class="space-y-8 text-sm text-muted-foreground leading-relaxed">
      <section>
        <h2 class="text-lg font-semibold text-foreground mb-2">What is Swarmit?</h2>
        <p>
          Swarmit is a decentralized message board built on
          <a href="ens://swarm.eth" class="text-link hover:underline" @click="navigate">Swarm</a>
          (content storage) and
          <a href="https://www.gnosis.io" target="_blank" rel="noopener" class="text-link hover:underline">Gnosis Chain</a>
          (announcements and discovery). Posts, replies, and votes are published to Swarm as
          immutable content objects and announced on-chain so they can be discovered by anyone.
        </p>
        <p class="mt-2">
          There is no central server. Content lives on the Swarm network, and the
          on-chain registry is permissionless — anyone can register a board, announce
          a submission, or declare a curator.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-foreground mb-2">What are curators?</h2>
        <p>
          Curators are independent indexing services that watch the on-chain registry,
          fetch content from Swarm, build sorted feeds (hot, new, best, etc.), and
          publish them back to Swarm. They are the "view layer" of swarmit — they
          decide how content is organized and presented.
        </p>
        <p class="mt-2">
          When you see "Showing view from ..." at the top of a board or feed, that's
          the curator whose index you're reading. You can switch curators at any time
          using the dropdown. Different curators may show different content, apply
          different ranking algorithms, or moderate differently.
        </p>
        <p class="mt-2">
          Curators are <strong class="text-foreground">fully permissionless</strong>. Anyone can run one — there is
          no approval process, no central authority. You declare your curator on-chain
          and start publishing indexes. Clients discover curators automatically.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-foreground mb-2">Run your own curator</h2>
        <p>
          The reference curator is open source. It watches the Gnosis Chain registry for
          new submissions, fetches and validates content from Swarm, computes ranking
          algorithms, and publishes board/thread/global indexes as Swarm feeds.
        </p>
        <p class="mt-2">
          To get started, clone the curator repo and follow the setup instructions:
        </p>
        <Button variant="outline" size="sm" as-child class="mt-3">
          <a href="https://github.com/flotob/swarmit-curator" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5">
            <ExternalLink class="w-3.5 h-3.5" />
            swarmit-curator on GitHub
          </a>
        </Button>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-foreground mb-2">How it works</h2>
        <dl class="space-y-3">
          <div>
            <dt class="font-medium text-foreground">Swarm</dt>
            <dd>Decentralized storage network. All content (posts, replies, board metadata, curator indexes) is stored as immutable objects on Swarm, addressed by content hash.</dd>
          </div>
          <div>
            <dt class="font-medium text-foreground">Gnosis Chain</dt>
            <dd>EVM-compatible L1 with near-zero gas fees. The SwarmitRegistry smart contract tracks board registrations, submission announcements, votes, curator declarations, and user feed declarations.</dd>
          </div>
          <div>
            <dt class="font-medium text-foreground">Freedom Browser</dt>
            <dd>
              A Swarm-native browser that provides the <code class="text-xs bg-secondary px-1 py-0.5 rounded">window.swarm</code> API
              for publishing content, managing feeds, and connecting to the Swarm network.
              <a href="ens://freedombrowser.eth" class="text-link hover:underline ml-1" @click="navigate">Learn more</a>.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  </div>
</template>
