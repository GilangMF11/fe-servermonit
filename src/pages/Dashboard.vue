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
    <div>
      <h2 class="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-blue-500"></span>
        Sensor inside rack
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
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
        <div class="bg-slate-800/80 rounded-2xl ring-1 ring-slate-700/50 overflow-hidden flex flex-col items-center justify-center p-4 text-center">
          <svg class="w-8 h-8 sm:w-10 sm:h-10 text-blue-400 mb-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3c-4.97 6-9 10.5-9 14a9 9 0 0018 0c0-3.5-4.03-8-9-14z"/>
          </svg>
          <p class="text-lg sm:text-2xl font-bold tracking-tight text-blue-400">No Water Detected</p>
          <p class="text-xs font-medium text-slate-500 uppercase tracking-wider mt-2">Water Detection</p>
        </div>
      </div>
    </div>

    <div>
      <h2 class="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        Sensor outside rack
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-shrink-0">
        <GaugeCard
          title="Temperature"
          :value="sensorData?.temperature != null ? sensorData.temperature - 1 : null"
          unit="°C"
          :min="0" :max="50"
          :loading="loadingSensor"
          :stale="sensorStale"
          :thresholds="[{ value: 28, color: '#f59e0b' }, { value: 35, color: '#ef4444' }]"
        />
        <GaugeCard
          title="Humidity"
          :value="sensorData?.humidity != null ? sensorData.humidity - 1 : null"
          unit="%"
          :min="0" :max="100"
          :loading="loadingSensor"
          :stale="sensorStale"
          :thresholds="[{ value: 80, color: '#f59e0b' }]"
        />
        <div class="bg-slate-800/80 rounded-2xl ring-1 ring-slate-700/50 flex flex-col items-center justify-center p-4 text-center">
          <div class="relative mb-3">
            <svg class="w-10 h-10 sm:w-12 sm:h-12 text-amber-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex items-center gap-2 mb-1">
            <span class="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            <span class="text-lg sm:text-xl font-bold text-green-400">Not Detected</span>
          </div>
          <p class="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Vibration</p>
        </div>
        <div class="bg-slate-800/80 rounded-2xl ring-1 ring-slate-700/50 flex flex-col items-center justify-center p-4 text-center">
          <div class="relative mb-3">
            <svg class="w-10 h-10 sm:w-12 sm:h-12 text-orange-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z"/>
            </svg>
          </div>
          <div class="flex items-center gap-2 mb-1">
            <span class="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            <span class="text-lg sm:text-xl font-bold text-green-400">Safe</span>
          </div>
          <p class="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Fire</p>
        </div>
        <GaugeCard
          title="Air Pressure"
          :value="null"
          unit="hPa"
          :min="800" :max="1200"
          :loading="false"
          placeholder="N/A"
          :thresholds="[{ value: 1000, color: '#22d3ee' }]"
        />
        <GaugeCard
          title="Ampere"
          :value="null"
          unit="A"
          :min="0" :max="20"
          :loading="false"
          placeholder="N/A"
          :thresholds="[{ value: 10, color: '#f59e0b' }, { value: 16, color: '#ef4444' }]"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1">
      <div class="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-col min-h-0">
        <h3 class="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2 flex-shrink-0">Temperature & Humidity</h3>
        <div class="flex-1 min-h-[200px] lg:min-h-0">
          <Line v-if="buffer.length" :data="tempHumChart" :options="chartOptions" />
          <div v-else class="h-full flex items-center justify-center text-xs text-slate-500">Waiting for data...</div>
        </div>
      </div>
      <div class="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-col min-h-0">
        <h3 class="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2 flex-shrink-0">CO Level</h3>
        <div class="flex-1 min-h-[200px] lg:min-h-0">
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
