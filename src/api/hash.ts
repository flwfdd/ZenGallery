import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

import type { StorageObjectMetadata, StorageService } from '../common/services';

export const storedObjectMatchesHash = async (
    storage: StorageService,
    key: string,
    metadata: StorageObjectMetadata,
    expectedHash: string,
): Promise<boolean> => {
    if (metadata.sha256) {
        return metadata.sha256.toLowerCase() === expectedHash.toLowerCase();
    }

    const object = await storage.get(key);
    if (!object?.body) return false;

    const hasher = sha256.create();
    if (object.body instanceof ArrayBuffer) {
        hasher.update(new Uint8Array(object.body));
    } else {
        const reader = object.body.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                hasher.update(value);
            }
        } finally {
            reader.releaseLock();
        }
    }

    return bytesToHex(hasher.digest()) === expectedHash.toLowerCase();
};

export const isHashMismatchError = (error: unknown): boolean => (
    error instanceof Error && /checksum|sha-?256|digest/i.test(error.message)
);
