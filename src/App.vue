<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import rolesData from './data/roles.json'

type Role = {
  id: string
  name: string
  wakeUpOrder: number | null
  script: string
  pauseSeconds: number
  rules: string
}

type RoleFilter = 'all' | 'good' | 'evil' | 'selected'
type PresetConfig = {
  key: string
  label: string
  roleIds: string[]
}

function getWakeUpOrderValue(role: Role) {
  return role.wakeUpOrder ?? Number.POSITIVE_INFINITY
}

function sortRolesForDisplay(a: Role, b: Role) {
  if (a.id === 'werewolf' && b.id !== 'werewolf') {
    return -1
  }
  if (b.id === 'werewolf' && a.id !== 'werewolf') {
    return 1
  }

  const aWakeOrder = a.wakeUpOrder
  const bWakeOrder = b.wakeUpOrder
  const aWakesUp = aWakeOrder !== null
  const bWakesUp = bWakeOrder !== null

  if (aWakesUp && bWakesUp) {
    return aWakeOrder - bWakeOrder
  }

  if (aWakesUp && !bWakesUp) {
    return -1
  }
  if (!aWakesUp && bWakesUp) {
    return 1
  }

  return a.name.localeCompare(b.name, 'zh-Hant')
}

const roles = [...(rolesData as Role[])].sort(sortRolesForDisplay)
const selected = ref<Set<string>>(new Set())
const isPlaying = ref(false)
const speechSupported = 'speechSynthesis' in window
const speechRate = ref(1)
const speechPitch = ref(1)
const announceSession = ref(0)
const closeEyesSeconds = 3
const sentencePauseMs = 350
const roleFilter = ref<RoleFilter>('all')
const evilRoleIds = new Set(['werewolf', 'mystic_wolf', 'minion'])
const neutralRoleIds = new Set(['tanner'])
const roleCardCountOverrides = new Map<string, number>([['sentinel', 2]])
const availableVoices = ref<SpeechSynthesisVoice[]>([])
const selectedVoiceURI = ref('')

function getRoleCardCount(role: Role) {
  return roleCardCountOverrides.get(role.id) ?? 1
}

const selectedRoles = computed(() =>
  roles.filter((role) => selected.value.has(role.id)).sort((a, b) => getWakeUpOrderValue(a) - getWakeUpOrderValue(b))
)
const selectedRoleCount = computed(() => selectedRoles.value.length)
const selectedCardCount = computed(() => selectedRoles.value.reduce((total, role) => total + getRoleCardCount(role), 0))
const playerCount = computed(() => Math.max(0, selectedCardCount.value - 3))
const selectedGoodRoles = computed(() =>
  selectedRoles.value.filter((role) => !evilRoleIds.has(role.id) && !neutralRoleIds.has(role.id))
)
const villageTeamSummary = computed(() => {
  if (selectedGoodRoles.value.length === 0) {
    return '村民陣營：目前沒有勾選好人角色'
  }

  const parts = selectedGoodRoles.value.map((role) => `${role.name} ${getRoleCardCount(role)}`)
  return `村民陣營：${parts.join(' + ')}`
})
const hasMinion = computed(() => selectedRoles.value.some((role) => role.id === 'minion'))
const nightStartLine = computed(() =>
  hasMinion.value ? '夜晚開始，請全部玩家閉上眼睛並且手伸出來。' : '夜晚開始，請全部玩家閉上眼睛。'
)
const wolfSeerIds = new Set(['wolfseer', 'wolf_seer', 'wolf-seer', 'mystic_wolf'])
const hasWolfSeer = computed(() => selectedRoles.value.some((role) => wolfSeerIds.has(role.id)))
const wolfTeamSummary = computed(() => {
  const parts = hasWolfSeer.value ? ['狼先知 1', '狼人 1'] : ['狼人 2']
  const evilCardCount = 2 + (hasMinion.value ? 1 : 0)
  if (hasMinion.value) {
    parts.push('爪牙 1')
  }
  return `狼人陣營 ${evilCardCount} 張：${parts.join(' + ')}`
})
const presetConfigs: PresetConfig[] = [
  {
    key: 'p3',
    label: '3 人',
    roleIds: ['werewolf', 'mystic_wolf', 'seer', 'apprentice_seer', 'witch', 'robber']
  },
  {
    key: 'p4',
    label: '4 人',
    roleIds: ['werewolf', 'mystic_wolf', 'seer', 'apprentice_seer', 'witch', 'robber', 'paranormal_investigator']
  },
  {
    key: 'p5',
    label: '5 人',
    roleIds: [
      'werewolf',
      'mystic_wolf',
      'seer',
      'apprentice_seer',
      'witch',
      'robber',
      'paranormal_investigator',
      'tanner'
    ]
  },
  {
    key: 'p6',
    label: '6 人',
    roleIds: [
      'werewolf',
      'mystic_wolf',
      'seer',
      'apprentice_seer',
      'witch',
      'robber',
      'paranormal_investigator',
      'tanner',
      'insomniac'
    ]
  },
  {
    key: 'p7',
    label: '7 人',
    roleIds: [
      'werewolf',
      'mystic_wolf',
      'seer',
      'apprentice_seer',
      'witch',
      'robber',
      'paranormal_investigator',
      'tanner',
      'sentinel'
    ]
  },
  {
    key: 'p8',
    label: '8 人',
    roleIds: [
      'werewolf',
      'mystic_wolf',
      'seer',
      'apprentice_seer',
      'witch',
      'robber',
      'paranormal_investigator',
      'tanner',
      'sentinel',
      'hunter'
    ]
  },
  {
    key: 'p9-minion',
    label: '9 人（爪牙版）',
    roleIds: [
      'werewolf',
      'mystic_wolf',
      'seer',
      'apprentice_seer',
      'witch',
      'robber',
      'paranormal_investigator',
      'tanner',
      'sentinel',
      'hunter',
      'minion'
    ]
  },
  {
    key: 'p9-villager',
    label: '9 人（村民版）',
    roleIds: [
      'werewolf',
      'mystic_wolf',
      'seer',
      'apprentice_seer',
      'witch',
      'robber',
      'paranormal_investigator',
      'tanner',
      'sentinel',
      'hunter',
      'villager'
    ]
  }
]

const filteredRoles = computed(() => {
  if (roleFilter.value === 'good') {
    return roles.filter((role) => !evilRoleIds.has(role.id))
  }

  if (roleFilter.value === 'evil') {
    return roles.filter((role) => evilRoleIds.has(role.id))
  }

  if (roleFilter.value === 'selected') {
    return roles.filter((role) => selected.value.has(role.id))
  }

  return roles
})

const announcementLines = computed(() => {
  if (selectedRoles.value.length === 0) {
    return ['請先勾選角色，系統會依照喚醒順序生成腳本。']
  }

  const lines: string[] = [nightStartLine.value]
  const announcingRoles = selectedRoles.value.filter(roleNeedsAnnouncement)

  announcingRoles.forEach((role, index) => {
    lines.push(`${index + 1}. ${role.name}`)
    lines.push(role.script)
    if (roleNeedsWakeUp(role)) {
      lines.push(`（倒數 ${role.pauseSeconds} 秒，每秒唸一次）`)
      lines.push(`（倒數內容：${Array.from({ length: role.pauseSeconds }, (_, i) => role.pauseSeconds - i).join('、')}）`)
      lines.push(`請閉上眼睛。（倒數 ${closeEyesSeconds} 秒）`)
      lines.push(`（倒數內容：${Array.from({ length: closeEyesSeconds }, (_, i) => closeEyesSeconds - i).join('、')}）`)
    }
    lines.push('')
  })

  lines.push('夜晚結束，所有玩家請睜開眼睛。')
  return lines
})

const scriptText = computed(() => {
  return announcementLines.value.join('\n').trim()
})

const spokenScriptText = computed(() => {
  if (selectedRoles.value.length === 0) {
    return '請先勾選角色，系統會依照喚醒順序生成腳本。'
  }

  const lines: string[] = [nightStartLine.value]
  const announcingRoles = selectedRoles.value.filter(roleNeedsAnnouncement)

  announcingRoles.forEach((role) => {
    lines.push(role.script)
    if (roleNeedsWakeUp(role)) {
      lines.push(...Array.from({ length: role.pauseSeconds }, (_, i) => String(role.pauseSeconds - i)))
      lines.push('請閉上眼睛。')
      lines.push(...Array.from({ length: closeEyesSeconds }, (_, i) => String(closeEyesSeconds - i)))
    }
  })

  lines.push('夜晚結束，所有玩家請睜開眼睛。')
  return lines.join('\n')
})

function decodeRoleList(raw: string) {
  let normalized = raw.trim()

  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(normalized)
      if (decoded === normalized) {
        break
      }
      normalized = decoded
    } catch {
      break
    }
  }

  normalized = normalized.replace(/%2C/gi, ',')
  return normalized
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

function parseRoleIdsFromUrl(params: URLSearchParams) {
  const roleParams = params.getAll('roles')
  if (roleParams.length > 1) {
    return roleParams.map((id) => id.trim()).filter(Boolean)
  }

  const single = params.get('roles')
  if (!single) {
    return []
  }

  return decodeRoleList(single)
}

function isRoleFilter(value: string | null): value is RoleFilter {
  return value === 'all' || value === 'good' || value === 'evil' || value === 'selected'
}

function syncUrl() {
  const query = new URLSearchParams(window.location.search)
  const ids = Array.from(selected.value).sort()

  query.delete('roles')
  if (ids.length > 0) {
    ids.forEach((id) => query.append('roles', id))
  }
  if (roleFilter.value === 'all') {
    query.delete('filter')
  } else {
    query.set('filter', roleFilter.value)
  }

  const next = `${window.location.pathname}${query.toString() ? `?${query.toString()}` : ''}`
  window.history.replaceState(null, '', next)
}

function restoreFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const valid = new Set(roles.map((role) => role.id))
  const roleIds = parseRoleIdsFromUrl(params)
  selected.value = new Set(roleIds.map((id) => id.trim()).filter((id) => valid.has(id)))

  const filterFromUrl = params.get('filter')
  if (isRoleFilter(filterFromUrl)) {
    roleFilter.value = filterFromUrl
  }
}

function toggleRole(roleId: string, checked: boolean) {
  const next = new Set(selected.value)
  if (checked) {
    next.add(roleId)
  } else {
    next.delete(roleId)
  }
  selected.value = next
}

function applyPreset(preset: PresetConfig) {
  const validIds = new Set(roles.map((role) => role.id))
  selected.value = new Set(preset.roleIds.filter((id) => validIds.has(id)))
  roleFilter.value = 'selected'
}

function getRoleFilterCount(filter: RoleFilter) {
  if (filter === 'all') {
    return roles.length
  }

  if (filter === 'selected') {
    return selectedRoles.value.length
  }

  if (filter === 'good') {
    return roles.filter((role) => !evilRoleIds.has(role.id)).length
  }

  return roles.filter((role) => evilRoleIds.has(role.id)).length
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function sleepWithCancel(ms: number, sessionId: number) {
  const stepMs = 250
  let elapsed = 0
  while (elapsed < ms) {
    if (announceSession.value !== sessionId) {
      return false
    }
    const remaining = Math.min(stepMs, ms - elapsed)
    await sleep(remaining)
    elapsed += remaining
  }
  return announceSession.value === sessionId
}

function roleNeedsWakeUp(role: Role) {
  return role.wakeUpOrder !== null && role.pauseSeconds > 0
}

function roleNeedsAnnouncement(role: Role) {
  return role.wakeUpOrder !== null
}

function getZhVoices(voices: SpeechSynthesisVoice[]) {
  return voices.filter((voice) => voice.lang.toLowerCase().startsWith('zh'))
}

function normalizeVoiceLang(lang: string) {
  return lang.toLowerCase().replace(/_/g, '-')
}

function pickNaturalDefaultZhVoice(voices: SpeechSynthesisVoice[]) {
  const zhVoices = getZhVoices(voices)
  if (zhVoices.length === 0) {
    return voices[0]
  }

  const zhTwOrHant = zhVoices.find((voice) => {
    const normalizedLang = normalizeVoiceLang(voice.lang)
    return normalizedLang.startsWith('zh-tw') || normalizedLang.includes('hant')
  })
  if (zhTwOrHant) {
    return zhTwOrHant
  }

  const preferredKeywords = ['natural', 'premium', 'neural', 'mei-jia', 'xiaoxiao', 'yunxi', 'google']
  const keywordMatch = zhVoices.find((voice) =>
    preferredKeywords.some((keyword) => voice.name.toLowerCase().includes(keyword))
  )
  if (keywordMatch) {
    return keywordMatch
  }

  return zhVoices[0]
}

function refreshVoices() {
  if (!speechSupported) {
    return
  }

  const voices = window.speechSynthesis.getVoices()
  availableVoices.value = voices

  const hasCurrent = voices.some((voice) => voice.voiceURI === selectedVoiceURI.value)
  if (hasCurrent) {
    return
  }

  const naturalVoice = pickNaturalDefaultZhVoice(voices)
  selectedVoiceURI.value = naturalVoice?.voiceURI ?? ''
}

async function countDown(seconds: number, sessionId: number) {
  for (let current = seconds; current >= 1; current -= 1) {
    if (announceSession.value !== sessionId) {
      return false
    }

    const start = performance.now()
    await speak(String(current))
    if (announceSession.value !== sessionId) {
      return false
    }

    const elapsed = performance.now() - start
    const remain = Math.max(0, 1000 - elapsed)
    if (remain > 0) {
      const notCanceled = await sleepWithCancel(remain, sessionId)
      if (!notCanceled) {
        return false
      }
    }
  }

  return true
}

function speak(text: string) {
  return new Promise<void>((resolve) => {
    if (!speechSupported) {
      resolve()
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    const selectedVoice = availableVoices.value.find((voice) => voice.voiceURI === selectedVoiceURI.value)
    if (selectedVoice) {
      utterance.voice = selectedVoice
      utterance.lang = selectedVoice.lang
    } else {
      utterance.lang = 'zh-TW'
    }
    utterance.rate = speechRate.value
    utterance.pitch = speechPitch.value
    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()
    window.speechSynthesis.speak(utterance)
  })
}

async function announce() {
  if (isPlaying.value || selectedRoles.value.length === 0) {
    return
  }

  const sessionId = announceSession.value + 1
  announceSession.value = sessionId
  isPlaying.value = true
  if (speechSupported) {
    window.speechSynthesis.cancel()
  }

  try {
    await speak(nightStartLine.value)
    if (announceSession.value !== sessionId) return
    if (!(await sleepWithCancel(sentencePauseMs, sessionId))) return
    const announcingRoles = selectedRoles.value.filter(roleNeedsAnnouncement)
    for (const role of announcingRoles) {
      if (announceSession.value !== sessionId) return
      await speak(role.script)
      if (announceSession.value !== sessionId) return
      if (!(await sleepWithCancel(sentencePauseMs, sessionId))) return
      if (roleNeedsWakeUp(role)) {
        const notCanceled = await countDown(role.pauseSeconds, sessionId)
        if (!notCanceled) return
        await speak('請閉上眼睛。')
        if (announceSession.value !== sessionId) return
        if (!(await sleepWithCancel(sentencePauseMs, sessionId))) return
        const closeEyesDone = await countDown(closeEyesSeconds, sessionId)
        if (!closeEyesDone) return
      }
    }
    await speak('夜晚結束，所有玩家請睜開眼睛。')
  } finally {
    if (announceSession.value === sessionId) {
      isPlaying.value = false
    }
  }
}

function stopAnnounce() {
  announceSession.value += 1
  isPlaying.value = false
  if (speechSupported) {
    window.speechSynthesis.cancel()
  }
}

async function copyScript() {
  try {
    await navigator.clipboard.writeText(spokenScriptText.value)
    window.alert('腳本已複製到剪貼簿')
  } catch {
    window.alert('複製失敗，請手動複製腳本文字')
  }
}

async function copyRoleOnlyScript() {
  if (selectedRoles.value.length === 0) {
    window.alert('請先勾選角色')
    return
  }

  const announcingRoles = selectedRoles.value.filter(roleNeedsAnnouncement)
  if (announcingRoles.length === 0) {
    window.alert('目前勾選角色都不需要夜間朗讀')
    return
  }

  const roleOnlyText = announcingRoles
    .map((role, index) => `${index + 1}. ${role.name}（${role.pauseSeconds} 秒）\n${role.script}`)
    .join('\n\n')

  try {
    await navigator.clipboard.writeText(roleOnlyText)
    window.alert('角色腳本已複製到剪貼簿')
  } catch {
    window.alert('複製失敗，請手動複製角色腳本文字')
  }
}

async function copyShareUrl() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    window.alert('分享網址已複製到剪貼簿')
  } catch {
    window.alert('複製失敗，請手動複製網址列')
  }
}

watch([selected, roleFilter], syncUrl, { deep: false })
onMounted(() => {
  restoreFromUrl()
  refreshVoices()
  if (speechSupported) {
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices)
  }
})
onUnmounted(() => {
  if (speechSupported) {
    window.speechSynthesis.removeEventListener('voiceschanged', refreshVoices)
  }
})
</script>

<template>
  <main class="mx-auto min-h-screen max-w-4xl p-6">
    <h1 class="mb-2 text-3xl font-bold">一夜終極狼人殺小幫手</h1>
    <p class="mb-6 text-slate-600">勾選角色後，會自動依喚醒順序生成夜晚腳本。</p>

    <section class="mb-6 rounded-lg bg-white p-4 shadow-sm">
      <h2 class="mb-3 text-xl font-semibold">角色選擇</h2>
      <div class="mb-4 rounded-md bg-slate-100 p-3 text-sm text-slate-700">
        <p>目前勾選角色：{{ selectedRoleCount }} 個（實際牌數：{{ selectedCardCount }} 張）</p>
        <p class="mt-1">本局人數：{{ playerCount }} 人（中央 3 張）</p>
        <p class="mt-1">{{ villageTeamSummary }}</p>
        <p class="mt-1">{{ wolfTeamSummary }}</p>
      </div>
      <div class="mb-3">
        <p class="mb-2 text-sm font-medium text-slate-700">快捷配置（3-9 人）</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="preset in presetConfigs"
            :key="preset.key"
            class="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            @click="applyPreset(preset)"
          >
            {{ preset.label }}
          </button>
        </div>
      </div>
      <div class="mb-3 flex flex-wrap gap-2">
        <button
          class="rounded border px-3 py-1.5 text-sm"
          :class="
            roleFilter === 'all'
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-300 bg-white text-slate-700'
          "
          @click="roleFilter = 'all'"
        >
          全部（{{ getRoleFilterCount('all') }}）
        </button>
        <button
          class="rounded border px-3 py-1.5 text-sm"
          :class="
            roleFilter === 'good'
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-300 bg-white text-slate-700'
          "
          @click="roleFilter = 'good'"
        >
          好人（{{ getRoleFilterCount('good') }}）
        </button>
        <button
          class="rounded border px-3 py-1.5 text-sm"
          :class="
            roleFilter === 'evil'
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-300 bg-white text-slate-700'
          "
          @click="roleFilter = 'evil'"
        >
          壞人（{{ getRoleFilterCount('evil') }}）
        </button>
        <button
          class="rounded border px-3 py-1.5 text-sm"
          :class="
            roleFilter === 'selected'
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-300 bg-white text-slate-700'
          "
          @click="roleFilter = 'selected'"
        >
          已勾選（{{ getRoleFilterCount('selected') }}）
        </button>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <label
          v-for="role in filteredRoles"
          :key="role.id"
          class="flex cursor-pointer items-start gap-3 rounded border border-slate-200 p-3 hover:bg-slate-50"
        >
          <input
            class="mt-1"
            type="checkbox"
            :checked="selected.has(role.id)"
            @change="toggleRole(role.id, ($event.target as HTMLInputElement).checked)"
          />
          <span>
            <span class="block font-medium">{{ role.name }}</span>
            <span class="text-sm text-slate-600">{{ role.rules }}</span>
          </span>
        </label>
      </div>
      <p v-if="filteredRoles.length === 0" class="mt-3 text-sm text-slate-500">此篩選下目前沒有角色可顯示。</p>
    </section>

    <section class="rounded-lg bg-white p-4 shadow-sm">
      <div class="mb-3 flex flex-wrap gap-2">
        <button
          class="rounded bg-slate-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="selectedRoles.length === 0 || isPlaying"
          @click="announce"
        >
          開始語音播報
        </button>
        <button
          class="rounded border border-red-300 px-4 py-2 text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!isPlaying"
          @click="stopAnnounce"
        >
          停止播報
        </button>
        <button class="rounded border border-slate-300 px-4 py-2" @click="copyShareUrl">複製分享網址</button>
        <button class="rounded border border-slate-300 px-4 py-2" @click="copyScript">複製完整播報稿</button>
        <button class="rounded border border-slate-300 px-4 py-2" @click="copyRoleOnlyScript">複製角色腳本</button>
      </div>
      <div class="mb-4 rounded-md bg-slate-100 p-3">
        <label class="mb-2 block text-sm font-medium text-slate-700" for="voice-select">語音</label>
        <select
          id="voice-select"
          v-model="selectedVoiceURI"
          class="mb-3 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
          :disabled="availableVoices.length === 0"
        >
          <option v-for="voice in availableVoices" :key="voice.voiceURI" :value="voice.voiceURI">
            {{ voice.name }}（{{ voice.lang }}）
          </option>
        </select>
        <label class="mb-2 block text-sm font-medium text-slate-700" for="speech-rate">
          語速：{{ speechRate.toFixed(1) }}x
        </label>
        <input
          id="speech-rate"
          v-model.number="speechRate"
          class="w-full"
          type="range"
          min="0.6"
          max="1.6"
          step="0.1"
        />
        <label class="mb-2 mt-3 block text-sm font-medium text-slate-700" for="speech-pitch">
          音高：{{ speechPitch.toFixed(1) }}
        </label>
        <input
          id="speech-pitch"
          v-model.number="speechPitch"
          class="w-full"
          type="range"
          min="0.8"
          max="1.4"
          step="0.1"
        />
        <p class="mt-1 text-xs text-slate-500">已加入句子間停頓，倒數仍維持每秒一個數字。</p>
      </div>

      <h2 class="mb-2 text-xl font-semibold">生成腳本</h2>
      <pre class="whitespace-pre-wrap rounded bg-slate-100 p-4 text-sm">{{ scriptText }}</pre>
    </section>

    <p v-if="!speechSupported" class="mt-4 text-sm text-amber-700">
      你的瀏覽器不支援 SpeechSynthesis，仍可使用文字腳本。
    </p>
  </main>
</template>
