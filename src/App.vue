<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import rolesData from './data/roles.json'

type Role = {
  id: string
  name: string
  wakeUpOrder: number
  script: string
  pauseSeconds: number
  rules: string
}

const roles = [...(rolesData as Role[])].sort((a, b) => a.wakeUpOrder - b.wakeUpOrder)
const selected = ref<Set<string>>(new Set())
const isPlaying = ref(false)
const speechSupported = 'speechSynthesis' in window

const selectedRoles = computed(() =>
  roles.filter((role) => selected.value.has(role.id)).sort((a, b) => a.wakeUpOrder - b.wakeUpOrder)
)

const scriptText = computed(() => {
  if (selectedRoles.value.length === 0) {
    return '請先勾選角色，系統會依照喚醒順序生成腳本。'
  }

  return selectedRoles.value
    .map((role, index) => `${index + 1}. ${role.name}（${role.pauseSeconds} 秒）\n${role.script}`)
    .join('\n\n')
})

function syncUrl() {
  const query = new URLSearchParams(window.location.search)
  const ids = Array.from(selected.value).sort()

  if (ids.length > 0) {
    query.set('roles', ids.join(','))
  } else {
    query.delete('roles')
  }

  const next = `${window.location.pathname}${query.toString() ? `?${query.toString()}` : ''}`
  window.history.replaceState(null, '', next)
}

function restoreFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const fromUrl = params.get('roles')
  if (!fromUrl) {
    return
  }

  const valid = new Set(roles.map((role) => role.id))
  selected.value = new Set(
    fromUrl
      .split(',')
      .map((id) => id.trim())
      .filter((id) => valid.has(id))
  )
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

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function speak(text: string) {
  return new Promise<void>((resolve) => {
    if (!speechSupported) {
      resolve()
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-TW'
    utterance.rate = 1
    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()
    window.speechSynthesis.speak(utterance)
  })
}

async function announce() {
  if (isPlaying.value || selectedRoles.value.length === 0) {
    return
  }

  isPlaying.value = true
  if (speechSupported) {
    window.speechSynthesis.cancel()
  }

  try {
    await speak('夜晚開始，請全部玩家閉上眼睛。')
    for (const role of selectedRoles.value) {
      await speak(role.script)
      if (role.pauseSeconds > 5) {
        await sleep((role.pauseSeconds - 5) * 1000)
      }
      await speak('五，四，三，二，一。')
    }
    await speak('夜晚結束，所有玩家請睜開眼睛。')
  } finally {
    isPlaying.value = false
  }
}

async function copyScript() {
  try {
    await navigator.clipboard.writeText(scriptText.value)
    window.alert('腳本已複製到剪貼簿')
  } catch {
    window.alert('複製失敗，請手動複製腳本文字')
  }
}

watch(selected, syncUrl, { deep: false })
onMounted(restoreFromUrl)
</script>

<template>
  <main class="mx-auto min-h-screen max-w-4xl p-6">
    <h1 class="mb-2 text-3xl font-bold">一夜終極狼人殺小幫手</h1>
    <p class="mb-6 text-slate-600">勾選角色後，會自動依喚醒順序生成夜晚腳本。</p>

    <section class="mb-6 rounded-lg bg-white p-4 shadow-sm">
      <h2 class="mb-3 text-xl font-semibold">角色選擇</h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <label
          v-for="role in roles"
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
    </section>

    <section class="rounded-lg bg-white p-4 shadow-sm">
      <div class="mb-3 flex flex-wrap gap-2">
        <button
          class="rounded bg-slate-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="selectedRoles.length === 0 || isPlaying"
          @click="announce"
        >
          {{ isPlaying ? '播報中...' : '開始語音播報' }}
        </button>
        <button class="rounded border border-slate-300 px-4 py-2" @click="copyScript">複製腳本</button>
      </div>

      <h2 class="mb-2 text-xl font-semibold">生成腳本</h2>
      <pre class="whitespace-pre-wrap rounded bg-slate-100 p-4 text-sm">{{ scriptText }}</pre>
    </section>

    <p v-if="!speechSupported" class="mt-4 text-sm text-amber-700">
      你的瀏覽器不支援 SpeechSynthesis，仍可使用文字腳本。
    </p>
  </main>
</template>
