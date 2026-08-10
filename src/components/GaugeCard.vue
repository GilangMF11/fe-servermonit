<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  value: { type: Number, default: 0 },
  unit: { type: String, default: '' },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  loading: { type: Boolean, default: false },
  thresholds: { type: Array, default: () => [] },
})

const size = 200
const stroke = 18
const radius = size / 2 - stroke
const center = size / 2
const circumference = Math.PI * radius

function arcPath(startAngle, endAngle) {
  const start = polarToCartesian(center, center, radius, endAngle)
  const end = polarToCartesian(center, center, radius, startAngle)
  const arc = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${arc} 0 ${end.x} ${end.y}`
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 180) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

const percent = computed(() => {
  const v = props.value ?? props.min
  return Math.min(1, Math.max(0, (v - props.min) / (props.max - props.min)))
})

const gaugeColor = computed(() => {
  if (!props.thresholds.length) return '#3b82f6'
  for (const t of [...props.thresholds].reverse()) {
    if (props.value >= t.value) return t.color
  }
  return '#22c55e'
})

const bgColor = computed(() => {
  if (props.loading) return '#334155'
  return gaugeColor.value + '1a'
})

const arcStart = -180
const arcEnd = 0
const valueAngle = computed(() => arcStart + percent.value * (arcEnd - arcStart))

const valuePath = computed(() => arcPath(arcStart, valueAngle.value))
const bgPath = computed(() => arcPath(arcStart, arcEnd))

const needle = computed(() => polarToCartesian(center, center, radius - stroke / 2 - 2, valueAngle.value))
</script>

<template>
  <div class="bg-slate-800/80 rounded-2xl ring-1 ring-slate-700/50 overflow-hidden flex flex-col items-center p-4 pt-3">
    <svg :width="size" :height="size / 2 + 12" :viewBox="`0 0 ${size} ${size / 2 + 12}`" class="-mb-2">
      <path :d="bgPath" fill="none" :stroke="$loading ? '#334155' : '#1e293b'" :stroke-width="stroke" stroke-linecap="round" />

      <path v-if="percent > 0"
        :d="valuePath"
        fill="none"
        :stroke="gaugeColor"
        :stroke-width="stroke"
        stroke-linecap="round"
        class="transition-all duration-700 ease-out"
      />

      <line v-if="!loading"
        :x1="center" :y1="center"
        :x2="needle.x" :y2="needle.y"
        :stroke="gaugeColor"
        stroke-width="3"
        stroke-linecap="round"
        class="transition-all duration-700 ease-out"
      />
      <circle v-if="!loading" :cx="center" :cy="center" r="5" fill="#fff" />

      <text x="50%" y="28" text-anchor="middle" class="fill-slate-500" font-size="10">{{ min }}{{ unit }}</text>
      <text :x="size - 8" y="28" text-anchor="end" class="fill-slate-500" font-size="10">{{ max }}{{ unit }}</text>
    </svg>

    <div class="text-center -mt-6 relative z-10">
      <template v-if="loading">
        <div class="h-10 w-24 bg-slate-700/50 rounded-lg animate-pulse mx-auto" />
      </template>
      <template v-else>
        <p class="text-3xl font-bold tracking-tight text-white tabular-nums">
          {{ value ?? '--' }}
          <span v-if="unit" class="text-sm font-medium text-slate-500">{{ unit }}</span>
        </p>
      </template>
      <p class="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">{{ title }}</p>
    </div>
  </div>
</template>
