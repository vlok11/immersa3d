import 'reflect-metadata';
import { container } from 'tsyringe';

export function resetContainer(): void {
  container.clearInstances();
}

export type TokenType = (typeof TOKENS)[keyof typeof TOKENS];

export const TOKENS = {
  EventBus: Symbol('EventBus'),
  ConfigService: Symbol('ConfigService'),
  CameraService: Symbol('CameraService'),
  MotionService: Symbol('MotionService'),
  InputService: Symbol('InputService'),
  AnimationScheduler: Symbol('AnimationScheduler'),
  CameraAnimator: Symbol('CameraAnimator'),
  CoreController: Symbol('CoreController'),
  CameraTransitionService: Symbol('CameraTransitionService'),
  ProjectionPreviewService: Symbol('ProjectionPreviewService'),
  ConfigPresetManager: Symbol('ConfigPresetManager'),
  MaterialRegistry: Symbol('MaterialRegistry'),
  MaterialFactory: Symbol('MaterialFactory'),
} as const;

export { container };
