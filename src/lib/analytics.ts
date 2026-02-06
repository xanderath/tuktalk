const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

type EventProps = Record<string, string | number | boolean | null | undefined>;

export async function trackEvent(
  event: string,
  properties: EventProps = {},
  distinctId?: string
): Promise<void> {
  if (!POSTHOG_KEY) return;
  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        properties: {
          distinct_id: distinctId ?? 'anonymous',
          ...properties,
        },
      }),
    });
  } catch (error) {
    console.warn('PostHog capture failed', error);
  }
}
