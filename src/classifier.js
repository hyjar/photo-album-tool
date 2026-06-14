/**
 * 智能分类模块
 * 基于 EXIF 数据 + 文件名 + 图片尺寸的方向/内容分类
 */

// 分类结果缓存
const _cache = new Map();

/**
 * 分类单张图片
 * @param {Object} image - { id, name, width, height, aspectRatio, exif }
 * @returns {{ orientation: string, category: string, confidence: number }}
 */
export function classifyImage(image) {
  if (_cache.has(image.id)) return _cache.get(image.id);

  const orientation = detectOrientation(image.width, image.height);
  const category = detectCategory(image);

  const result = { orientation, category, confidence: category.confidence || 0.7 };
  _cache.set(image.id, result);
  return result;
}

/**
 * 批量分类
 */
export function classifyAllImages(images) {
  const results = {};
  for (const img of images) {
    results[img.id] = classifyImage(img);
  }
  return results;
}

/**
 * 清除缓存
 */
export function clearClassificationCache() {
  _cache.clear();
}

/**
 * 方向检测
 */
function detectOrientation(width, height) {
  if (!width || !height) return 'square';
  const ratio = width / height;
  if (ratio > 1.15) return 'landscape';
  if (ratio < 0.87) return 'portrait';
  return 'square';
}

/**
 * 内容类型检测（基于 EXIF + 文件名启发式）
 */
function detectCategory(image) {
  const name = (image.name || '').toLowerCase();
  const exif = image.exif || {};
  const focalLength = exif.focalLength || 0;
  const aperture = exif.aperture || 0;

  // 文件名关键词匹配（优先级最高）
  if (/人像|portrait|肖像/.test(name)) return { category: 'portrait', confidence: 0.9 };
  if (/风光|风景|landscape|自然/.test(name)) return { category: 'landscape', confidence: 0.9 };
  if (/建筑|architecture|建筑/.test(name)) return { category: 'architecture', confidence: 0.9 };
  if (/微距|macro|特写/.test(name)) return { category: 'macro', confidence: 0.9 };
  if (/动物|animal|猫|狗|鸟/.test(name)) return { category: 'animal', confidence: 0.9 };
  if (/美食|food|食|餐/.test(name)) return { category: 'food', confidence: 0.9 };

  // EXIF 参数启发式
  if (focalLength >= 70 && aperture > 0 && aperture <= 2.8) {
    return { category: 'portrait', confidence: 0.75 };
  }
  if (focalLength >= 200) {
    return { category: 'animal', confidence: 0.6 };
  }
  if (focalLength >= 90 && aperture >= 8) {
    return { category: 'macro', confidence: 0.65 };
  }
  if (focalLength > 0 && focalLength <= 24) {
    return { category: 'architecture', confidence: 0.6 };
  }
  if (focalLength > 0 && focalLength <= 35 && image.aspectRatio >= 1.3) {
    return { category: 'landscape', confidence: 0.6 };
  }

  return { category: 'general', confidence: 0.5 };
}

/**
 * 分类标签中文映射
 */
export const CATEGORY_LABELS = {
  portrait: '人像',
  landscape: '风景',
  architecture: '建筑',
  macro: '微距',
  animal: '动物',
  food: '美食',
  general: '通用',
};

/**
 * 方向标签中文映射
 */
export const ORIENTATION_LABELS = {
  portrait: '竖向',
  landscape: '横向',
  square: '方形',
};

/**
 * 分类标签颜色
 */
export const CATEGORY_COLORS = {
  portrait: '#e74c3c',
  landscape: '#27ae60',
  architecture: '#3498db',
  macro: '#9b59b6',
  animal: '#f39c12',
  food: '#e67e22',
  general: '#95a5a6',
};

export const ORIENTATION_COLORS = {
  portrait: '#3498db',
  landscape: '#2ecc71',
  square: '#95a5a6',
};
