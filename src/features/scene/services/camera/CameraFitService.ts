/**
 * CameraFitService - 相机聚焦辅助服务
 * 
 * 提供将相机自动对准目标对象/区域的辅助功能。
 * 这些方法应被其他功能直接调用，而不是暴露给用户。
 * 
 * 使用示例:
 *   const fitService = getCameraFitService();
 *   await fitService.fitToBox(min, max, 1.2, 600);
 *   await fitService.fitToSphere(center, radius);
 *   await fitService.fitToSelection(boundingBoxes);
 */

import { getEventBus } from '@/core/EventBus';
import { createLogger } from '@/core/Logger';
import { useCameraPoseStore } from '@/stores/cameraStore';

import type { Vec3 } from '@/shared/types';

const logger = createLogger({ module: 'CameraFitService' });

// 常量定义
const FOV_TO_RAD_DIVISOR = 360;
const DEFAULT_PADDING = 1.2;
const DEFAULT_DURATION = 600;
const MIN_DISTANCE = 0.1;
const MAX_DISTANCE = 1000;

/**
 * 聚焦配置选项
 */
export interface FitOptions {
  /** 动画持续时间(ms)，默认 600 */
  duration?: number;
  /** 缓动函数类型 */
  easing?: 'linear' | 'ease-out-cubic' | 'ease-in-out-cubic';
  /** 完成回调 */
  onComplete?: () => void;
  /** 边距系数，默认 1.2 */
  padding?: number;
  /** 是否保持当前视角方向 */
  preserveDirection?: boolean;
}

/**
 * 边界盒类型
 */
export interface BoundingBox {
  max: Vec3;
  min: Vec3;
}

/**
 * 计算边界盒中心点
 */
const calculateCenter = (min: Vec3, max: Vec3): Vec3 => ({
  x: (min.x + max.x) / 2,
  y: (min.y + max.y) / 2,
  z: (min.z + max.z) / 2,
});

/**
 * 计算边界盒的最大尺寸
 */
const calculateMaxSize = (min: Vec3, max: Vec3): number =>
  Math.max(max.x - min.x, max.y - min.y, max.z - min.z);

/**
 * 规范化向量
 */
const normalizeVector = (v: Vec3): Vec3 => {
  const len = Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);

  if (len === 0) return { x: 0, y: 0, z: 1 };

  return { x: v.x / len, y: v.y / len, z: v.z / len };
};

/**
 * 根据 FOV 和目标尺寸计算最佳相机距离
 */
const calculateOptimalDistance = (size: number, fov: number, padding: number): number => {
  const distance = (size * padding) / (2 * Math.tan((fov * Math.PI) / FOV_TO_RAD_DIVISOR));

  return Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, distance));
};

/**
 * CameraFitService 类
 * 提供相机聚焦目标区域的辅助方法
 */
class CameraFitServiceImpl {
  private static instance: CameraFitServiceImpl | null = null;

  private constructor() {
    logger.info('CameraFitService initialized');
  }

  static getInstance(): CameraFitServiceImpl {
    CameraFitServiceImpl.instance ??= new CameraFitServiceImpl();

    return CameraFitServiceImpl.instance;
  }

  /**
   * 使相机聚焦到指定的边界盒
   * 
   * @param min - 边界盒最小点
   * @param max - 边界盒最大点
   * @param options - 聚焦配置选项
   */
  async fitToBox(min: Vec3, max: Vec3, options: FitOptions = {}): Promise<void> {
    const {
      padding = DEFAULT_PADDING,
      duration = DEFAULT_DURATION,
      preserveDirection = true,
      onComplete,
    } = options;

    const store = useCameraPoseStore.getState();
    const eventBus = getEventBus();
    const { fov, position, target } = store.pose;

    const center = calculateCenter(min, max);
    const size = calculateMaxSize(min, max);
    const distance = calculateOptimalDistance(size, fov, padding);

    // 计算新的相机位置（保持当前视角方向）
    let newPosition: Vec3;

    if (preserveDirection) {
      const direction = normalizeVector({
        x: position.x - target.x,
        y: position.y - target.y,
        z: position.z - target.z,
      });

      newPosition = {
        x: center.x + direction.x * distance,
        y: center.y + direction.y * distance,
        z: center.z + direction.z * distance,
      };
    } else {
      // 默认从 Z 轴正方向看向目标
      newPosition = {
        x: center.x,
        y: center.y,
        z: center.z + distance,
      };
    }

    return new Promise((resolve) => {
      store.setPose(
        { position: newPosition, target: center },
        'user'
      );

      // 由于 setPose 不支持动画选项，直接发送事件
      eventBus.emit('camera:fit-to-box', { min, max, padding, duration });

      logger.info('fitToBox completed', { center, distance, duration });

      if (duration > 0) {
        setTimeout(() => {
          onComplete?.();
          resolve();
        }, duration);
      } else {
        onComplete?.();
        resolve();
      }
    });
  }

  /**
   * 使相机聚焦到指定点（以该点为中心，相机拉到合适距离）
   * 
   * @param point - 目标点
   * @param viewRadius - 可视范围半径，默认为 1
   * @param options - 聚焦配置选项
   */
  async fitToPoint(point: Vec3, viewRadius = 1, options: FitOptions = {}): Promise<void> {
    return this.fitToSphere(point, viewRadius, options);
  }

  /**
   * 使相机聚焦到多个边界盒的并集
   * 
   * @param boundingBoxes - 边界盒数组
   * @param options - 聚焦配置选项
   */
  async fitToSelection(boundingBoxes: BoundingBox[], options: FitOptions = {}): Promise<void> {
    if (boundingBoxes.length === 0) {
      logger.warn('fitToSelection called with empty bounding boxes');

      return;
    }

    // 计算所有边界盒的全局边界
    const globalMin: Vec3 = { x: Infinity, y: Infinity, z: Infinity };
    const globalMax: Vec3 = { x: -Infinity, y: -Infinity, z: -Infinity };

    for (const box of boundingBoxes) {
      globalMin.x = Math.min(globalMin.x, box.min.x);
      globalMin.y = Math.min(globalMin.y, box.min.y);
      globalMin.z = Math.min(globalMin.z, box.min.z);
      globalMax.x = Math.max(globalMax.x, box.max.x);
      globalMax.y = Math.max(globalMax.y, box.max.y);
      globalMax.z = Math.max(globalMax.z, box.max.z);
    }

    logger.info('fitToSelection', { count: boundingBoxes.length, globalMin, globalMax });

    return this.fitToBox(globalMin, globalMax, options);
  }

  /**
   * 使相机聚焦到指定的球体
   * 
   * @param center - 球心
   * @param radius - 半径
   * @param options - 聚焦配置选项
   */
  async fitToSphere(center: Vec3, radius: number, options: FitOptions = {}): Promise<void> {

    // 将球体转换为包围盒
    const min: Vec3 = {
      x: center.x - radius,
      y: center.y - radius,
      z: center.z - radius,
    };
    const max: Vec3 = {
      x: center.x + radius,
      y: center.y + radius,
      z: center.z + radius,
    };

    return this.fitToBox(min, max, options);
  }

  /**
   * 重置相机到默认位置（场景中心，向量 (0,0,1)）
   * 
   * @param options - 聚焦配置选项
   */
  async resetToCenter(options: FitOptions = {}): Promise<void> {
    return this.fitToBox(
      { x: -1, y: -1, z: -1 },
      { x: 1, y: 1, z: 1 },
      { padding: 2, ...options }
    );
  }
}

/**
 * 获取 CameraFitService 单例
 */
export const getCameraFitService = (): CameraFitServiceImpl =>
  CameraFitServiceImpl.getInstance();

/**
 * 重置 CameraFitService（用于测试）
 */
export const resetCameraFitService = (): void => {
  (CameraFitServiceImpl as unknown as { instance: CameraFitServiceImpl | null }).instance = null;
};

export { CameraFitServiceImpl as CameraFitService };
