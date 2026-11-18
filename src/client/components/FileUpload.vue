<template>
  <section class="mb-6 sm:mb-12">
    <div
      class="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-2xl sm:rounded-3xl p-4 sm:p-8 transform hover:scale-[1.01] transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(6,182,212,0.12)]">
      <div class="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 sm:mb-6 relative inline-block">
        <div
          class="absolute bottom-2 left-0 right-0 h-2 bg-cyan-300 dark:bg-cyan-400/60 opacity-60 transform -rotate-1">
        </div>
        <h2 class="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 relative">{{ t('upload.title')
          }}
        </h2>
      </div>

      <!-- 上传拖拽区域 -->
      <div v-if="!isUploading" class="mb-4 sm:mb-6">
        <label @dragover.prevent="handleDragOver" @dragleave.prevent="handleDragLeave" @drop.prevent="handleFileDrop"
          class="block cursor-pointer group">
          <input ref="fileInput" type="file" @change="handleFileChange" multiple accept="*/*" class="sr-only" />
          <div
            class="border-3 border-dashed transition-all duration-200 rounded-2xl p-6 sm:p-12 text-center group-hover:scale-[1.02]"
            :class="isDragOver
              ? 'border-cyan-400 dark:border-cyan-400 bg-cyan-100 dark:bg-cyan-900/40 scale-[1.02]'
              : 'border-cyan-200 dark:border-cyan-400/50 bg-cyan-50 dark:bg-cyan-900/20 group-hover:border-cyan-300 dark:group-hover:border-cyan-400/70 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/30'">
            <div
              class="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl mb-3 sm:mb-4 transform group-hover:rotate-6 group-hover:scale-110 transition-all duration-200"
              :class="isDragOver
                ? 'bg-cyan-300 dark:bg-cyan-600/70 rotate-6 scale-110'
                : 'bg-cyan-200 dark:bg-cyan-600/50'">
              <Upload class="w-6 h-6 sm:w-8 sm:h-8 text-cyan-700 dark:text-cyan-300" />
            </div>
            <p class="text-base sm:text-lg font-semibold mb-2 transition-colors duration-200" :class="isDragOver
              ? 'text-cyan-800 dark:text-cyan-200'
              : 'text-slate-800 dark:text-slate-200 group-hover:text-cyan-800 dark:group-hover:text-cyan-300'">
              {{ isDragOver
                ? t('upload.dropFiles')
                : (selectedFiles.length > 0 ? t('upload.addMoreFiles') : t('upload.dropzone')) }}</p>
            <p class="text-sm sm:text-base text-slate-600 dark:text-slate-400">{{
              t('upload.dropzoneSubtitle', { maxSize: formatFileSize(MAX_UPLOAD_SIZE) })
            }}</p>
          </div>
        </label>
      </div>

      <!-- 选中的文件列表 -->
      <div v-if="selectedFiles.length > 0" class="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
        <div v-for="(file, index) in selectedFiles" :key="`${file.name}-${file.lastModified}-${index}`"
          class="bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-2xl p-4 sm:p-6 shadow-[2px_2px_0px_0px_rgba(148,163,184,0.15)]">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <div
                class="w-10 h-10 sm:w-12 sm:h-12 bg-rose-200 dark:bg-rose-600/50 rounded-xl flex items-center justify-center flex-shrink-0">
                <component :is="getFileIcon(index)" :class="{ 'animate-spin': fileStatuses[index] === 'uploading' }"
                  class="w-5 h-5 sm:w-6 sm:h-6 text-rose-700 dark:text-rose-300" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-slate-800 dark:text-slate-200 text-sm sm:text-base truncate">{{ file.name
                  }}</p>
                <p class="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">{{ formatFileSize(file.size) }}
                </p>
              </div>
            </div>
            <button v-if="!isUploading" @click="removeFile(index)" :title="t('upload.remove')" :aria-label="`${t('upload.remove')}: ${file.name}`"
              class="w-8 h-8 bg-red-200 dark:bg-red-600/50 hover:bg-red-300 dark:hover:bg-red-500 text-red-700 dark:text-red-300 rounded-lg border-2 border-red-300 dark:border-red-500 transition-all duration-150 flex items-center justify-center hover:scale-110 active:scale-95 cursor-pointer flex-shrink-0 ml-2">
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- 文件上传进度条 -->
          <div v-if="isUploading && fileProgresses[index] !== undefined" class="space-y-2">
            <div class="flex items-center justify-between text-xs sm:text-sm">
              <span class="text-slate-600 dark:text-slate-400 truncate">{{ getUploadStatusText(index) }}</span>
              <span class="font-semibold text-slate-700 dark:text-slate-300 ml-2">{{
                Math.round(fileProgresses[index]) }}%</span>
            </div>
            <progress :value="fileProgresses[index]" max="100" :data-status="fileStatuses[index]"
              :aria-label="`${file.name}: ${getUploadStatusText(index)}`"
              class="upload-progress block w-full h-2"></progress>
          </div>
        </div>

        <!-- 总体上传进度 -->
        <div v-if="isUploading" class="mb-4 sm:mb-6">
          <div
            class="bg-slate-100 dark:bg-slate-600 border-2 border-slate-200 dark:border-slate-500 rounded-2xl p-4 sm:p-6">
            <div class="space-y-3 sm:space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                <div>
                  <h3 class="font-semibold text-slate-800 dark:text-slate-200 text-sm sm:text-base">{{
                    t('upload.uploadProgress') }}</h3>
                  <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">
                    {{ t('upload.currentFile') }}: {{ currentUploadingFile }}
                  </p>
                </div>
                <div class="text-left sm:text-right">
                  <div class="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200">
                    {{ Math.round(overallProgress) }}%
                  </div>
                  <div class="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    {{ completedFiles }} / {{ selectedFiles.length }} {{ t('fileList.files') }}
                  </div>
                </div>
              </div>
              <progress :value="overallProgress" max="100" :aria-label="t('upload.uploadProgress')"
                class="upload-progress block w-full h-3"></progress>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-0">
          <button v-if="!isUploading" @click="clearAllFiles"
            class="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 font-medium px-4 py-3 rounded-2xl border-2 border-slate-300 dark:border-slate-600 transition-all duration-150 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 cursor-pointer shadow-[2px_2px_0px_0px_rgba(148,163,184,0.2)] w-full sm:w-auto">
            <X class="w-4 h-4" />
            {{ t('upload.clearAll') }}
          </button>
          <div v-else class="hidden sm:block"></div>

          <button @click="uploadFiles" :disabled="isUploading"
            class="bg-cyan-300 dark:bg-cyan-600 hover:bg-cyan-400 dark:hover:bg-cyan-500 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold px-6 sm:px-8 py-3 rounded-2xl border-2 border-cyan-400 dark:border-cyan-500 disabled:border-slate-400 dark:disabled:border-slate-600 transition-all duration-150 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 disabled:hover:scale-100 cursor-pointer shadow-[3px_3px_0px_0px_rgba(6,182,212,0.2)] w-full sm:w-auto">
            <component :is="isUploading ? LoaderCircle : Upload"
              :class="{ 'animate-spin': isUploading, 'animate-bounce': !isUploading }" class="w-5 h-5" />
            <span class="truncate">{{ isUploading ? t('upload.uploading') : t('upload.uploadButton', {
              count: selectedFiles.length
            }) }}</span>
          </button>
        </div>
      </div>

      <!-- 上传结果 -->
      <div v-if="uploadResults.length > 0" class="space-y-3">
        <div v-for="(result, index) in uploadResults" :key="index"
          class="rounded-2xl p-3 sm:p-4 border-2 shadow-[2px_2px_0px_0px_rgba(148,163,184,0.1)]"
          :class="'error' in result ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-600/50' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-600/50'">
          <div v-if="!('error' in result) && 'url' in result" class="flex items-start gap-3">
            <div
              class="w-5 h-5 sm:w-6 sm:h-6 bg-green-200 dark:bg-green-600/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle class="w-3 h-3 sm:w-4 sm:h-4 text-green-700 dark:text-green-300" />
            </div>
            <p class="font-medium text-green-800 dark:text-green-200 text-xs sm:text-sm">{{ `${t('upload.success')} -
              ${result.message}` }}</p>
          </div>
          <div v-else class="flex items-start gap-3">
            <div
              class="w-5 h-5 sm:w-6 sm:h-6 bg-red-200 dark:bg-red-600/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <XCircle class="w-3 h-3 sm:w-4 sm:h-4 text-red-700 dark:text-red-300" />
            </div>
            <div class="min-w-0">
              <p class="font-medium text-red-800 dark:text-red-200 text-xs sm:text-sm">{{ `${t('upload.error')} -
                ${result.error}` }}
              </p>
              <p v-if="result.details" class="text-red-700 dark:text-red-300 text-xs break-words">{{ result.details }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { hc } from 'hono/client';
import { createSHA256 } from 'hash-wasm';
import { Check, CheckCircle, File, LoaderCircle, Upload, X, XCircle } from '@lucide/vue';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { AppType } from '../../api/index';
import { MAX_SINGLE_UPLOAD_SIZE, MAX_UPLOAD_SIZE, MULTIPART_CHUNK_SIZE } from '../../common/files';
import { formatFileSize } from '../utils/format';
import { responseError, xhrErrorMessage } from '../utils/http';

const { t } = useI18n();
const client = hc<AppType>('/');

const emit = defineEmits<{
  uploadComplete: [];
  showToast: [message: string];
  authenticationRequired: [];
}>();

interface UploadResult {
  message?: string;
  url?: string;
  exists?: boolean;
  duplicate?: boolean;
  error?: string;
  details?: string;
  filename?: string;
}

type UploadedPart = { partNumber: number; etag: string };
type PartResult = UploadedPart | { error: Error };

class UploadHttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const asError = (error: unknown): Error => error instanceof Error ? error : new Error(String(error));

// 文件上传相关状态
const fileInput = ref<HTMLInputElement>();
const selectedFiles = ref<File[]>([]);
const isUploading = ref(false);
const uploadResults = ref<UploadResult[]>([]);

// 简化的进度追踪状态
const fileProgresses = ref<Record<number, number>>({});
const fileStatuses = ref<Record<number, 'waiting' | 'hashing' | 'uploading' | 'completed' | 'error' | 'duplicate'>>({});
const currentUploadingFile = ref('');
const completedFiles = ref(0);

// 计算总体进度
const overallProgress = computed(() => {
  if (selectedFiles.value.length === 0) return 0;
  const totalProgress = Object.values(fileProgresses.value).reduce((sum, progress) => sum + progress, 0);
  return totalProgress / selectedFiles.value.length;
});

// 获取文件图标
const getFileIcon = (index: number) => {
  const status = fileStatuses.value[index];
  if (status === 'hashing' || status === 'uploading') return LoaderCircle;
  if (status === 'completed') return Check;
  if (status === 'error') return XCircle;
  return File;
};

// 获取上传状态文本
const getUploadStatusText = (index: number) => {
  const status = fileStatuses.value[index];
  switch (status) {
    case 'waiting': return t('upload.waiting');
    case 'hashing': return t('upload.hashing');
    case 'uploading': return t('upload.uploading');
    case 'completed': return t('upload.completed');
    case 'error': return t('upload.error');
    case 'duplicate': return t('upload.duplicate');
    default: return '';
  }
};

// 文件选择处理
const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const newFiles = Array.from(target.files);
    processNewFiles(newFiles);
  }
  // 清理input的value，确保可以重复选择相同文件
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

// 移除单个文件
const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1);
  uploadResults.value = [];
  fileProgresses.value = {};
  fileStatuses.value = {};
  completedFiles.value = 0;
  if (selectedFiles.value.length === 0 && fileInput.value) {
    fileInput.value.value = '';
  }
};

// 清空所有文件
const clearAllFiles = () => {
  selectedFiles.value = [];
  uploadResults.value = [];
  fileProgresses.value = {};
  fileStatuses.value = {};
  completedFiles.value = 0;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

// 并发控制器类
class ConcurrentUploadController {
  private maxConcurrency: number;
  private taskQueue: Array<() => Promise<UploadedPart>> = [];
  private totalTasks: number = 0;
  private progressCallback?: (progress: number) => void;
  private partialProgresses: Map<number, number> = new Map(); // 存储每个任务的部分进度

  constructor(maxConcurrency: number = 3) {
    this.maxConcurrency = maxConcurrency;
  }

  // 添加任务到队列（生产者）
  addTask(task: () => Promise<UploadedPart>, taskId: number) {
    this.taskQueue.push(task);
    this.totalTasks++;
    this.partialProgresses.set(taskId, 0);
  }

  // 设置进度回调
  setProgressCallback(callback: (progress: number) => void) {
    this.progressCallback = callback;
  }

  // 更新特定任务的部分进度
  updatePartialProgress(taskId: number, progress: number) {
    this.partialProgresses.set(taskId, progress);
    this.updateTotalProgress();
  }

  // 更新总进度（线程安全）
  private updateTotalProgress() {
    if (this.progressCallback && this.totalTasks > 0) {
      // 计算所有任务的总进度（每个任务的进度范围是0-1）
      let totalProgress = 0;

      for (const partialProgress of this.partialProgresses.values()) {
        totalProgress += partialProgress;
      }

      const progressPercentage = (totalProgress / this.totalTasks) * 100;
      this.progressCallback(Math.min(progressPercentage, 99)); // 留1%给完成步骤
    }
  }

  // 标记任务完成
  markTaskCompleted(taskId: number) {
    this.partialProgresses.set(taskId, 1); // 完成的任务进度为1
    this.updateTotalProgress();
  }

  // 启动工作者（消费者）
  async startWorkers(): Promise<PartResult[]> {
    const results: PartResult[] = [];
    const workers: Promise<void>[] = [];

    // 启动工作者
    for (let i = 0; i < Math.min(this.maxConcurrency, this.taskQueue.length); i++) {
      workers.push(this.worker(results));
    }

    // 等待所有工作者完成
    await Promise.all(workers);
    return results;
  }

  // 工作者函数
  private async worker(results: PartResult[]) {
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      if (!task) break;

      try {
        const result = await task();
        results.push(result);
      } catch (error) {
        results.push({ error: asError(error) });
      }
    }
  }
}

// 单个文件上传函数：计算 SHA-256 并预检，确认需要上传后按大小选择上传方式
const uploadSingleFile = async (file: File, index: number): Promise<UploadResult> => {
  try {
    fileStatuses.value[index] = 'hashing';
    fileProgresses.value[index] = 0;
    const hash = await calculateFileHash(file, (progress) => {
      fileProgresses.value[index] = progress * 10;
    });

    const checkResponse = await client.api.files.check.$post({
      json: {
        filename: file.name,
        hash,
        mime_type: file.type || 'application/octet-stream',
        size: file.size,
      },
    });
    if (!checkResponse.ok) {
      throw new UploadHttpError(
        await responseError(checkResponse, 'Failed to check file'),
        checkResponse.status,
      );
    }

    const checkData = await checkResponse.json();
    if ('exists' in checkData && checkData.exists) {
      fileProgresses.value[index] = 100;
      fileStatuses.value[index] = 'duplicate';
      completedFiles.value++;
      return checkData;
    }

    fileStatuses.value[index] = 'uploading';
    return file.size > MAX_SINGLE_UPLOAD_SIZE
      ? await uploadFileMultipart(file, index, hash)
      : await uploadFileSingle(file, index, hash);
  } catch (error) {
    fileStatuses.value[index] = 'error';
    throw error;
  }
};

// 单次上传实现
const uploadFileSingle = (file: File, index: number, hash: string): Promise<UploadResult> => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('hash', hash);

    const xhr = new XMLHttpRequest();

    // 上传进度处理
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        fileProgresses.value[index] = 10 + progress * 0.9;
      }
    });

    // 完成处理
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText) as UploadResult;
          fileProgresses.value[index] = 100;

          // 检查是否是重复文件
          if (response.exists || response.duplicate) {
            fileStatuses.value[index] = 'duplicate';
          } else {
            fileStatuses.value[index] = 'completed';
          }

          completedFiles.value++;
          resolve(response);
        } catch {
          fileStatuses.value[index] = 'error';
          reject(new Error('Invalid response format'));
        }
      } else {
        fileStatuses.value[index] = 'error';
        reject(new UploadHttpError(
          xhrErrorMessage(xhr, `HTTP ${xhr.status}: ${xhr.statusText}`),
          xhr.status,
        ));
      }
    });

    // 错误处理
    xhr.addEventListener('error', () => {
      fileStatuses.value[index] = 'error';
      reject(new UploadHttpError('Network error during upload', 0));
    });

    // 中断处理
    xhr.addEventListener('abort', () => {
      fileStatuses.value[index] = 'error';
      reject(new Error('Upload was aborted'));
    });

    xhr.open('POST', '/api/files');
    xhr.send(formData);
  });
};

// 上传单个分片（支持部分进度回调）
const uploadPart = async (
  chunk: Blob,
  uploadId: string,
  key: string,
  partNumber: number,
  onPartProgress?: (progress: number) => void
): Promise<UploadedPart> => {
  return new Promise((resolve, reject) => {
    const url = `/api/files/multipart/upload?upload_id=${encodeURIComponent(uploadId)}&key=${encodeURIComponent(key)}&part_number=${partNumber}`;
    const xhr = new XMLHttpRequest();

    // 上传进度处理
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onPartProgress) {
        const progress = (event.loaded / event.total) * 100;
        onPartProgress(progress / 100); // 转换为0-1的小数
      }
    });

    // 完成处理
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText) as UploadedPart;
          resolve(response);
        } catch {
          reject(new Error('Invalid response format'));
        }
      } else {
        reject(new UploadHttpError(
          xhrErrorMessage(xhr, `HTTP ${xhr.status}: ${xhr.statusText}`),
          xhr.status,
        ));
      }
    });

    // 错误处理
    xhr.addEventListener('error', () => {
      reject(new UploadHttpError('Network error during part upload', 0));
    });

    // 中断处理
    xhr.addEventListener('abort', () => {
      reject(new Error('Part upload was aborted'));
    });

    xhr.open('PUT', url);
    xhr.send(chunk);
  });
};

// 分片上传函数
const uploadFileMultipart = async (file: File, index: number, hash: string): Promise<UploadResult> => {
  let uploadId: string | undefined;
  let key: string | undefined;
  try {
    // 1. 创建分片上传
    const createResponse = await client.api.files.multipart.create.$post({
      json: {
        filename: file.name,
        hash: hash,
        mime_type: file.type || 'application/octet-stream',
        size: file.size,
      },
    });

    if (!createResponse.ok) {
      throw new UploadHttpError(
        await responseError(createResponse, 'Failed to create multipart upload'),
        createResponse.status,
      );
    }

    const createData = await createResponse.json();

    // 检查是否是重复文件
    if ('exists' in createData && createData.exists) {
      fileProgresses.value[index] = 100;
      fileStatuses.value[index] = 'duplicate';
      completedFiles.value++;
      return createData;
    }

    // 计算分片数量
    const totalParts = Math.ceil(file.size / MULTIPART_CHUNK_SIZE);

    // 2. 使用并发控制器进行并行上传
    if ('upload_id' in createData && 'key' in createData) {
      uploadId = createData.upload_id;
      key = createData.key;
    } else {
      throw new Error('Invalid response format');
    }

    // 创建并发控制器（最多3个并发）
    const uploadController = new ConcurrentUploadController(3);

    // 设置进度回调
    uploadController.setProgressCallback((progress) => {
      fileProgresses.value[index] = 10 + progress * 0.9;
    });

    // 生产者：将所有分片任务加入队列
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * MULTIPART_CHUNK_SIZE;
      const end = Math.min(start + MULTIPART_CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);


      // 创建上传任务
      const uploadTask = () => {
        return new Promise<{ partNumber: number; etag: string }>((resolve, reject) => {
          uploadPart(chunk, uploadId!, key!, partNumber, (partProgress) => {
            // 更新这个分片的进度（0-1范围）
            uploadController.updatePartialProgress(partNumber, partProgress);
          })
            .then(result => {
              // 标记任务完成
              uploadController.markTaskCompleted(partNumber);
              resolve(result);
            })
            .catch(reject);
        });
      };

      uploadController.addTask(uploadTask, partNumber);
    }

    // 消费者：启动工作者开始并发上传
    const results = await uploadController.startWorkers();

    // 检查是否有错误
    const errors = results.filter((result): result is { error: Error } => 'error' in result);
    if (errors.length > 0) {
      throw new Error(`Failed to upload ${errors.length} parts: ${errors[0].error.message}`);
    }

    // 提取上传结果
    const uploadedParts = results.filter((result): result is UploadedPart => !('error' in result));

    // 3. 完成分片上传
    const completeResponse = await client.api.files.multipart.complete.$post({
      json: {
        filename: file.name,
        hash: hash,
        upload_id: uploadId,
        parts: uploadedParts.sort((a, b) => a.partNumber - b.partNumber),
        mime_type: file.type || 'application/octet-stream',
        size: file.size,
      },
    });

    if (!completeResponse.ok) {
      throw new UploadHttpError(
        await responseError(completeResponse, 'Failed to complete multipart upload'),
        completeResponse.status,
      );
    }

    const result = await completeResponse.json() as UploadResult;

    fileProgresses.value[index] = 100;

    // 检查是否是重复文件
    if (result.exists || result.duplicate) {
      fileStatuses.value[index] = 'duplicate';
    } else {
      fileStatuses.value[index] = 'completed';
    }

    completedFiles.value++;

    return result;

  } catch (error) {
    console.error(`Multipart upload failed for ${file.name}:`, error);
    fileStatuses.value[index] = 'error';

    // 尝试中止分片上传
    try {
      if (uploadId && key) {
        await client.api.files.multipart.abort.$delete({
          query: {
            upload_id: uploadId,
            key,
          },
        });
      }
    } catch (abortError) {
      console.error('Failed to abort multipart upload:', abortError);
    }

    throw error;
  }
};

// 批量上传文件
const uploadFiles = async () => {
  if (selectedFiles.value.length === 0) {
    emit('showToast', t('errors.uploadFailed'));
    return;
  }

  isUploading.value = true;
  uploadResults.value = [];
  fileProgresses.value = {};
  fileStatuses.value = {};
  completedFiles.value = 0;

  // 初始化所有文件状态
  selectedFiles.value.forEach((_, index) => {
    fileProgresses.value[index] = 0;
    fileStatuses.value[index] = 'waiting';
  });

  // 逐个上传文件
  let authenticationInterrupted = false;
  for (let i = 0; i < selectedFiles.value.length; i++) {
    const file = selectedFiles.value[i];
    currentUploadingFile.value = file.name;

    try {
      const result = await uploadSingleFile(file, i);
      uploadResults.value.push(result);
    } catch (error) {
      console.error('Upload error:', error);
      const uploadError = asError(error);
      uploadResults.value.push({
        error: t('upload.error'),
        details: uploadError.message,
        filename: file.name
      });
      if (error instanceof UploadHttpError && (error.status === 401 || error.status === 503)) {
        authenticationInterrupted = true;
        if (error.status === 401) emit('authenticationRequired');
        emit('showToast', uploadError.message);
        break;
      }
    }

  }

  isUploading.value = false;
  currentUploadingFile.value = '';

  if (authenticationInterrupted) {
    return;
  }

  // 上传完成后通知父组件
  emit('uploadComplete');

  // 显示完成提示
  const successCount = uploadResults.value.filter(result => !('error' in result)).length;
  const duplicateCount = uploadResults.value.filter(result => result.exists || result.duplicate).length;
  const uploadedCount = successCount - duplicateCount;
  const totalCount = selectedFiles.value.length;

  let message: string;
  if (uploadedCount > 0 && duplicateCount > 0) {
    message = t('upload.completedWithDuplicates', { uploaded: uploadedCount, duplicates: duplicateCount });
  } else if (uploadedCount > 0) {
    message = t('upload.success') + ` ${uploadedCount} ${t('fileList.files')}`;
  } else if (duplicateCount > 0) {
    message = t('upload.allDuplicates', { count: duplicateCount });
  } else {
    message = `${t('upload.success')}: ${successCount}, ${t('upload.error')}: ${totalCount - successCount}`;
  }

  emit('showToast', message);

  // 清空选择的文件
  selectedFiles.value = [];
  fileProgresses.value = {};
  fileStatuses.value = {};
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

// 工具函数
// 计算文件指纹
const calculateFileHash = async (file: File, onProgress: (progress: number) => void): Promise<string> => {
  const hasher = await createSHA256();
  hasher.init();
  const hashChunkSize = 8 * 1024 * 1024;

  for (let offset = 0; offset < file.size; offset += hashChunkSize) {
    const chunk = file.slice(offset, Math.min(offset + hashChunkSize, file.size));
    hasher.update(new Uint8Array(await chunk.arrayBuffer()));
    onProgress(Math.min((offset + chunk.size) / file.size, 1));
  }

  return hasher.digest('hex');
};

// 通用文件处理函数
const processNewFiles = (newFiles: File[]) => {
  // 过滤掉大于 MAX_UPLOAD_SIZE 的文件和显示相应提示
  const validFiles: File[] = [];
  const oversizedFiles: File[] = [];
  const largeFiles: File[] = [];

  newFiles.forEach(file => {
    if (file.size > MAX_UPLOAD_SIZE) {
      oversizedFiles.push(file);
    } else if (file.size > MAX_SINGLE_UPLOAD_SIZE) {
      largeFiles.push(file);
      validFiles.push(file); // 大文件仍然可以上传，但会使用分片上传
    } else {
      validFiles.push(file);
    }
  });

  // 显示文件过滤和提示信息
  if (oversizedFiles.length > 0) {
    const oversizedNames = oversizedFiles.map(f => `${f.name} (${formatFileSize(f.size)})`).join(', ');
    emit('showToast', t('upload.filesFilteredBySize', {
      count: oversizedFiles.length,
      files: oversizedNames,
      maxSize: formatFileSize(MAX_UPLOAD_SIZE)
    }));
  }

  if (largeFiles.length > 0) {
    const largeNames = largeFiles.map(f => `${f.name} (${formatFileSize(f.size)})`).join(', ');
    emit('showToast', t('upload.largeFilesWillUseMultipart', {
      count: largeFiles.length,
      files: largeNames,
      threshold: formatFileSize(MAX_SINGLE_UPLOAD_SIZE)
    }));
  }

  if (validFiles.length === 0) {
    return; // 没有有效文件，直接返回
  }

  // 如果已有文件，则添加新文件；否则直接替换
  if (selectedFiles.value.length > 0) {
    // 检查重复文件（基于文件名和大小）
    const existingFileKeys = new Set(
      selectedFiles.value.map(f => `${f.name}-${f.size}-${f.lastModified}`)
    );

    const uniqueNewFiles = validFiles.filter(f =>
      !existingFileKeys.has(`${f.name}-${f.size}-${f.lastModified}`)
    );

    const duplicateCount = validFiles.length - uniqueNewFiles.length;

    if (uniqueNewFiles.length > 0) {
      selectedFiles.value = [...selectedFiles.value, ...uniqueNewFiles];
      uploadResults.value = [];

      // 显示添加成功的提示
      if (duplicateCount > 0) {
        emit('showToast', t('upload.addedFilesWithDuplicates', {
          added: uniqueNewFiles.length,
          duplicates: duplicateCount
        }));
      } else {
        emit('showToast', t('upload.addedFiles', { count: uniqueNewFiles.length }));
      }
    } else if (duplicateCount > 0) {
      // 全部都是重复文件
      emit('showToast', t('upload.allDuplicateFiles'));
    }
  } else {
    selectedFiles.value = validFiles;
    uploadResults.value = [];
    // 重置进度状态
    fileProgresses.value = {};
    fileStatuses.value = {};
    completedFiles.value = 0;

    emit('showToast', t('upload.addedFiles', { count: validFiles.length }));
  }
};

// 拖拽相关状态
const isDragOver = ref(false);

const handleDragOver = () => {
  isDragOver.value = true;
};

const handleDragLeave = () => {
  isDragOver.value = false;
};

const handleFileDrop = (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = false;

  const dataTransfer = event.dataTransfer;
  if (dataTransfer && dataTransfer.files && dataTransfer.files.length > 0) {
    const newFiles = Array.from(dataTransfer.files);
    processNewFiles(newFiles);
  }
};
</script>
