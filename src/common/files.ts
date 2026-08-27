export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024 * 1024;
export const MAX_SINGLE_UPLOAD_SIZE = 50 * 1024 * 1024;
export const MULTIPART_CHUNK_SIZE = 25 * 1024 * 1024;
export const FILE_HASH_PATTERN = /^[a-f0-9]{64}$/i;
export const FILE_KEY_PATTERN = /^[a-f0-9]{64}(?:\.[a-z0-9]{1,16})?$/i;

export const getFileKey = (originalFilename: string, sha256: string): string => {
    const extension = /\.([a-z0-9]{1,16})$/i.exec(originalFilename)?.[1]?.toLowerCase();
    return extension ? `${sha256.toLowerCase()}.${extension}` : sha256.toLowerCase();
};
