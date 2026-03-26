<script setup>
import { watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  open: Boolean,
})

defineEmits(['close'])

watch(() => props.open, (val) => {
  document.body.style.overflow = val ? 'hidden' : ''
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-black/50 lg:hidden"
        @click="$emit('close')"
      />
    </Transition>

    <Transition name="drawer-slide-up">
      <div
        v-if="open"
        class="fixed bottom-0 inset-x-0 z-50 lg:hidden max-h-[70vh] overflow-y-auto rounded-t-xl bg-card border-t border-border p-4"
      >
        <div class="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-3" />
        <slot />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-slide-up-enter-active,
.drawer-slide-up-leave-active {
  transition: transform 0.3s ease;
}
.drawer-slide-up-enter-from,
.drawer-slide-up-leave-to {
  transform: translateY(100%);
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.3s ease;
}
.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}
</style>
