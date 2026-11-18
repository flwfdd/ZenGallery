<template>
  <div class="file-details">
    <div class="file-details-layout grid grid-cols-1 gap-6 sm:gap-8">
    <div class="min-w-0 space-y-6 sm:space-y-8">
      <!-- 文件预览 -->
      <div v-if="file.mime_type.startsWith('image/')" class="text-center">
        <div
          class="inline-block rounded-xl sm:rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-600 hover:scale-105 hover:ring-4 hover:ring-cyan-200 dark:hover:ring-cyan-700 transition-transform duration-200">
          <img :src="`/files/${file.filename}?level=mid`" :alt="file.title || file.filename"
            class="max-w-full max-h-60 sm:max-h-80 object-contain" />
        </div>
      </div>
      <div v-else-if="file.mime_type.startsWith('video/')" class="text-center">
        <video :src="`/files/${file.filename}`"
          class="rounded-xl sm:rounded-2xl max-w-full mx-auto max-h-60 sm:max-h-80 object-contain" controls />
      </div>
      <div v-else-if="file.mime_type.startsWith('audio/')">
        <audio :src="`/files/${file.filename}`" class="w-full" controls />
      </div>

      <!-- 基本信息 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div v-if="file.title" class="lg:col-span-2 space-y-2">
          <label class="text-sm font-bold text-slate-800 dark:text-slate-200">{{
            t('fileInfo.title')
            }}</label>
          <p class="text-slate-700 dark:text-slate-300 px-3 sm:px-4 py-2 sm:py-3 text-sm">
            {{ file.title }}
          </p>
        </div>
        <div v-if="file.description" class="lg:col-span-2 space-y-2">
          <label class="text-sm font-bold text-slate-800 dark:text-slate-200">{{
            t('fileInfo.description')
            }}</label>
          <p class="text-slate-700 dark:text-slate-300 px-3 sm:px-4 py-2 sm:py-3 text-sm">
            {{ file.description }}
          </p>
        </div>
        <div class="space-y-2">
          <label for="detail-filename" class="text-sm font-bold text-slate-800 dark:text-slate-200">{{
            t('fileList.fileName')
            }}</label>
          <div>
            <input id="detail-filename" readonly :value="file.filename"
              class="w-full min-w-0 rounded-lg sm:rounded-xl border-2 border-slate-200 dark:border-slate-600 focus:outline-none focus:border-cyan-300 dark:focus:border-cyan-500 bg-slate-50 dark:bg-slate-700 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-200" />
          </div>
        </div>
        <div class="space-y-2">
          <label for="detail-mime-type" class="text-sm font-bold text-slate-800 dark:text-slate-200">{{
            t('fileList.mimeType')
            }}</label>
          <div>
            <input id="detail-mime-type" readonly :value="file.mime_type"
              class="w-full min-w-0 rounded-lg sm:rounded-xl border-2 border-slate-200 dark:border-slate-600 focus:outline-none focus:border-cyan-300 dark:focus:border-cyan-500 bg-slate-50 dark:bg-slate-700 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-200" />
          </div>
        </div>
        <div class="space-y-2">
          <label class="text-sm font-bold text-slate-800 dark:text-slate-200">{{
            t('fileList.size')
            }}</label>
          <p class="text-slate-700 dark:text-slate-300 px-3 sm:px-4 py-2 sm:py-3 text-sm">
            {{ formatFileSize(file.size) }}
          </p>
        </div>
        <div class="space-y-2">
          <label class="text-sm font-bold text-slate-800 dark:text-slate-200">{{
            t('fileList.uploadTime')
            }}</label>
          <p class="text-slate-700 dark:text-slate-300 px-3 sm:px-4 py-2 sm:py-3 text-sm">
            {{ formatDate(file.uploaded_at, t('common.dateLocale')) }}
          </p>
        </div>
      </div>

    </div>

    <div class="min-w-0">
      <!-- 分享链接 -->
      <div>
        <h4 class="flex items-center gap-3 text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 sm:mb-6">
          <div
            class="w-6 h-6 sm:w-8 sm:h-8 bg-violet-200 dark:bg-violet-600/50 rounded-lg sm:rounded-xl flex items-center justify-center transform -rotate-16 hover:rotate-0 transition-transform duration-200">
            <Link class="w-4 h-4 sm:w-5 sm:h-5 text-violet-700 dark:text-violet-300" />
          </div>
          {{ t('fileList.shareLinks') }}
        </h4>
        <div class="space-y-3 sm:space-y-4">
          <!-- 分享页 -->
          <div class="space-y-2">
            <label for="share-page-link" class="text-sm font-bold text-slate-800 dark:text-slate-200">{{
              t('fileList.sharePage') }}</label>
            <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <input id="share-page-link" readonly :value="`${currentOrigin}/share/${file.filename}`"
                class="flex-1 min-w-0 rounded-lg sm:rounded-xl border-2 border-slate-200 dark:border-slate-600 focus:outline-none focus:border-cyan-300 dark:focus:border-cyan-500 bg-slate-50 dark:bg-slate-700 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-200" />
              <div class="flex gap-2 sm:gap-3">
                <button @click="openInNewTab(`${currentOrigin}/share/${file.filename}`)"
                  class="flex-1 sm:flex-none bg-cyan-200 dark:bg-cyan-600 hover:bg-cyan-400 dark:hover:bg-cyan-500 text-cyan-800 dark:text-cyan-100 font-semibold px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border-2 border-cyan-400 dark:border-cyan-500 transition-all duration-150 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 cursor-pointer shadow-[2px_2px_0px_0px_rgba(6,182,212,0.2)] text-xs sm:text-sm">
                  <ExternalLink class="w-3 h-3 sm:w-4 sm:h-4" />
                  {{ t('fileList.open') }}
                </button>
                <button @click="copyToClipboard(`${currentOrigin}/share/${file.filename}`, t('fileList.sharePage'))"
                  class="flex-1 sm:flex-none bg-cyan-200 dark:bg-cyan-600 hover:bg-cyan-400 dark:hover:bg-cyan-500 text-cyan-800 dark:text-cyan-100 font-semibold px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border-2 border-cyan-400 dark:border-cyan-500 transition-all duration-150 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 cursor-pointer shadow-[2px_2px_0px_0px_rgba(6,182,212,0.2)] text-xs sm:text-sm">
                  <Copy class="w-3 h-3 sm:w-4 sm:h-4" />
                  {{ t('fileList.copy') }}
                </button>
              </div>
            </div>
          </div>

          <!-- 原始文件 -->
          <div class="space-y-2">
            <label for="original-file-link" class="text-sm font-bold text-slate-800 dark:text-slate-200">{{
              t('fileList.originalFile') }}</label>
            <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <input id="original-file-link" readonly :value="`${currentOrigin}/files/${file.filename}`"
                class="flex-1 min-w-0 rounded-lg sm:rounded-xl border-2 border-slate-200 dark:border-slate-600 focus:outline-none focus:border-cyan-300 dark:focus:border-cyan-500 bg-slate-50 dark:bg-slate-700 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-200" />
              <div class="flex gap-2 sm:gap-3">
                <button @click="openInNewTab(`${currentOrigin}/files/${file.filename}`)"
                  class="flex-1 sm:flex-none bg-cyan-200 dark:bg-cyan-600 hover:bg-cyan-400 dark:hover:bg-cyan-500 text-cyan-800 dark:text-cyan-100 font-semibold px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border-2 border-cyan-400 dark:border-cyan-500 transition-all duration-150 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 cursor-pointer shadow-[2px_2px_0px_0px_rgba(6,182,212,0.2)] text-xs sm:text-sm">
                  <ExternalLink class="w-3 h-3 sm:w-4 sm:h-4 hover:rotate-12 transition-transform duration-200" />
                  {{ t('fileList.open') }}
                </button>
                <button
                  @click="copyToClipboard(`${currentOrigin}/files/${file.filename}`, t('fileList.originalFileLink'))"
                  class="flex-1 sm:flex-none bg-cyan-200 dark:bg-cyan-600 hover:bg-cyan-400 dark:hover:bg-cyan-500 text-cyan-800 dark:text-cyan-100 font-semibold px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border-2 border-cyan-400 dark:border-cyan-500 transition-all duration-150 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 cursor-pointer shadow-[2px_2px_0px_0px_rgba(6,182,212,0.2)] text-xs sm:text-sm">
                  <Copy class="w-3 h-3 sm:w-4 sm:h-4 hover:rotate-12 transition-transform duration-200" />
                  {{ t('fileList.copy') }}
                </button>
              </div>
            </div>
          </div>

          <!-- 压缩版本 -->
          <div v-if="file.mime_type.startsWith('image/')" class="space-y-3 sm:space-y-4">
            <div v-for="(level, label) in compressionLevels" :key="level" class="space-y-2">
              <label :for="`compression-${level}`" class="text-sm font-bold text-slate-800 dark:text-slate-200">{{
                label }}</label>
              <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <input :id="`compression-${level}`" readonly :value="`${currentOrigin}/files/${file.filename}?level=${level}`"
                  class="flex-1 min-w-0 rounded-lg sm:rounded-xl border-2 border-slate-200 dark:border-slate-600 focus:outline-none focus:border-cyan-300 dark:focus:border-cyan-500 bg-slate-50 dark:bg-slate-700 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-200" />
                <button
                  @click="copyToClipboard(`${currentOrigin}/files/${file.filename}?level=${level}`, `${label} ${t('fileList.link')}`)"
                  class="bg-cyan-200 dark:bg-cyan-600 hover:bg-cyan-400 dark:hover:bg-cyan-500 text-cyan-800 dark:text-cyan-100 font-semibold px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border-2 border-cyan-400 dark:border-cyan-500 transition-all duration-150 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 cursor-pointer shadow-[2px_2px_0px_0px_rgba(6,182,212,0.2)] text-xs sm:text-sm w-full sm:w-auto">
                  <Copy class="w-3 h-3 sm:w-4 sm:h-4 hover:rotate-12 transition-transform duration-200" />
                  {{ t('fileList.copy') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
import { Copy, ExternalLink, Link } from '@lucide/vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatDate, formatFileSize } from '../../common/format';
import type { FileMetadata } from '../../common/services';

defineProps<{
  file: FileMetadata;
}>();

const emit = defineEmits<{
  showToast: [message: string];
}>();

const { t } = useI18n();
const currentOrigin = window.location.origin;
const compressionLevels = computed(() => ({
  [t('fileList.lowQuality')]: 'low',
  [t('fileList.midQuality')]: 'mid',
  [t('fileList.highQuality')]: 'high'
}));

const openInNewTab = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

const copyToClipboard = async (text: string, type: string) => {
  try {
    await navigator.clipboard.writeText(text);
    emit('showToast', `${type}${t('fileList.copySuccess')}`);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    emit('showToast', t('fileList.copyFailed'));
  }
};
</script>
