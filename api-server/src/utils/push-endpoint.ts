// Browser-selected push services are outbound request destinations, not user
// supplied webhooks. Keep this list tied to documented production services:
// https://developer.chrome.com/blog/push-notifications-on-the-open-web/
// https://mozilla-services.github.io/autopush-rs/
// https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
// Supporting another service requires a reviewed change and acceptance test.
const pushHosts = new Set(['fcm.googleapis.com', 'updates.push.services.mozilla.com']);

export function isAllowedPushEndpoint(value: string): boolean {
  if (!value || value.length > 2048 || /[\s\u0000-\u001f\u007f]/.test(value)) return false;
  try {
    const url = new URL(value);
    const providerHost = pushHosts.has(url.hostname) || url.hostname.endsWith('.push.apple.com');
    return providerHost && url.protocol === 'https:' && !url.port && !url.username && !url.password
      && !url.hash && url.pathname !== '/' && url.href === value;
  } catch {
    return false;
  }
}
