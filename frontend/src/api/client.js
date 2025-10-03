// frontend/src/api/client.js
import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:8000',
  timeout: 15000,
})

function sleep(ms){ return new Promise(r => setTimeout(r, ms)) }

client.interceptors.response.use(
  r => r,
  async error => {
    const { response, config } = error
    if (!response || response.status !== 429) throw error
    config.__retryCount = (config.__retryCount || 0) + 1
    if (config.__retryCount > 4) throw error
    const retryAfter = Number(response.headers?.['retry-after']) || 1
    const backoff = Math.min(500 * Math.pow(2, config.__retryCount - 1), 4000)
    await sleep((retryAfter * 1000) + backoff)
    return client(config)
  }
)

export default client
