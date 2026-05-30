<script setup>
import { computed } from 'vue';

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
      <div class="section-heading">
        <p class="section-kicker">Markdown</p>
        <h2>Markdown 报告</h2>
      </div>
      <pre>{{ report.markdownReport || '暂无 Markdown 报告。' }}</pre>
    </article>
  </section>
</template>
