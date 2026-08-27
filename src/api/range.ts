import type { StorageRange } from '../common/services';

export type RangeParseResult =
    | { valid: true; range: StorageRange }
    | { valid: false };

export const parseRangeHeader = (header: string, size: number): RangeParseResult => {
    if (!Number.isSafeInteger(size) || size <= 0) {
        return { valid: false };
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
    if (!match || (!match[1] && !match[2])) {
        return { valid: false };
    }

    if (!match[1]) {
        const suffixLength = Number(match[2]);
        if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
            return { valid: false };
        }
        const length = Math.min(suffixLength, size);
        return {
            valid: true,
            range: { offset: size - length, length },
        };
    }

    const start = Number(match[1]);
    if (!Number.isSafeInteger(start) || start < 0 || start >= size) {
        return { valid: false };
    }

    const requestedEnd = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(requestedEnd) || requestedEnd < start) {
        return { valid: false };
    }

    const end = Math.min(requestedEnd, size - 1);
    return {
        valid: true,
        range: { offset: start, length: end - start + 1 },
    };
};
