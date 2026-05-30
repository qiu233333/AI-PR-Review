import axios from 'axios';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export async function analyzePr(prUrl) {
  const response = await axios.post(`${apiBaseUrl}/api/review/analyze`, {
    prUrl
  });

  return response.data.data;
}
