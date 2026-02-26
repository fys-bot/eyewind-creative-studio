
export type PerformanceTier = 'low' | 'balanced' | 'high';

export interface PerformanceConfig {
    tier: PerformanceTier;
    threshold: number;
    description: string;
}

export const PERFORMANCE_PRESETS: Record<PerformanceTier, PerformanceConfig> = {
    low: {
        tier: 'low',
        threshold: 1.0,
        description: 'Optimizes early to prevent lag on lower-end devices.'
    },
    balanced: {
        tier: 'balanced',
        threshold: 1.5,
        description: 'Balanced experience for most laptops.'
    },
    high: {
        tier: 'high',
        threshold: 2.5,
        description: 'Retains vector quality longer. Best for powerful desktops.'
    }
};

export const detectPerformanceTier = (): PerformanceConfig => {
    if (typeof navigator === 'undefined') return PERFORMANCE_PRESETS.balanced;

    // Default to balanced
    let tier: PerformanceTier = 'balanced';

    // 1. Check Hardware Concurrency (Logical Cores)
    const cores = navigator.hardwareConcurrency || 4;

    // 2. Check Device Memory (RAM in GB) - Experimental API
    // @ts-ignore
    const ram = (navigator.deviceMemory as number) || 8;

    // Simple Heuristic
    if (cores <= 4 || ram <= 4) {
        tier = 'low';
    } else if (cores >= 8 && ram >= 8) {
        tier = 'high';
    } else {
        tier = 'balanced';
    }

    return PERFORMANCE_PRESETS[tier];
};
