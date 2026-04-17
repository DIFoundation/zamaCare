/**
 * Debounce utility to prevent rapid successive function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Debounce async function with promise support
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeout: NodeJS.Timeout | null = null;
  let lastResolve: ((value: any) => void) | null = null;
  let lastReject: ((reason: any) => void) | null = null;
  
  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return new Promise((resolve, reject) => {
      // Cancel previous timeout and reject previous promise
      if (timeout) {
        clearTimeout(timeout);
        if (lastReject) {
          lastReject(new Error('Debounced'));
        }
      }
      
      lastResolve = resolve;
      lastReject = reject;
      
      timeout = setTimeout(async () => {
        try {
          const result = await func(...args);
          if (lastResolve) {
            lastResolve(result);
          }
        } catch (error) {
          if (lastReject) {
            lastReject(error);
          }
        }
      }, wait);
    });
  };
}
