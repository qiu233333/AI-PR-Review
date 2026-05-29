<script setup>
import axios from 'axios';
import { onMounted, ref } from 'vue';

const health = ref(null);
const isChecking = ref(false);
const errorMessage = ref('');

async function checkHealth() {
  isChecking.value = true;
  errorMessage.value = '';

  try {
    const response = await axios.get('/api/health');
    health.value = response.data;
  } catch (error) {
    health.value = null;
    errorMessage.value = error?.response?.data?.error?.message || error.message || '后端服务不可用';
  } finally {
    isChecking.value = false;
  }
}

onMounted(checkHealth);
</script>

<template>
  <main class="app-shell">
    <section class="workspace-panel" aria-labelledby="page-title">
      <div class="title-row">
        <div>
          <p class="eyebrow">AI PR Review</p>
          <h1 id="page-title">项目初始化</h1>
        </div>
        <span class="status-pill" :class="{ online: health?.status === 'ok' }">
          {{ health?.status === 'ok' ? '后端在线' : '等待检查' }}
        </span>
      </div>

      <div class="health-box">
        <div>
          <p class="label">健康检查</p>
          <p class="value">
            {{ health?.service || 'backend service' }}
          </p>
          <p class="meta">
            {{ health?.timestamp || '尚未收到响应' }}
          </p>
        </div>
        <button type="button" :disabled="isChecking" @click="checkHealth">
          {{ isChecking ? '检查中' : '重新检查' }}
        </button>
      </div>

      <p v-if="errorMessage" class="error-message" role="alert">
        {{ errorMessage }}
      </p>
    </section>
  </main>
</template>
