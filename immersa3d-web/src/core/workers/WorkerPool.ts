// ============================================================
// Immersa 3D - Worker Pool
// WebWorker pool management for AI inference
// ============================================================

/**
 * Worker task status
 */
export type WorkerTaskStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Worker task definition
 */
export interface WorkerTask<TInput = unknown, TOutput = unknown> {
  id: string;
  type: string;
  input: TInput;
  status: WorkerTaskStatus;
  progress: number;
  result?: TOutput;
  error?: Error;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

/**
 * Worker message types
 */
export interface WorkerMessage {
  type: 'task' | 'progress' | 'result' | 'error' | 'ready';
  taskId?: string;
  payload?: unknown;
  progress?: number;
  error?: string;
}

/**
 * Pool worker wrapper
 */
interface PoolWorker {
  worker: Worker;
  busy: boolean;
  currentTaskId?: string;
}

/**
 * WorkerPool - Manages a pool of WebWorkers for parallel processing
 */
export class WorkerPool {
  private workers: PoolWorker[] = [];
  private taskQueue: Array<{
    task: WorkerTask;
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
    onProgress?: (progress: number) => void;
  }> = [];
  private tasks: Map<string, WorkerTask> = new Map();

  /**
   * Create a new worker pool
   * @param workerFactory - Function that creates a new Worker
   * @param poolSize - Number of workers in the pool (default: navigator.hardwareConcurrency)
   */
  private workerFactory: () => Worker;
  private poolSize: number;
  
  constructor(
    workerFactory: () => Worker,
    poolSize: number = Math.max(1, (navigator.hardwareConcurrency || 4) - 1)
  ) {
    this.workerFactory = workerFactory;
    this.poolSize = poolSize;
    this.initializePool();
  }

  /**
   * Initialize worker pool
   */
  private initializePool(): void {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = this.workerFactory();
      const poolWorker: PoolWorker = {
        worker,
        busy: false,
      };

      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        this.handleWorkerMessage(poolWorker, event.data);
      };

      worker.onerror = (error) => {
        console.error('[WorkerPool] Worker error:', error);
        this.handleWorkerError(poolWorker, new Error(error.message));
      };

      this.workers.push(poolWorker);
    }

    console.log(`[WorkerPool] Initialized with ${this.poolSize} workers`);
  }

  /**
   * Handle messages from workers
   */
  private handleWorkerMessage(poolWorker: PoolWorker, message: WorkerMessage): void {
    const taskId = message.taskId || poolWorker.currentTaskId;
    if (!taskId) return;

    const queuedItem = this.taskQueue.find(item => item.task.id === taskId);
    const task = this.tasks.get(taskId);

    switch (message.type) {
      case 'progress':
        if (task && message.progress !== undefined) {
          task.progress = message.progress;
          queuedItem?.onProgress?.(message.progress);
        }
        break;

      case 'result':
        if (task) {
          task.status = 'completed';
          task.result = message.payload;
          task.completedAt = Date.now();
          task.progress = 100;
        }
        queuedItem?.resolve(message.payload);
        this.releaseWorker(poolWorker);
        break;

      case 'error':
        if (task) {
          task.status = 'failed';
          task.error = new Error(message.error || 'Unknown worker error');
          task.completedAt = Date.now();
        }
        queuedItem?.reject(new Error(message.error));
        this.releaseWorker(poolWorker);
        break;
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(poolWorker: PoolWorker, error: Error): void {
    const taskId = poolWorker.currentTaskId;
    if (taskId) {
      const task = this.tasks.get(taskId);
      if (task) {
        task.status = 'failed';
        task.error = error;
      }

      const queuedItem = this.taskQueue.find(item => item.task.id === taskId);
      queuedItem?.reject(error);
    }

    this.releaseWorker(poolWorker);
  }

  /**
   * Release a worker back to the pool
   */
  private releaseWorker(poolWorker: PoolWorker): void {
    poolWorker.busy = false;
    poolWorker.currentTaskId = undefined;
    this.processQueue();
  }

  /**
   * Process next task in queue
   */
  private processQueue(): void {
    if (this.taskQueue.length === 0) return;

    const availableWorker = this.workers.find(w => !w.busy);
    if (!availableWorker) return;

    const queuedItem = this.taskQueue.shift();
    if (!queuedItem) return;

    const { task } = queuedItem;
    availableWorker.busy = true;
    availableWorker.currentTaskId = task.id;
    task.status = 'running';
    task.startedAt = Date.now();

    availableWorker.worker.postMessage({
      type: 'task',
      taskId: task.id,
      taskType: task.type,
      payload: task.input,
    });
  }

  /**
   * Submit a task to the pool
   */
  submit<TInput, TOutput>(
    type: string,
    input: TInput,
    onProgress?: (progress: number) => void
  ): Promise<TOutput> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const task: WorkerTask<TInput, TOutput> = {
      id: taskId,
      type,
      input,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
    };

    this.tasks.set(taskId, task as WorkerTask);

    return new Promise((resolve, reject) => {
      this.taskQueue.push({
        task: task as WorkerTask,
        resolve: resolve as (result: unknown) => void,
        reject,
        onProgress,
      });

      this.processQueue();
    });
  }

  /**
   * Get task status
   */
  getTask(taskId: string): WorkerTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get pool statistics
   */
  getStats(): { total: number; busy: number; queued: number } {
    return {
      total: this.workers.length,
      busy: this.workers.filter(w => w.busy).length,
      queued: this.taskQueue.length,
    };
  }

  /**
   * Terminate all workers
   */
  terminate(): void {
    for (const poolWorker of this.workers) {
      poolWorker.worker.terminate();
    }
    this.workers = [];
    this.taskQueue = [];
    this.tasks.clear();
    console.log('[WorkerPool] All workers terminated');
  }
}
