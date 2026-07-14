import { create } from 'zustand';
import { collection, query, where, onSnapshot, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type NotificationType = 'attendance_marked' | 'homework_assigned' | 'grade_published' | 'fee_reminder' | 'general';

export interface AppNotification {
  id: string;
  eventId: string;
  type: NotificationType;
  title: string;
  body: string;
  recipientId: string; // user ID (parent)
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface NotificationEvent {
  id: string;
  type: NotificationType;
  senderId: string;
  targetId: string; // Could be parentId or studentId
  title: string;
  body: string;
  createdAt: string;
}

interface NotificationState {
  notifications: AppNotification[];
  events: NotificationEvent[];
  loading: boolean;
  unsubscribeNotifications: (() => void) | null;
  fetchNotifications: (userId: string) => void;
  fetchAllEvents: () => void;
  markAsRead: (id: string) => Promise<void>;
  createNotificationEvent: (
    type: NotificationType,
    senderId: string,
    recipientId: string,
    title: string,
    body: string,
    metadata?: Record<string, any>,
    idempotencyKey?: string
  ) => Promise<void>;
  clearStore: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  events: [],
  loading: false,
  unsubscribeNotifications: null,

  fetchNotifications: (userId: string) => {
    const unsub = get().unsubscribeNotifications;
    if (unsub) unsub();

    set({ loading: true });
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', userId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
        // Sort in memory (since we might not have a composite index created yet)
        notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        set({ notifications, loading: false });
      }, (error) => {
        console.error('Error fetching notifications:', error?.message || error);
        set({ loading: false });
      });

      set({ unsubscribeNotifications: unsubscribe });
    } catch (error) {
      console.error('Notification setup failed:', error?.message || error);
      set({ loading: false });
    }
  },

  fetchAllEvents: async () => {
    set({ loading: true });
    try {
      const q = query(collection(db, 'notification_events'));
      const snapshot = await getDocs(q);
      const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationEvent));
      events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      set({ events, loading: false });
    } catch (error) {
      console.error('Error fetching notification events:', error?.message || error);
      set({ loading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      const notification = get().notifications.find(n => n.id === id);
      if (!notification) return;
      
      await setDoc(doc(db, 'notifications', id), { ...notification, isRead: true });
    } catch (error) {
      console.error('Error marking notification as read:', error?.message || error);
    }
  },

  createNotificationEvent: async (type, senderId, recipientId, title, body, metadata, idempotencyKey) => {
    try {
      const eventId = idempotencyKey || crypto.randomUUID();
      const event: NotificationEvent = {
        id: eventId,
        type,
        senderId,
        targetId: recipientId,
        title,
        body,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'notification_events', eventId), event);

      // Create recipient notification
      const notifId = idempotencyKey ? `notif_${idempotencyKey}` : crypto.randomUUID();
      const notification: AppNotification = {
        id: notifId,
        eventId,
        type,
        title,
        body,
        recipientId,
        isRead: false,
        createdAt: event.createdAt,
        metadata
      };

      await setDoc(doc(db, 'notifications', notifId), notification);

    } catch (error) {
      console.error('Error creating notification event:', error?.message || error);
    }
  },

  clearStore: () => {
    const unsub = get().unsubscribeNotifications;
    if (unsub) unsub();
    set({ notifications: [], events: [], unsubscribeNotifications: null });
  }
}));
