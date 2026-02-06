import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const DAILY_REMINDER_TYPE = 'daily_reminder';
const DEFAULT_BODY = 'Quick review to keep your streak alive!';

export async function getDailyReminderIds(): Promise<string[]> {
  if (Platform.OS === 'web') return [];
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled
    .filter((item) => item.content?.data?.type === DAILY_REMINDER_TYPE)
    .map((item) => item.identifier);
}

export async function getDailyReminderSchedule(): Promise<{ hour: number; minute: number } | null> {
  if (Platform.OS === 'web') return null;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const reminder = scheduled.find((item) => item.content?.data?.type === DAILY_REMINDER_TYPE);
  const trigger: any = reminder?.trigger;
  if (trigger && typeof trigger.hour === 'number' && typeof trigger.minute === 'number') {
    return { hour: trigger.hour, minute: trigger.minute };
  }
  return null;
}

export async function scheduleDailyReminder(hour = 19, minute = 0, body: string = DEFAULT_BODY) {
  if (Platform.OS === 'web') {
    return { status: 'unsupported' as const };
  }
  const perms = await Notifications.getPermissionsAsync();
  if (!perms.granted) {
    const request = await Notifications.requestPermissionsAsync();
    if (!request.granted) return { status: 'denied' as const };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-reminders', {
      name: 'Daily reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existing = await getDailyReminderIds();
  if (existing.length > 0) return { status: 'exists' as const, id: existing[0] };

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'KamJai reminder',
      body,
      data: { type: DAILY_REMINDER_TYPE },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: Platform.OS === 'android' ? 'daily-reminders' : undefined,
    },
  });

  return { status: 'scheduled' as const, id };
}

export async function cancelDailyReminders() {
  if (Platform.OS === 'web') return;
  const ids = await getDailyReminderIds();
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

export async function rescheduleDailyReminder(hour = 19, minute = 0, body: string = DEFAULT_BODY) {
  if (Platform.OS === 'web') return { status: 'unsupported' as const };
  await cancelDailyReminders();
  return scheduleDailyReminder(hour, minute, body);
}
