<script setup>
import { ref } from 'vue';

defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['submit']);
const prUrl = ref('');
const localError = ref('');

function submit() {
  const value = prUrl.value.trim();

  if (!value) {
    localError.value = '请输入 GitHub PR 链接。';
    return;
  }

  localError.value = '';
  emit('submit', value);
}
</script>

<template>
  <form class="pr-input" @submit.prevent="submit">
    <label for="pr-url">GitHub PR 链接</label>
    <div class="input-row">
      <input
        id="pr-url"
        v-model="prUrl"
        :disabled="disabled"
        type="url"
        placeholder="https://github.com/owner/repo/pull/1"
        autocomplete="off"
      />
      <button type="submit" :disabled="disabled">
        <span class="button-mark" aria-hidden="true"></span>
        {{ disabled ? '分析中' : '开始分析' }}
      </button>
    </div>
    <p v-if="localError" class="field-error" role="alert">
      {{ localError }}
    </p>
  </form>
</template>
