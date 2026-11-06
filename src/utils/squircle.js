// ==========================================
// 文件：src/utils/squircle.js
// 职责：Apple 风格连续曲率 (Squircle / 超椭圆) 贝塞尔路径算法
// 规范：零外部依赖，纯 JS 实现，精准符合 G2 曲率连续性
// ==========================================

/**
 * 角度转弧度
 * @param {number} degrees 
 * @returns {number}
 */
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * 计算单个连续曲率圆角的几何参数
 * 基于 Figma & Apple iOS 连续曲率算法 (Martin Perming / Rasmus Andersson)
 */
function getPathParamsForCorner({
  cornerRadius,
  cornerSmoothing,
  preserveSmoothing,
  roundingAndSmoothingBudget,
}) {
  let p = (1 + cornerSmoothing) * cornerRadius;

  if (!preserveSmoothing) {
    const maxCornerSmoothing = roundingAndSmoothingBudget / cornerRadius - 1;
    cornerSmoothing = Math.min(cornerSmoothing, maxCornerSmoothing);
    p = Math.min(p, roundingAndSmoothingBudget);
  }

  // 正常圆角时 arcMeasure 为 90 度，平滑度越高，中间纯圆弧角度越小
  const arcMeasure = 90 * (1 - cornerSmoothing);
  const arcSectionLength = Math.sin(toRadians(arcMeasure / 2)) * cornerRadius * Math.sqrt(2);

  const angleAlpha = (90 - arcMeasure) / 2;
  const p3ToP4Distance = cornerRadius * Math.tan(toRadians(angleAlpha / 2));

  const angleBeta = 45 * cornerSmoothing;
  const c = p3ToP4Distance * Math.cos(toRadians(angleBeta));
  const d = c * Math.tan(toRadians(angleBeta));

  let b = (p - arcSectionLength - c - d) / 3;
  let a = 2 * b;

  if (preserveSmoothing && p > roundingAndSmoothingBudget) {
    const p1ToP3MaxDistance = roundingAndSmoothingBudget - d - arcSectionLength - c;
    const minA = p1ToP3MaxDistance / 6;
    const maxB = p1ToP3MaxDistance - minA;

    b = Math.min(b, maxB);
    a = p1ToP3MaxDistance - b;
    p = Math.min(p, roundingAndSmoothingBudget);
  }

  return {
    a,
    b,
    c,
    d,
    p,
    arcSectionLength,
    cornerRadius,
  };
}

/**
 * 四角预算分配与正规化（防止两角曲率相交或超出物理边长）
 */
const adjacentsByCorner = {
  topLeft: [
    { side: 'top', corner: 'topRight' },
    { side: 'left', corner: 'bottomLeft' },
  ],
  topRight: [
    { side: 'top', corner: 'topLeft' },
    { side: 'right', corner: 'bottomRight' },
  ],
  bottomLeft: [
    { side: 'bottom', corner: 'bottomRight' },
    { side: 'left', corner: 'topLeft' },
  ],
  bottomRight: [
    { side: 'bottom', corner: 'bottomLeft' },
    { side: 'right', corner: 'topRight' },
  ],
};

function distributeAndNormalize({
  topLeftCornerRadius,
  topRightCornerRadius,
  bottomRightCornerRadius,
  bottomLeftCornerRadius,
  width,
  height,
}) {
  const roundingAndSmoothingBudgetMap = {
    topLeft: -1,
    topRight: -1,
    bottomLeft: -1,
    bottomRight: -1,
  };

  const cornerRadiusMap = {
    topLeft: topLeftCornerRadius,
    topRight: topRightCornerRadius,
    bottomLeft: bottomLeftCornerRadius,
    bottomRight: bottomRightCornerRadius,
  };

  Object.entries(cornerRadiusMap)
    .sort(([, r1], [, r2]) => r2 - r1)
    .forEach(([cornerName, radius]) => {
      const corner = cornerName;
      const adjacents = adjacentsByCorner[corner];

      const budget = Math.min(
        ...adjacents.map((adjacent) => {
          const adjacentCornerRadius = cornerRadiusMap[adjacent.corner];
          if (radius === 0 && adjacentCornerRadius === 0) return 0;

          const adjacentCornerBudget = roundingAndSmoothingBudgetMap[adjacent.corner];
          const sideLength = (adjacent.side === 'top' || adjacent.side === 'bottom') ? width : height;

          if (adjacentCornerBudget >= 0) {
            return sideLength - roundingAndSmoothingBudgetMap[adjacent.corner];
          } else {
            return (radius / (radius + adjacentCornerRadius)) * sideLength;
          }
        })
      );

      roundingAndSmoothingBudgetMap[corner] = budget;
      cornerRadiusMap[corner] = Math.min(radius, budget);
    });

  return {
    topLeft: {
      radius: cornerRadiusMap.topLeft,
      roundingAndSmoothingBudget: roundingAndSmoothingBudgetMap.topLeft,
    },
    topRight: {
      radius: cornerRadiusMap.topRight,
      roundingAndSmoothingBudget: roundingAndSmoothingBudgetMap.topRight,
    },
    bottomLeft: {
      radius: cornerRadiusMap.bottomLeft,
      roundingAndSmoothingBudget: roundingAndSmoothingBudgetMap.bottomLeft,
    },
    bottomRight: {
      radius: cornerRadiusMap.bottomRight,
      roundingAndSmoothingBudget: roundingAndSmoothingBudgetMap.bottomRight,
    },
  };
}

/**
 * 辅助数值取整（保留两位小数，避免浮点数精度抖动与渲染模糊）
 */
function r(num) {
  return Math.round(num * 100) / 100;
}

function drawTopRightPath({ cornerRadius, a, b, c, d, p, arcSectionLength }) {
  if (cornerRadius > 0) {
    return `c ${r(a)} 0 ${r(a + b)} 0 ${r(a + b + c)} ${r(d)} ` +
           `a ${r(cornerRadius)} ${r(cornerRadius)} 0 0 1 ${r(arcSectionLength)} ${r(arcSectionLength)} ` +
           `c ${r(d)} ${r(c)} ${r(d)} ${r(b + c)} ${r(d)} ${r(a + b + c)}`;
  }
  return `l ${r(p)} 0`;
}

function drawBottomRightPath({ cornerRadius, a, b, c, d, p, arcSectionLength }) {
  if (cornerRadius > 0) {
    return `c 0 ${r(a)} 0 ${r(a + b)} ${r(-d)} ${r(a + b + c)} ` +
           `a ${r(cornerRadius)} ${r(cornerRadius)} 0 0 1 ${r(-arcSectionLength)} ${r(arcSectionLength)} ` +
           `c ${r(-c)} ${r(d)} ${r(-(b + c))} ${r(d)} ${r(-(a + b + c))} ${r(d)}`;
  }
  return `l 0 ${r(p)}`;
}

function drawBottomLeftPath({ cornerRadius, a, b, c, d, p, arcSectionLength }) {
  if (cornerRadius > 0) {
    return `c ${r(-a)} 0 ${r(-(a + b))} 0 ${r(-(a + b + c))} ${r(-d)} ` +
           `a ${r(cornerRadius)} ${r(cornerRadius)} 0 0 1 ${r(-arcSectionLength)} ${r(-arcSectionLength)} ` +
           `c ${r(-d)} ${r(-c)} ${r(-d)} ${r(-(b + c))} ${r(-d)} ${r(-(a + b + c))}`;
  }
  return `l ${r(-p)} 0`;
}

function drawTopLeftPath({ cornerRadius, a, b, c, d, p, arcSectionLength }) {
  if (cornerRadius > 0) {
    return `c 0 ${r(-a)} 0 ${r(-(a + b))} ${r(d)} ${r(-(a + b + c))} ` +
           `a ${r(cornerRadius)} ${r(cornerRadius)} 0 0 1 ${r(arcSectionLength)} ${r(-arcSectionLength)} ` +
           `c ${r(c)} ${r(-d)} ${r(b + c)} ${r(-d)} ${r(a + b + c)} ${r(-d)}`;
  }
  return `l 0 ${r(-p)}`;
}

function getSVGPathFromPathParams({
  width,
  height,
  topLeftPathParams,
  topRightPathParams,
  bottomLeftPathParams,
  bottomRightPathParams,
}) {
  return `
    M ${r(width - topRightPathParams.p)} 0
    ${drawTopRightPath(topRightPathParams)}
    L ${r(width)} ${r(height - bottomRightPathParams.p)}
    ${drawBottomRightPath(bottomRightPathParams)}
    L ${r(bottomLeftPathParams.p)} ${r(height)}
    ${drawBottomLeftPath(bottomLeftPathParams)}
    L 0 ${r(topLeftPathParams.p)}
    ${drawTopLeftPath(topLeftPathParams)}
    Z
  `.replace(/[\t\s\n]+/g, ' ').trim();
}

/**
 * 主函数：生成连续曲率超椭圆 SVG 路径字符串
 * @param {Object} options
 * @param {number} options.width 容器宽度
 * @param {number} options.height 容器高度
 * @param {number} [options.cornerRadius=0] 统一圆角半径
 * @param {number} [options.topLeftCornerRadius]
 * @param {number} [options.topRightCornerRadius]
 * @param {number} [options.bottomLeftCornerRadius]
 * @param {number} [options.bottomRightCornerRadius]
 * @param {number} [options.cornerSmoothing=0.6] 平滑度 (0=普通圆角, 0.6=Apple标准连续曲率, 1=极限超椭圆)
 * @param {boolean} [options.preserveSmoothing=true] 是否保留大圆角平滑度
 * @returns {string} SVG Path 格式的路径数据 (d 属性 / CSS path("...") 格式)
 */
export function getSquircleSvgPath({
  width = 0,
  height = 0,
  cornerRadius = 0,
  topLeftCornerRadius,
  topRightCornerRadius,
  bottomRightCornerRadius,
  bottomLeftCornerRadius,
  cornerSmoothing = 0.6,
  preserveSmoothing = true,
}) {
  // 像素对齐
  const w = Math.max(0, Math.round(width));
  const h = Math.max(0, Math.round(height));
  if (w === 0 || h === 0) return '';

  let tl = topLeftCornerRadius ?? cornerRadius;
  let tr = topRightCornerRadius ?? cornerRadius;
  let bl = bottomLeftCornerRadius ?? cornerRadius;
  let br = bottomRightCornerRadius ?? cornerRadius;

  // 四角相同且对称的标准优化路径
  if (tl === tr && tr === br && br === bl) {
    const budget = Math.min(w, h) / 2;
    const rVal = Math.min(tl, budget);
    if (rVal <= 0) {
      return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
    }

    const pathParams = getPathParamsForCorner({
      cornerRadius: rVal,
      cornerSmoothing,
      preserveSmoothing,
      roundingAndSmoothingBudget: budget,
    });

    return getSVGPathFromPathParams({
      width: w,
      height: h,
      topLeftPathParams: pathParams,
      topRightPathParams: pathParams,
      bottomLeftPathParams: pathParams,
      bottomRightPathParams: pathParams,
    });
  }

  // 四角独立非对称路径计算
  const { topLeft, topRight, bottomLeft, bottomRight } = distributeAndNormalize({
    topLeftCornerRadius: tl,
    topRightCornerRadius: tr,
    bottomRightCornerRadius: br,
    bottomLeftCornerRadius: bl,
    width: w,
    height: h,
  });

  return getSVGPathFromPathParams({
    width: w,
    height: h,
    topLeftPathParams: getPathParamsForCorner({
      cornerSmoothing,
      preserveSmoothing,
      cornerRadius: topLeft.radius,
      roundingAndSmoothingBudget: topLeft.roundingAndSmoothingBudget,
    }),
    topRightPathParams: getPathParamsForCorner({
      cornerSmoothing,
      preserveSmoothing,
      cornerRadius: topRight.radius,
      roundingAndSmoothingBudget: topRight.roundingAndSmoothingBudget,
    }),
    bottomRightPathParams: getPathParamsForCorner({
      cornerSmoothing,
      preserveSmoothing,
      cornerRadius: bottomRight.radius,
      roundingAndSmoothingBudget: bottomRight.roundingAndSmoothingBudget,
    }),
    bottomLeftPathParams: getPathParamsForCorner({
      cornerSmoothing,
      preserveSmoothing,
      cornerRadius: bottomLeft.radius,
      roundingAndSmoothingBudget: bottomLeft.roundingAndSmoothingBudget,
    }),
  });
}
