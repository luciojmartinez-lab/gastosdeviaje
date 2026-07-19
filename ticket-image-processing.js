const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

const distance = (left, right) => Math.hypot(right.x - left.x, right.y - left.y);

function quadrilateralArea(corners) {
  return Math.abs(corners.reduce((sum, point, index) => {
    const next = corners[(index + 1) % corners.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
}

export function orderReceiptCorners(points) {
  if (!Array.isArray(points) || points.length < 4) return null;
  const topLeft = points.reduce((best, point) => point.x + point.y < best.x + best.y ? point : best);
  const bottomRight = points.reduce((best, point) => point.x + point.y > best.x + best.y ? point : best);
  const topRight = points.reduce((best, point) => point.x - point.y > best.x - best.y ? point : best);
  const bottomLeft = points.reduce((best, point) => point.x - point.y < best.x - best.y ? point : best);
  const corners = [topLeft, topRight, bottomRight, bottomLeft].map(point => ({ x: point.x, y: point.y }));
  const unique = new Set(corners.map(point => `${Math.round(point.x)}:${Math.round(point.y)}`));
  return unique.size === 4 ? corners : null;
}

function contourPoints(contour) {
  const values = contour.data32S;
  const points = [];
  for (let index = 0; index + 1 < values.length; index += 2) {
    points.push({ x: values[index], y: values[index + 1] });
  }
  return points;
}

function plausibleCorners(corners, width, height) {
  if (!corners) return false;
  const areaRatio = quadrilateralArea(corners) / Math.max(1, width * height);
  const minimumEdge = Math.min(
    distance(corners[0], corners[1]),
    distance(corners[1], corners[2]),
    distance(corners[2], corners[3]),
    distance(corners[3], corners[0])
  );
  const averageWidth = (distance(corners[0], corners[1]) + distance(corners[3], corners[2])) / 2;
  const averageHeight = (distance(corners[0], corners[3]) + distance(corners[1], corners[2])) / 2;
  return areaRatio >= 0.16
    && areaRatio <= 0.97
    && minimumEdge >= Math.min(width, height) * 0.18
    && averageHeight >= averageWidth * 0.72;
}

function bestReceiptCornersFromMask(cv, mask) {
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  let best = null;
  try {
    cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    const imageArea = mask.cols * mask.rows;
    for (let index = 0; index < contours.size(); index += 1) {
      const contour = contours.get(index);
      const hull = new cv.Mat();
      try {
        const contourArea = Math.abs(cv.contourArea(contour, false));
        if (contourArea < imageArea * 0.12 || contourArea > imageArea * 0.985) continue;
        cv.convexHull(contour, hull, false, true);
        const hullPoints = contourPoints(hull);
        const frameMargin = Math.max(2, Math.round(Math.min(mask.cols, mask.rows) * 0.006));
        const interiorPoints = hullPoints.filter(point => point.x > frameMargin
          && point.y > frameMargin
          && point.x < mask.cols - frameMargin
          && point.y < mask.rows - frameMargin);
        const corners = orderReceiptCorners(interiorPoints.length >= 4 ? interiorPoints : hullPoints);
        if (!plausibleCorners(corners, mask.cols, mask.rows)) continue;
        const cornerArea = quadrilateralArea(corners);
        const fillRatio = contourArea / Math.max(1, cornerArea);
        if (fillRatio < 0.62) continue;
        const centerX = corners.reduce((sum, point) => sum + point.x, 0) / 4;
        const centerY = corners.reduce((sum, point) => sum + point.y, 0) / 4;
        const centerPenalty = Math.hypot(centerX - mask.cols / 2, centerY - mask.rows / 2)
          / Math.hypot(mask.cols, mask.rows);
        const score = contourArea / imageArea + Math.min(1, fillRatio) * 0.18 - centerPenalty * 0.08;
        if (!best || score > best.score) best = { corners, score };
      } finally {
        contour.delete();
        hull.delete();
      }
    }
  } finally {
    contours.delete();
    hierarchy.delete();
  }
  return best?.corners || null;
}

export function detectReceiptCorners(cv, source) {
  const analysisWidth = Math.min(900, source.cols);
  const scale = analysisWidth / Math.max(1, source.cols);
  const analysisHeight = Math.max(1, Math.round(source.rows * scale));
  const analysis = new cv.Mat();
  const rgb = new cv.Mat();
  const hsv = new cv.Mat();
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const mask = new cv.Mat();
  const opened = new cv.Mat();
  const closed = new cv.Mat();
  const openSize = Math.max(5, Math.round(analysisWidth * 0.009) | 1);
  const closeSize = Math.max(9, Math.round(analysisWidth * 0.024) | 1);
  const openKernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(openSize, openSize));
  const closeKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(closeSize, closeSize));
  let lower = null;
  let upper = null;
  try {
    cv.resize(source, analysis, new cv.Size(analysisWidth, analysisHeight), 0, 0, cv.INTER_AREA);
    cv.cvtColor(analysis, rgb, cv.COLOR_RGBA2RGB);
    cv.cvtColor(rgb, hsv, cv.COLOR_RGB2HSV);
    cv.cvtColor(analysis, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
    lower = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), new cv.Scalar(0, 0, 155, 0));
    upper = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), new cv.Scalar(180, 62, 255, 255));
    cv.inRange(hsv, lower, upper, mask);
    cv.morphologyEx(mask, opened, cv.MORPH_OPEN, openKernel);
    cv.morphologyEx(opened, closed, cv.MORPH_CLOSE, closeKernel);
    let corners = bestReceiptCornersFromMask(cv, closed);
    if (!corners) {
      cv.threshold(blurred, mask, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
      cv.morphologyEx(mask, opened, cv.MORPH_OPEN, openKernel);
      cv.morphologyEx(opened, closed, cv.MORPH_CLOSE, closeKernel);
      corners = bestReceiptCornersFromMask(cv, closed);
    }
    return corners?.map(point => ({
      x: clamp(point.x / scale, 0, source.cols - 1),
      y: clamp(point.y / scale, 0, source.rows - 1)
    })) || null;
  } finally {
    analysis.delete();
    rgb.delete();
    hsv.delete();
    gray.delete();
    blurred.delete();
    mask.delete();
    opened.delete();
    closed.delete();
    openKernel.delete();
    closeKernel.delete();
    lower?.delete();
    upper?.delete();
  }
}

function resizeWithoutPerspective(cv, source) {
  const scale = Math.min(1.6, 1400 / Math.max(1, source.cols), 2500 / Math.max(1, source.rows));
  const output = new cv.Mat();
  cv.resize(
    source,
    output,
    new cv.Size(Math.max(1, Math.round(source.cols * scale)), Math.max(1, Math.round(source.rows * scale))),
    0,
    0,
    scale < 1 ? cv.INTER_AREA : cv.INTER_CUBIC
  );
  return output;
}

function rectifyReceipt(cv, source, corners) {
  if (!corners) return resizeWithoutPerspective(cv, source);
  const center = corners.reduce((sum, point) => ({ x: sum.x + point.x / 4, y: sum.y + point.y / 4 }), { x: 0, y: 0 });
  const insetCorners = corners.map(point => ({
    x: point.x + (center.x - point.x) * 0.012,
    y: point.y + (center.y - point.y) * 0.012
  }));
  const naturalWidth = Math.max(distance(insetCorners[0], insetCorners[1]), distance(insetCorners[3], insetCorners[2]));
  const naturalHeight = Math.max(distance(insetCorners[0], insetCorners[3]), distance(insetCorners[1], insetCorners[2]));
  if (naturalWidth < 80 || naturalHeight < 100) return resizeWithoutPerspective(cv, source);
  const scale = Math.min(1600 / naturalWidth, 2500 / naturalHeight, Math.max(0.65, 1300 / naturalWidth));
  const documentWidth = Math.max(1, Math.round(naturalWidth * scale));
  const documentHeight = Math.max(1, Math.round(naturalHeight * scale));
  const border = 28;
  const sourcePoints = cv.matFromArray(4, 1, cv.CV_32FC2, insetCorners.flatMap(point => [point.x, point.y]));
  const destinationPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    border, border,
    border + documentWidth - 1, border,
    border + documentWidth - 1, border + documentHeight - 1,
    border, border + documentHeight - 1
  ]);
  const transform = cv.getPerspectiveTransform(sourcePoints, destinationPoints);
  const output = new cv.Mat();
  try {
    cv.warpPerspective(
      source,
      output,
      transform,
      new cv.Size(documentWidth + border * 2, documentHeight + border * 2),
      cv.INTER_CUBIC,
      cv.BORDER_CONSTANT,
      new cv.Scalar(255, 255, 255, 255)
    );
    return output;
  } finally {
    sourcePoints.delete();
    destinationPoints.delete();
    transform.delete();
  }
}

function enhanceReceipt(cv, rectified) {
  const gray = new cv.Mat();
  const denoised = new cv.Mat();
  const background = new cv.Mat();
  const normalized = new cv.Mat();
  const enhanced = new cv.Mat();
  const binary = new cv.Mat();
  let clahe = null;
  try {
    cv.cvtColor(rectified, gray, cv.COLOR_RGBA2GRAY);
    cv.medianBlur(gray, denoised, 3);
    const backgroundSize = Math.min(101, Math.max(41, Math.round(rectified.cols * 0.055) | 1));
    cv.GaussianBlur(denoised, background, new cv.Size(backgroundSize, backgroundSize), 0, 0, cv.BORDER_REPLICATE);
    cv.divide(denoised, background, normalized, 255, cv.CV_8U);
    try {
      clahe = cv.createCLAHE(2.0, new cv.Size(8, 8));
      clahe.apply(normalized, enhanced);
    } catch (_) {
      cv.normalize(normalized, enhanced, 0, 255, cv.NORM_MINMAX);
    }
    const thresholdSize = Math.min(71, Math.max(31, Math.round(rectified.cols * 0.032) | 1));
    cv.adaptiveThreshold(
      enhanced,
      binary,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY,
      thresholdSize,
      15
    );
    return {
      width: enhanced.cols,
      height: enhanced.rows,
      enhanced: new Uint8ClampedArray(enhanced.data),
      binary: new Uint8ClampedArray(binary.data)
    };
  } finally {
    if (clahe?.delete) clahe.delete();
    gray.delete();
    denoised.delete();
    background.delete();
    normalized.delete();
    enhanced.delete();
    binary.delete();
  }
}

export function processReceiptPixels(cv, image) {
  const width = Number(image?.width);
  const height = Number(image?.height);
  const values = image?.data instanceof Uint8Array || image?.data instanceof Uint8ClampedArray
    ? image.data
    : new Uint8ClampedArray(image?.data || 0);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 8 || height < 8
    || values.length < width * height * 4) {
    throw new Error('La imagen del ticket no es válida.');
  }
  const source = new cv.Mat(height, width, cv.CV_8UC4);
  let rectified = null;
  try {
    source.data.set(values.subarray(0, width * height * 4));
    const corners = detectReceiptCorners(cv, source);
    rectified = rectifyReceipt(cv, source, corners);
    return {
      ...enhanceReceipt(cv, rectified),
      documentDetected: Boolean(corners),
      corners: corners || []
    };
  } finally {
    source.delete();
    rectified?.delete();
  }
}
