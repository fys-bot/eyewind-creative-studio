export const isMobileDevice = (): boolean => {
    if (typeof window === 'undefined') return false;
    
    // Check for touch capability
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Check user agent for common mobile identifiers
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    
    // iPadOS 13+ often reports as Macintosh but has touch points
    const isIPad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

    return hasTouch && (isMobileUA || isIPad);
};

export const isMac = (): boolean => {
    if (typeof window === 'undefined') return false;
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
};
