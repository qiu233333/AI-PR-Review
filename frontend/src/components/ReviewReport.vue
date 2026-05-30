<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  report: {
    type: Object,
    required: true
  }
});

const riskClass = computed(() => {
  const value = String(props.report.riskLevel || '').toLowerCase();

  if (value.includes('high') || value.includes('高')) {
    return 'high';
  }

  if (value.includes('medium') || value.includes('中')) {
    return 'medium';
  }

  if (value.includes('low') || value.includes('低')) {
    return 'low';
  }

  return 'unknown';
});

const copyStatus = ref('');
const copyStatusType = ref('');

const markdownReport = computed(() => {
  return typeof props.report.markdownReport === 'string' ? props.report.markdownReport : '';
});

const hasMarkdownReport = computed(() => markdownReport.value.trim().length > 0);

watch(markdownReport, () => {
  copyStatus.value = '';
  copyStatusType.value = '';
});

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function formatItem(item) {
  if (typeof item === 'string') {
    return item;
  }

  return JSON.stringify(item);
}

async function writeToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();

  const copied = document.execCommand('copy');
  document.body.removeChild(textArea);

  if (!copied) {
    throw new Error('Clipboard copy failed.');
  }
}

async function copyMarkdownReport() {
  if (!hasMarkdownReport.value) {
    return;
  }

  copyStatus.value = '';
  copyStatusType.value = '';

  try {
    await writeToClipboard(markdownReport.value);
    copyStatus.value = '复制成功';
    copyStatusType.value = 'success';
  } catch {
    copyStatus.value = '复制失败，请手动复制';
    copyStatusType.value = 'error';
  }
}
</script>

<template>
  <section class="report-grid" aria-label="AI Review 报告">
    <article class="summary-panel">
      <div class="section-heading">
        <p class="section-kicker">Summary</p>
        <h2>PR 变更总结</h2>
      </div>
      <p class="summary-text">{{ report.summary || '暂无总结。' }}</p>
    </article>

    <article class="risk-panel">
      <p class="section-kicker">Risk Level</p>
      <div class="risk-badge" :class="riskClass">
        {{ report.riskLevel || 'unknown' }}
      </div>
    </article>

    <article class="list-panel">
      <div class="section-heading">
        <p class="section-kicker">Risk Code</p>
        <h2>风险代码</h2>
      </div>
      <ul v-if="normalizeList(report.risks).length" class="report-list">
        <li v-for="(item, index) in normalizeList(report.risks)" :key="`risk-${index}`">
          {{ formatItem(item) }}
        </li>
      </ul>
      <p v-else class="empty-text">暂无明确风险。</p>
    </article>

    <article class="list-panel">
      <div class="section-heading">
        <p class="section-kicker">Review Advice</p>
        <h2>Review 建议</h2>
      </div>
      <ul v-if="normalizeList(report.suggestions).length" class="report-list">
        <li v-for="(item, index) in normalizeList(report.suggestions)" :key="`suggestion-${index}`">
          {{ formatItem(item) }}
        </li>
      </ul>
      <p v-else class="empty-text">暂无 Review 建议。</p>
    </article>

    <article class="list-panel">
      <div class="section-heading">
        <p class="section-kicker">Test Plan</p>
        <h2>测试建议</h2>
      </div>
      <ul v-if="normalizeList(report.testSuggestions).length" class="report-list">
        <li v-for="(item, index) in normalizeList(report.testSuggestions)" :key="`test-${index}`">
          {{ formatItem(item) }}
        </li>
      </ul>
      <p v-else class="empty-text">暂无测试建议。</p>
    </article>

    <article class="markdown-panel">
      <div class="markdown-heading">
        <div class="section-heading">
          <p class="section-kicker">Markdown</p>
          <h2>Markdown 报告</h2>
        </div>
        <div class="copy-actions">
          <button type="button" :disabled="!hasMarkdownReport" @click="copyMarkdownReport">
            复制 Markdown 报告
          </button>
          <p v-if="copyStatus" class="copy-status" :class="copyStatusType" role="status">
            {{ copyStatus }}
          </p>
        </div>
      </div>
      <pre>{{ report.markdownReport || '暂无 Markdown 报告。' }}</pre>
    </article>
  </section>
</template>
