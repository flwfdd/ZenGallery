<template>
  <TransitionRoot as="template" :show="show">
    <Dialog as="div" class="relative z-50" @close="$emit('close')">
      <TransitionChild as="template" enter="ease-out duration-200" enter-from="opacity-0" enter-to="opacity-100"
        leave="ease-in duration-150" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-slate-900/20 dark:bg-slate-900/40 backdrop-blur-sm" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-2 sm:p-4 text-center sm:items-center">
          <TransitionChild as="template" enter="ease-out duration-200"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-150"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel
              class="relative transform overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-6 text-left sm:my-8 w-full sm:max-w-2xl lg:max-w-5xl lg:p-8 shadow-[6px_6px_0px_0px_rgba(6,182,212,0.15)]">
              <div class="flex items-center justify-between mb-4 sm:mb-8">
                <DialogTitle as="h3"
                  class="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100 relative inline-block">
                  {{ t('fileList.fileInfo') }}
                  <div
                    class="absolute -bottom-1 left-0 right-0 h-1 bg-blue-300 dark:bg-blue-400/60 opacity-60 transform rotate-0.5">
                  </div>
                </DialogTitle>
                <button @click="$emit('close')" :aria-label="t('common.close')"
                  class="w-8 h-8 sm:w-10 sm:h-10 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-600 dark:text-slate-300 rounded-lg sm:rounded-xl border-2 border-slate-300 dark:border-slate-600 transition-all duration-150 flex items-center justify-center hover:scale-110 active:scale-95 hover:rotate-90 cursor-pointer">
                  <X class="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              <FileDetailsContent v-if="file" :file="file" @showToast="emit('showToast', $event)" />
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot
} from '@headlessui/vue';
import { X } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import type { FileMetadata } from '../../common/services';
import FileDetailsContent from './FileDetailsContent.vue';

const { t } = useI18n();

defineProps<{
  show: boolean;
  file: FileMetadata | null;
}>();

const emit = defineEmits<{
  close: [];
  showToast: [message: string];
}>();
</script>
