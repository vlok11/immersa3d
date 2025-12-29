// ============================================================
// Immersa 3D - Bezier Curve Generator
// Cubic bezier path generation for smooth camera motion
// ============================================================

/**
 * 2D/3D Point type
 */
export type Point3D = [number, number, number];
export type Point2D = [number, number];

/**
 * Bezier control point configuration
 */
export interface BezierControlPoints {
  p0: Point3D;  // Start point
  p1: Point3D;  // Control point 1
  p2: Point3D;  // Control point 2
  p3: Point3D;  // End point
}

/**
 * Bezier segment with associated time
 */
export interface BezierSegment {
  startTime: number;
  endTime: number;
  controls: BezierControlPoints;
}

/**
 * Bezier curve generator for camera paths
 */
export class BezierCurveGenerator {
  private segments: BezierSegment[] = [];
  
  /**
   * Add a bezier segment
   */
  addSegment(segment: BezierSegment): void {
    this.segments.push(segment);
    this.segments.sort((a, b) => a.startTime - b.startTime);
  }
  
  /**
   * Create a cubic bezier segment from two points with automatic control points
   */
  static createAutoSegment(
    p0: Point3D,
    p3: Point3D,
    startTime: number,
    endTime: number,
    tension: number = 0.5
  ): BezierSegment {
    // Calculate direction vector
    const dx = p3[0] - p0[0];
    const dy = p3[1] - p0[1];
    const dz = p3[2] - p0[2];
    
    // Control points at 1/3 and 2/3 along the path with some curvature
    const p1: Point3D = [
      p0[0] + dx * tension,
      p0[1] + dy * tension,
      p0[2] + dz * tension,
    ];
    
    const p2: Point3D = [
      p3[0] - dx * tension,
      p3[1] - dy * tension,
      p3[2] - dz * tension,
    ];
    
    return {
      startTime,
      endTime,
      controls: { p0, p1, p2, p3 },
    };
  }
  
  /**
   * Evaluate point on cubic bezier curve at parameter t (0-1)
   */
  static evaluateCubic(controls: BezierControlPoints, t: number): Point3D {
    const { p0, p1, p2, p3 } = controls;
    
    // Cubic bezier formula: B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    
    return [
      mt3 * p0[0] + 3 * mt2 * t * p1[0] + 3 * mt * t2 * p2[0] + t3 * p3[0],
      mt3 * p0[1] + 3 * mt2 * t * p1[1] + 3 * mt * t2 * p2[1] + t3 * p3[1],
      mt3 * p0[2] + 3 * mt2 * t * p1[2] + 3 * mt * t2 * p2[2] + t3 * p3[2],
    ];
  }
  
  /**
   * Evaluate tangent (first derivative) on cubic bezier at parameter t
   */
  static evaluateTangent(controls: BezierControlPoints, t: number): Point3D {
    const { p0, p1, p2, p3 } = controls;
    
    // First derivative: B'(t) = 3(1-t)²(P1-P0) + 6(1-t)t(P2-P1) + 3t²(P3-P2)
    const mt = 1 - t;
    const mt2 = mt * mt;
    const t2 = t * t;
    
    return [
      3 * mt2 * (p1[0] - p0[0]) + 6 * mt * t * (p2[0] - p1[0]) + 3 * t2 * (p3[0] - p2[0]),
      3 * mt2 * (p1[1] - p0[1]) + 6 * mt * t * (p2[1] - p1[1]) + 3 * t2 * (p3[1] - p2[1]),
      3 * mt2 * (p1[2] - p0[2]) + 6 * mt * t * (p2[2] - p1[2]) + 3 * t2 * (p3[2] - p2[2]),
    ];
  }
  
  /**
   * Get point on the path at a specific time
   */
  getPointAtTime(time: number): Point3D | null {
    const segment = this.findSegmentAtTime(time);
    if (!segment) return null;
    
    const t = (time - segment.startTime) / (segment.endTime - segment.startTime);
    return BezierCurveGenerator.evaluateCubic(segment.controls, t);
  }
  
  /**
   * Get tangent on the path at a specific time
   */
  getTangentAtTime(time: number): Point3D | null {
    const segment = this.findSegmentAtTime(time);
    if (!segment) return null;
    
    const t = (time - segment.startTime) / (segment.endTime - segment.startTime);
    return BezierCurveGenerator.evaluateTangent(segment.controls, t);
  }
  
  /**
   * Find segment containing the given time
   */
  private findSegmentAtTime(time: number): BezierSegment | null {
    for (const segment of this.segments) {
      if (time >= segment.startTime && time <= segment.endTime) {
        return segment;
      }
    }
    return null;
  }
  
  /**
   * Generate points along the entire path for visualization
   */
  generatePathPoints(resolution: number = 50): Point3D[] {
    const points: Point3D[] = [];
    
    for (const segment of this.segments) {
      for (let i = 0; i <= resolution; i++) {
        const t = i / resolution;
        points.push(BezierCurveGenerator.evaluateCubic(segment.controls, t));
      }
    }
    
    return points;
  }
  
  /**
   * Get total duration of all segments
   */
  getTotalDuration(): number {
    if (this.segments.length === 0) return 0;
    return this.segments[this.segments.length - 1].endTime;
  }
  
  /**
   * Clear all segments
   */
  clear(): void {
    this.segments = [];
  }
  
  /**
   * Get all segments
   */
  getSegments(): BezierSegment[] {
    return [...this.segments];
  }
}

/**
 * Calculate arc length of a bezier segment using numerical integration
 */
export function calculateArcLength(controls: BezierControlPoints, steps: number = 100): number {
  let length = 0;
  let prevPoint = BezierCurveGenerator.evaluateCubic(controls, 0);
  
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const point = BezierCurveGenerator.evaluateCubic(controls, t);
    
    const dx = point[0] - prevPoint[0];
    const dy = point[1] - prevPoint[1];
    const dz = point[2] - prevPoint[2];
    
    length += Math.sqrt(dx * dx + dy * dy + dz * dz);
    prevPoint = point;
  }
  
  return length;
}

/**
 * Reparameterize bezier by arc length for constant speed motion
 */
export function reparameterizeByArcLength(
  controls: BezierControlPoints,
  targetDistance: number,
  steps: number = 100
): number {
  const totalLength = calculateArcLength(controls, steps);
  
  if (totalLength === 0) return 0;
  if (targetDistance >= totalLength) return 1;
  
  // Binary search for parameter t that gives target distance
  let low = 0;
  let high = 1;
  
  while (high - low > 0.0001) {
    const mid = (low + high) / 2;
    const midLength = calculateArcLength(
      {
        p0: controls.p0,
        p1: interpolateControlPoint(controls.p0, controls.p1, mid),
        p2: interpolateControlPoint(controls.p0, controls.p2, mid),
        p3: BezierCurveGenerator.evaluateCubic(controls, mid),
      },
      steps
    );
    
    if (midLength < targetDistance) {
      low = mid;
    } else {
      high = mid;
    }
  }
  
  return (low + high) / 2;
}

/**
 * Helper to interpolate a control point
 */
function interpolateControlPoint(p0: Point3D, p1: Point3D, t: number): Point3D {
  return [
    p0[0] + (p1[0] - p0[0]) * t,
    p0[1] + (p1[1] - p0[1]) * t,
    p0[2] + (p1[2] - p0[2]) * t,
  ];
}
