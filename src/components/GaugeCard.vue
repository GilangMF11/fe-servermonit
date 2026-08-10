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

const cx = 80, cy = 100, r = 65, sw = 12
const viewW = 160, viewH = 130

function polar(cx, cy, radius, angleDeg) {
  const rad = ((angleDeg - 180) * Math.PI) / 180
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
}

function arcPath(startAngle, endAngle) {
  const s = polar(cx, cy, r, endAngle)
  const e = polar(cx, cy, r, startAngle)
  const large = endAngle - startAngle > 180 ? 1 : 0
  return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} A ${r} ${r} 0 ${large} 0 ${e.x.toFixed(1)} ${e.y.toFixed(1)}`
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

const arcStart = 0
const arcEnd = 180
const valueAngle = computed(() => arcStart + percent.value * (arcEnd - arcStart))

const bgPath = computed(() => arcPath(arcStart, arcEnd))
const valuePath = computed(() => arcPath(arcStart, valueAngle.value))
const needle = computed(() => polar(cx, cy, r - sw / 2 - 1, valueAngle.value))
</script>

<template>
  <div class="bg-slate-800/80 rounded-2xl ring-1 ring-slate-700/50 overflow-hidden flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
    <svg :viewBox="`0 0 ${viewW} ${viewH}`" class="w-28 sm:w-36 lg:w-40 flex-shrink-0" preserveAspectRatio="xMidYMid meet">
      <path :d="bgPath" fill="none" :stroke="loading ? '#334155' : '#1e293b'" :stroke-width="sw" stroke-linecap="round" />

      <path v-if="percent > 0 && !loading"
        :d="valuePath"
        fill="none"
        :stroke="gaugeColor"
        :stroke-width="sw"
        stroke-linecap="round"
        class="transition-all duration-700 ease-out"
      />

      <line v-if="!loading"
        :x1="cx" :y1="cy"
        :x2="needle.x" :y2="needle.y"
        :stroke="gaugeColor"
        stroke-width="3"
        stroke-linecap="round"
        class="transition-all duration-700 ease-out"
      />
      <circle v-if="!loading" :cx="cx" :cy="cy" r="4" fill="#fff" />

      <text x="12" y="118" text-anchor="start" class="fill-slate-500" font-size="9">{{ min }}{{ unit }}</text>
      <text :x="cx + r" y="118" text-anchor="end" class="fill-slate-500" font-size="9">{{ max }}{{ unit }}</text>
    </svg>

    <div class="min-w-0 flex-1 text-right">
      <template v-if="loading">
        <div class="h-8 sm:h-10 w-16 sm:w-20 bg-slate-700/50 rounded-lg animate-pulse ml-auto" />
      </template>
      <template v-else>
        <p :class="['text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight tabular-nums leading-none', gaugeColor ? '' : 'text-white']" :style="{ color: gaugeColor }">
          {{ value ?? '--' }}
        </p>
        <p class="text-xs sm:text-sm font-medium text-slate-400 mt-0.5">{{ unit }}</p>
      </template>
      <p class="text-xs font-medium text-slate-600 uppercase tracking-wider mt-1.5 sm:mt-2">{{ title }}</p>
    </div>
  </div>
</template>
