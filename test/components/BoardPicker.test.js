// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const mockBoards = ref([])
const mockIsLoading = ref(false)

vi.mock('../../src/composables/useCuratorBoards', () => ({
  useCuratorBoards: () => ({
    boards: mockBoards,
    isLoading: mockIsLoading,
  }),
}))

const BoardPicker = (await import('../../src/components/BoardPicker.vue')).default

describe('BoardPicker', () => {
  beforeEach(() => {
    mockBoards.value = []
    mockIsLoading.value = false
  })

  it('renders placeholder label when no board is selected', () => {
    mockBoards.value = ['tech', 'science']
    const wrapper = mount(BoardPicker, {
      props: { modelValue: null },
    })
    expect(wrapper.text()).toContain('Select a board')
  })

  it('renders r/<slug> label when a board is selected', () => {
    mockBoards.value = ['tech', 'science']
    const wrapper = mount(BoardPicker, {
      props: { modelValue: 'tech' },
    })
    expect(wrapper.text()).toContain('r/tech')
  })

  it('forwards disabled prop to the trigger', () => {
    mockBoards.value = ['tech']
    const wrapper = mount(BoardPicker, {
      props: { modelValue: null, disabled: true },
    })
    const trigger = wrapper.find('button')
    expect(trigger.attributes('disabled')).toBeDefined()
  })
})
