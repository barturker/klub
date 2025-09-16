// Custom event system for profile updates
export const PROFILE_EVENTS = {
  AVATAR_UPDATED: 'profileAvatarUpdated',
  PROFILE_UPDATED: 'profileUpdated',
} as const;

export function emitProfileUpdate<T = unknown>(eventType: string, data?: T) {
  const event = new CustomEvent(eventType, { detail: data });
  window.dispatchEvent(event);
}

export function listenToProfileUpdate<T = unknown>(eventType: string, callback: (data: T) => void) {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent;
    callback(customEvent.detail);
  };

  window.addEventListener(eventType, handler);

  // Return cleanup function
  return () => {
    window.removeEventListener(eventType, handler);
  };
}