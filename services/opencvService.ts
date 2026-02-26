
// OpenCV 操作封装

declare global {
  interface Window {
    cv: any;
    cvLoaded: boolean;
  }
}

export const isOpenCVReady = () => {
  return window.cvLoaded && window.cv;
};

export const cropImage = (
    imgElementId: string,
    canvasId: string,
    rect: { x: number, y: number, width: number, height: number }
): string | null => {
    if (!isOpenCVReady()) return null;
    const cv = window.cv;
    try {
        let src = cv.imread(imgElementId);
        let dst = new cv.Mat();
        // Create rectangle ROI
        let roi = new cv.Rect(rect.x, rect.y, rect.width, rect.height);
        // Crop
        dst = src.roi(roi);
        
        cv.imshow(canvasId, dst);
        src.delete();
        dst.delete();
        
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        return canvas.toDataURL('image/png');
    } catch (err) {
        console.error("Crop failed:", err);
        return null;
    }
};

export const magicWand = (
    imgElementId: string,
    canvasId: string,
    seedPoint: { x: number, y: number },
    tolerance: number = 30
): string | null => {
    if (!isOpenCVReady()) return null;
    const cv = window.cv;
    try {
        let src = cv.imread(imgElementId);
        // FloodFill requires mask with 2 pixels wider and taller than image
        let mask = new cv.Mat.zeros(src.rows + 2, src.cols + 2, cv.CV_8UC1);
        
        let newVal = new cv.Scalar(0, 0, 0, 0); // Transparent
        let loDiff = new cv.Scalar(tolerance, tolerance, tolerance, tolerance);
        let upDiff = new cv.Scalar(tolerance, tolerance, tolerance, tolerance);
        
        // Flags: 4 connectivity + mask fill + replace color
        // Note: JS binding for flags might vary, using standard approximation
        // 4 | (255 << 8) | cv.FLOODFILL_FIXED_RANGE
        let flags = 4 + (255 << 8) + cv.FLOODFILL_MASK_ONLY; 
        
        // We will just generate the mask first to show selection, or direct manipulation?
        // Let's do a direct transparency effect for "Magic Eraser" feel
        // Convert to RGBA if not already
        if (src.channels() < 4) {
            let tmp = new cv.Mat();
            cv.cvtColor(src, tmp, cv.COLOR_RGB2RGBA);
            src.delete();
            src = tmp;
        }

        // Perform FloodFill
        // Note: floodFill in OpenCV.js can be tricky with types.
        // Let's try a simpler approach: Calculate mask, then set alpha to 0 for mask area.
        
        // Re-setup for mask generation
        // Seed point
        let seed = new cv.Point(seedPoint.x, seedPoint.y);
        
        cv.floodFill(
            src, 
            mask, 
            seed, 
            newVal, // This value is ignored if we use MASK_ONLY, but let's try direct fill
            new cv.Rect(), 
            loDiff, 
            upDiff, 
            4 | cv.FLOODFILL_FIXED_RANGE
        );

        // Now src has the flooded area filled with newVal (Transparent)
        
        cv.imshow(canvasId, src);
        
        src.delete();
        mask.delete();
        
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        return canvas.toDataURL('image/png');
    } catch (err) {
        console.error("Magic Wand failed:", err);
        return null;
    }
};

export const computeSelectionMask = (
    imgElementId: string,
    seedPoint: { x: number, y: number },
    tolerance: number = 30
): { mask: Uint8Array, width: number, height: number } | null => {
    if (!isOpenCVReady()) return null;
    const cv = window.cv;
    try {
        let src = cv.imread(imgElementId);
        
        // Convert to RGB if needed to ensure consistent channels for comparison
        // But imread usually gives RGBA. 
        if (src.channels() === 3) {
            let tmp = new cv.Mat();
            cv.cvtColor(src, tmp, cv.COLOR_RGB2RGBA);
            src.delete();
            src = tmp;
        }

        // FloodFill requires mask with 2 pixels wider and taller than image
        // Mask initialized to 0
        let mask = new cv.Mat.zeros(src.rows + 2, src.cols + 2, cv.CV_8UC1);
        
        let loDiff = new cv.Scalar(tolerance, tolerance, tolerance, tolerance);
        let upDiff = new cv.Scalar(tolerance, tolerance, tolerance, tolerance);
        
        // Flags: 
        // 4 connectivity 
        // FLOODFILL_MASK_ONLY = 2 (fill mask only, don't change image)
        // FLOODFILL_FIXED_RANGE = 1 (compare to seed color)
        // New value (255) to fill in mask -> (255 << 8)
        let flags = 4 + (255 << 8) + cv.FLOODFILL_MASK_ONLY + cv.FLOODFILL_FIXED_RANGE;
        
        let seed = new cv.Point(seedPoint.x, seedPoint.y);
        
        // We need a dummy Mat for dst if we are using MASK_ONLY, but JS binding might require it?
        // Actually if MASK_ONLY is set, the image is not modified, but we still pass it.
        cv.floodFill(
            src, 
            mask, 
            seed, 
            new cv.Scalar(0,0,0,0), 
            new cv.Rect(), 
            loDiff, 
            upDiff, 
            flags
        );

        // Now mask contains 255 for selected area.
        // It is (rows+2) x (cols+2). We need to crop it back to image size.
        let rect = new cv.Rect(1, 1, src.cols, src.rows);
        let finalMask = mask.roi(rect);
        
        // Get data from finalMask
        // data() returns a Uint8Array view
        const data = new Uint8Array(finalMask.data);
        const width = finalMask.cols;
        const height = finalMask.rows;

        // Clean up
        src.delete();
        mask.delete();
        finalMask.delete();
        
        return { mask: data, width, height };

    } catch (err) {
        console.error("Compute Mask failed:", err);
        return null;
    }
};

export const applyFilter = (
  imgElementId: string, 
  canvasId: string, 
  filterType: 'grayscale' | 'canny' | 'blur' | 'threshold'
): string | null => {
  if (!isOpenCVReady()) {
    console.error("OpenCV not ready");
    return null;
  }

  const cv = window.cv;
  try {
    let src = cv.imread(imgElementId);
    let dst = new cv.Mat();

    if (filterType === 'grayscale') {
      cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0);
    } else if (filterType === 'blur') {
      let ksize = new cv.Size(15, 15);
      cv.GaussianBlur(src, dst, ksize, 0, 0, cv.BORDER_DEFAULT);
    } else if (filterType === 'canny') {
       cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
       cv.Canny(src, dst, 50, 100, 3, false);
    }

    cv.imshow(canvasId, dst);
    src.delete();
    dst.delete();
    
    // 从画布获取 Data URL
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error("OpenCV processing failed:", err);
    return null;
  }
};
