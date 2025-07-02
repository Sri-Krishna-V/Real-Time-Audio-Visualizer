/**
 * ObjectPool - Reusable object pool for performance optimization
 * Reduces garbage collection pressure in real-time applications
 */

import * as THREE from 'three';

export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;

  constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  acquire(): T {
    if (this.pool.length > 0) {
      const obj = this.pool.pop()!;
      this.resetFn(obj);
      return obj;
    }
    return this.createFn();
  }

  release(obj: T): void {
    this.pool.push(obj);
  }

  clear(): void {
    this.pool.length = 0;
  }

  get size(): number {
    return this.pool.length;
  }
}

/**
 * Vector3Pool - Specialized pool for THREE.Vector3 objects
 */
export class Vector3Pool extends ObjectPool<THREE.Vector3> {
  constructor(initialSize = 100) {
    super(
      () => new THREE.Vector3(),
      (v) => v.set(0, 0, 0),
      initialSize
    );
  }
}
