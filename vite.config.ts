import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const isGithubActions = process.env.GITHUB_ACTIONS === 'true'
const base = isGithubActions && repositoryName ? `/${repositoryName}/` : '/'

export default defineConfig({
  plugins: [vue()],
  base
})
