import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { localDb } from './database';
import { apiRequest } from './apiClient';

// Configure notification foreground handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  async initChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    // Channel for tasks
    await Notifications.setNotificationChannelAsync('tasks', {
      name: 'Lời nhắc công việc',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6D4AFF',
      sound: 'default',
    });

    // Channel for habits
    await Notifications.setNotificationChannelAsync('habits', {
      name: 'Lời nhắc thói quen',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: '#6D4AFF',
      sound: 'default',
    });

    // Register categories with actions
    await Notifications.setNotificationCategoryAsync('task_actions', [
      {
        identifier: 'COMPLETE_TASK',
        buttonTitle: '✓ Đã xong',
        options: { isDestructive: false, isAuthenticationRequired: false },
      },
      {
        identifier: 'SNOOZE_10M',
        buttonTitle: '⏰ Nhắc lại 10 phút',
        options: { isDestructive: false, isAuthenticationRequired: false },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('habit_actions', [
      {
        identifier: 'COMPLETE_HABIT',
        buttonTitle: '✓ Đã làm',
        options: { isDestructive: false, isAuthenticationRequired: false },
      },
      {
        identifier: 'SNOOZE_10M',
        buttonTitle: '⏰ Nhắc lại 10 phút',
        options: { isDestructive: false, isAuthenticationRequired: false },
      },
    ]);
  },

  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  },

  async scheduleTaskReminder(task: {
    id: string;
    title: string;
    scheduledAt: string;
    userId: string;
  }): Promise<string> {
    const date = new Date(task.scheduledAt);
    const occurrenceKey = `${task.userId}:${task.id}:${date.toISOString().split('T')[0]}:1`;

    const osNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'DingDongNote — Lời nhắc công việc',
        body: task.title,
        categoryIdentifier: 'task_actions',
        data: { entityId: task.id, occurrenceKey, type: 'task' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: 'tasks',
      },
    });

    localDb.saveNotificationJob({
      id: osNotificationId,
      osNotificationId,
      entityId: task.id,
      occurrenceKey,
      scheduledAt: task.scheduledAt,
      mode: 'notification',
      userId: task.userId,
    });

    return osNotificationId;
  },

  async cancelTaskReminder(taskId: string): Promise<void> {
    const osIds = localDb.cancelNotificationJobByEntity(taskId);
    for (const osId of osIds) {
      await Notifications.cancelScheduledNotificationAsync(osId);
    }
  },

  async snoozeNotification(notificationData: any): Promise<void> {
    const date = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes later
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'DingDongNote — Lời nhắc lại',
        body: `Nhắc lại sau 10 phút`,
        categoryIdentifier: notificationData.type === 'habit' ? 'habit_actions' : 'task_actions',
        data: notificationData,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: notificationData.type === 'habit' ? 'habits' : 'tasks',
      },
    });
  },

  async sendTestNotification(): Promise<void> {
    await this.initChannels();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'DingDongNote 🔔',
        body: 'Thử nghiệm thông báo thành công (Âm thanh & Rung)!',
        categoryIdentifier: 'task_actions',
        data: { type: 'test' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        channelId: 'tasks',
      },
    });
  },

  setupResponseListener(onNavigate?: (route: string) => void) {
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const { actionIdentifier, notification } = response;
      const data = (notification.request.content.data as any) || {};

      if (actionIdentifier === 'COMPLETE_TASK' && data.entityId) {
        await apiRequest(`/tasks/${data.entityId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'completed' }),
        });
        await Notifications.dismissNotificationAsync(notification.request.identifier);
      } else if (actionIdentifier === 'COMPLETE_HABIT' && data.entityId) {
        const todayStr = new Date().toISOString().split('T')[0];
        await apiRequest(`/habits/${data.entityId}/completions/${todayStr}`, {
          method: 'PUT',
        });
        await Notifications.dismissNotificationAsync(notification.request.identifier);
      } else if (actionIdentifier === 'SNOOZE_10M') {
        await this.snoozeNotification(data);
        await Notifications.dismissNotificationAsync(notification.request.identifier);
      } else if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        if (data.type === 'habit') {
          onNavigate?.('/habits');
        } else if (data.type === 'task') {
          onNavigate?.('/tasks');
        }
      }
    });

    return subscription;
  },
};
