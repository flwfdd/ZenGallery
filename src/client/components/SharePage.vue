<template>
  <article
    class="relative transform overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-6 text-left w-full lg:p-8 shadow-[6px_6px_0px_0px_rgba(6,182,212,0.15)]">
    <FileDetailsContent :file="file" @showToast="emit('showToast', $event)" />
  </article>
</template>

<script setup lang="ts">
import type { FileMetadata } from '../../common/services';
import FileDetailsContent from './FileDetailsContent.vue';

defineProps<{
  file: FileMetadata;
}>();

const emit = defineEmits<{
  showToast: [message: string];
}>();
</script>
