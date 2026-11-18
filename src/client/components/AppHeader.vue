<template>
  <header class="mb-4 sm:mb-6 relative z-40">
    <div
      class="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-2xl sm:rounded-3xl p-4 sm:p-8 relative transform hover:scale-[1.02] transition-all duration-200 group shadow-[3px_3px_0px_0px_rgba(6,182,212,0.15)]">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
        <div class="relative">
          <div
            class="absolute bottom-1 left-0 right-0 h-3 sm:h-4 bg-cyan-300 dark:bg-cyan-400/60 opacity-60 transform -rotate-1 group-hover:rotate-1 transition-transform duration-200">
          </div>
          <h1 class="text-2xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2 relative">{{
            t('header.title')
          }}
          </h1>
        </div>

        <!-- 主题和语言切换 -->
        <div class="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <a href="/llms.txt" aria-label="Agent API 使用指南"
            class="min-h-10 px-3 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-lg shadow-[2px_2px_0px_0px_rgba(148,163,184,0.2)] transition-all duration-150 flex items-center justify-center hover:scale-105 active:scale-95 cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-cyan-100 dark:hover:bg-cyan-600 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-semibold">
            Agent
          </a>

          <!-- Github -->
          <a href="https://github.com/flwfdd/ZenGallery" target="_blank" rel="noopener noreferrer" aria-label="GitHub"
            class="w-10 min-h-10 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-lg shadow-[2px_2px_0px_0px_rgba(148,163,184,0.2)] transition-all duration-150 flex items-center justify-center hover:scale-110 active:scale-95 cursor-pointer text-slate-500 dark:text-slate-400 hover:bg-cyan-100 dark:hover:bg-cyan-600 hover:text-slate-700 dark:hover:text-slate-300">
            <svg viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor" aria-hidden="true">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </a>

          <!-- 语言切换器 -->
          <LanguageSwitcher />

          <!-- 主题切换 -->
          <div
            class="bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl sm:rounded-2xl p-1 shadow-[2px_2px_0px_0px_rgba(148,163,184,0.2)]">
            <div class="flex gap-1">
              <button @click="$emit('setTheme', 'light')" :title="t('theme.light')" :aria-label="t('theme.light')"
                :class="theme === 'light' ? 'bg-yellow-200 text-slate-800' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'"
                class="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl transition-all duration-150 flex items-center justify-center hover:scale-110 active:scale-95 cursor-pointer">
                <Sun class="w-4 h-4 transition-transform hover:rotate-12" />
              </button>
              <button @click="$emit('setTheme', 'dark')" :title="t('theme.dark')" :aria-label="t('theme.dark')"
                :class="theme === 'dark' ? 'bg-cyan-700 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'"
                class="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl transition-all duration-150 flex items-center justify-center hover:scale-110 active:scale-95 cursor-pointer">
                <Moon class="w-4 h-4 transition-transform hover:-rotate-12" />
              </button>
              <button @click="$emit('setTheme', 'system')" :title="t('theme.system')" :aria-label="t('theme.system')"
                :class="theme === 'system' ? 'bg-yellow-200 dark:bg-cyan-700 text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'"
                class="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl transition-all duration-150 flex items-center justify-center hover:scale-110 active:scale-95 cursor-pointer">
                <SunMoon class="w-4 h-4 transition-transform hover:scale-110" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Moon, Sun, SunMoon } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import LanguageSwitcher from './LanguageSwitcher.vue';

const { t } = useI18n();

defineProps<{
  theme: 'light' | 'dark' | 'system';
}>();

defineEmits<{
  setTheme: [theme: 'light' | 'dark' | 'system'];
}>();
</script>
