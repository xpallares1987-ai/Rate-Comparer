/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type Callback = (data?: any) => void;

class EventBus {
  private events: Map<string, Callback[]> = new Map();

  /**
   * Subscribe to an event
   */
  public on(event: string, callback: Callback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);

    // Return an unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event
   */
  public off(event: string, callback: Callback): void {
    if (!this.events.has(event)) return;
    const list = this.events.get(event)!;
    const index = list.indexOf(callback);
    if (index > -1) {
      list.splice(index, 1);
    }
  }

  /**
   * Emit an event to all subscribers
   */
  public emit(event: string, data?: any): void {
    if (!this.events.has(event)) return;
    
    // Create copy of callback list to avoid mutation issues during invocation
    const callbacks = [...this.events.get(event)!];
    callbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (err) {
        console.error(`[EventBus] Error in listener for event "${event}":`, err);
      }
    });
  }
}

// Singleton instance to be shared across the ESM modules
export const eventBus = new EventBus();
