<script setup>
import { ref } from 'vue';

import { analyzePr } from './api/review';
import LoadingPanel from './components/LoadingPanel.vue';
import PrInput from './components/PrInput.vue';
import ReviewReport from './components/ReviewReport.vue';

const report = ref(null);
const errorMessage = ref('');
const isLoading = ref(false);

async function handleAnalyze(prUrl) {
  isLoading.value = true;
  errorMessage.value = '';
  report.value = null;

  try {
    report.value = await analyzePr(prUrl);
  } catch (error) {
    errorMessage.value =
      error?.response?.data?.error?.message || error.message || '分析失败，请稍后重试。';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <main class="app-shell">
    <section class="review-workspace" aria-labelledby="page-title">
      <div class="workspace-header">
        <div>
          <p class="eyebrow">GitHub Pull Request Intelligence</p>
          <h1 id="page-title">AI PR Review 助手</h1>
        </div>
        <span class="signal-pill">DeepSeek Ready</span>
      </div>

      <PrInput :disabled="isLoading" @submit="handleAnalyze" />

      <p v-if="errorMessage" class="error-message" role="alert">
        {{ errorMessage }}
      </p>

      <LoadingPanel v-if="isLoading" />
      <ReviewReport v-else-if="report" :report="report" />
    </section>
  </main>
</template>
