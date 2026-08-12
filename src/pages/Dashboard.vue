<script setup>
import { ref, computed, onMounted, onUnmounted, inject, shallowRef } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js'
import { fetchLatest, fetchSystemStatus } from '../api.js'
import GaugeCard from '../components/GaugeCard.vue'
import StatusDot from '../components/StatusDot.vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

const toast = inject('toast')

const sensorData = ref(null)
const loadingSensor = ref(true)
const systemStatus = ref(null)
const loadingSystem = ref(true)

const MAX_BUFFER = 30
const buffer = shallowRef([])
let lastId = null

let timer1, timer2

async function loadLatest() {
  try {
    const data = await fetchLatest()
    sensorData.value = data
    if (data && data.id !== lastId) {
      lastId = data.id
      const next = [...buffer.value, data]
      if (next.length > MAX_BUFFER) next.shift()
      buffer.value = next
    }
  } catch (e) {
    toast(e.message)
  } finally {
    loadingSensor.value = false
  }
}

async function loadSystem() {
  try {
    systemStatus.value = await fetchSystemStatus()
  } catch {
    // silent
  } finally {
    loadingSystem.value = false
  }
}

const STALE_SEC = 45

const sensorStale = computed(() => {
  if (!sensorData.value?.recorded_at) return false
  return (Date.now() - new Date(sensorData.value.recorded_at).getTime()) / 1000 > STALE_SEC
})

const chartLabels = computed(() => buffer.value.map(d => {
  const t = new Date(d.recorded_at)
  return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}))

const tempHumChart = computed(() => ({
  labels: chartLabels.value,
  datasets: [
    {
      label: 'Temp °C',
      data: buffer.value.map(d => d.temperature),
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245,158,11,0.08)',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      borderWidth: 1.5,
    },
    {
      label: 'Hum %',
      data: buffer.value.map(d => d.humidity),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.08)',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      borderWidth: 1.5,
    },
  ],
}))

const gasChart = computed(() => ({
  labels: chartLabels.value,
  datasets: [
    {
      label: 'CO ppm',
      data: buffer.value.map(d => d.co_ppm),
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239,68,68,0.08)',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      borderWidth: 1.5,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 500 },
  interaction: { intersect: false, mode: 'index' },
  plugins: {
    legend: { labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12, padding: 8 } },
  },
  scales: {
    x: { display: false },
    y: { ticks: { color: '#64748b', font: { size: 9 } }, grid: { color: '#1e293b' } },
  },
}

onMounted(() => {
  loadLatest()
  loadSystem()
  timer1 = setInterval(loadLatest, 5000)
  timer2 = setInterval(loadSystem, 30000)
})

onUnmounted(() => {
  clearInterval(timer1)
  clearInterval(timer2)
})

function overallColor(s) {
  return s === 'HEALTHY' ? 'bg-green-500' : s === 'DEGRADED' ? 'bg-amber-500' : 'bg-red-500'
}
</script>

<template>
  <div class="space-y-4 min-h-full flex flex-col">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-shrink-0">
      <GaugeCard
        title="Temperature"
        :value="sensorData?.temperature"
        unit="°C"
        :min="0" :max="50"
        :loading="loadingSensor"
        :stale="sensorStale"
        :thresholds="[{ value: 28, color: '#f59e0b' }, { value: 35, color: '#ef4444' }]"
      />
      <GaugeCard
        title="Humidity"
        :value="sensorData?.humidity"
        unit="%"
        :min="0" :max="100"
        :loading="loadingSensor"
        :stale="sensorStale"
        :thresholds="[{ value: 80, color: '#f59e0b' }]"
      />
      <GaugeCard
        title="CO Level"
        :value="sensorData?.co_ppm"
        unit="ppm"
        :min="0" :max="200"
        :loading="loadingSensor"
        :stale="sensorStale"
        :thresholds="[{ value: 35, color: '#f59e0b' }, { value: 100, color: '#ef4444' }]"
      />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1">
      <div class="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-col min-h-0">
        <h3 class="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2 flex-shrink-0">Temperature & Humidity</h3>
        <div class="flex-1 min-h-0">
          <Line v-if="buffer.length" :data="tempHumChart" :options="chartOptions" />
          <div v-else class="h-full flex items-center justify-center text-xs text-slate-500">Waiting for data...</div>
        </div>
      </div>
      <div class="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-col min-h-0">
        <h3 class="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2 flex-shrink-0">CO Level</h3>
        <div class="flex-1 min-h-0">
          <Line v-if="buffer.length" :data="gasChart" :options="chartOptions" />
          <div v-else class="h-full flex items-center justify-center text-xs text-slate-500">Waiting for data...</div>
        </div>
      </div>
    </div>

    <div class="bg-slate-800 rounded-xl p-5 border border-slate-700 flex-shrink-0">
      <h3 class="text-sm font-medium text-slate-300 mb-4">System Status</h3>
      <div v-if="loadingSystem" class="space-y-3">
        <div v-for="i in 4" :key="i" class="h-10 bg-slate-700 rounded animate-pulse" />
      </div>
      <div v-else-if="systemStatus" class="space-y-3">
        <div class="flex items-center justify-between text-sm">
          <span class="text-slate-400">API Server</span>
          <span class="flex items-center gap-2">
            <StatusDot :status="systemStatus.components?.api_server?.status" />
            <span class="text-slate-300">{{ systemStatus.components?.api_server?.status || '--' }}</span>
          </span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-slate-400">Database</span>
          <span class="flex items-center gap-2">
            <StatusDot :status="systemStatus.components?.database?.status" />
            <span class="text-slate-300">{{ systemStatus.components?.database?.status || '--' }}</span>
          </span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-slate-400">ESP32 Device</span>
          <span class="flex items-center gap-2">
            <StatusDot :status="systemStatus.components?.esp32_device?.status" />
            <span class="text-slate-300">{{ systemStatus.components?.esp32_device?.status || '--' }}</span>
          </span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-slate-400">Disk</span>
          <span class="text-slate-300">{{ systemStatus.components?.disk_space?.used_percent || '--' }}% used</span>
        </div>
      </div>
      <p v-else class="text-sm text-slate-500">Unavailable</p>

      <div v-if="systemStatus" class="mt-4 pt-3 border-t border-slate-700 flex items-center gap-2 text-xs">
        <span :class="['w-2 h-2 rounded-full', overallColor(systemStatus.overall_status)]" />
        <span class="text-slate-400">Overall:</span>
        <span class="text-slate-300 font-medium">{{ systemStatus.overall_status }}</span>
      </div>
    </div>
  </div>
</template>
