import { create } from 'zustand';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import type { NewsItem, Message, Post, Comment, EmailDeliveryLog } from '../lib/types';

interface CommunicationStore {
  news: NewsItem[];
  messages: Message[];
  posts: Post[];
  emailDeliveryLogs: EmailDeliveryLog[];
  loading: boolean;
  
  fetchData: () => void;
  clearStore: () => void;

  addNews: (newsItem: Omit<NewsItem, 'id' | 'date'>) => Promise<void>;
  deleteNews: (id: string) => Promise<void>;
  
  addMessage: (message: Omit<Message, 'id' | 'timestamp' | 'read'>) => Promise<void>;
  markMessageRead: (id: string) => Promise<void>;
  
  addPost: (post: Omit<Post, 'id' | 'createdAt' | 'likes' | 'comments'>) => Promise<void>;
  editPost: (id: string, updates: Partial<Post>) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  likePost: (id: string, userId?: string) => Promise<void>;
  addComment: (postId: string, comment: Omit<Comment, 'id' | 'createdAt'>) => Promise<void>;

  addEmailDeliveryLog: (log: Omit<EmailDeliveryLog, 'id' | 'createdAt'>) => Promise<void>;
}

export const useCommunicationStore = create<CommunicationStore>((set, get) => ({
  news: [],
  messages: [],
  posts: [],
  emailDeliveryLogs: [],
  loading: false,

  clearStore: () => set({ news: [], messages: [], posts: [], emailDeliveryLogs: [], loading: false }),

  fetchData: () => {
    get().clearStore();
    set({ loading: true });
    const setupListeners = () => {
      const unsubs: (() => void)[] = [];
      unsubs.push(onSnapshot(collection(db, 'news'), snap => set({ news: snap.docs.map(d => ({ id: d.id, ...d.data() }) as NewsItem) })));
      unsubs.push(onSnapshot(collection(db, 'messages'), snap => set({ messages: snap.docs.map(d => ({ id: d.id, ...d.data() }) as Message) })));
      unsubs.push(onSnapshot(collection(db, 'posts'), snap => set({ posts: snap.docs.map(d => ({ id: d.id, ...d.data() }) as Post) })));
      unsubs.push(onSnapshot(collection(db, 'emailDeliveryLogs'), snap => set({ emailDeliveryLogs: snap.docs.map(d => ({ id: d.id, ...d.data() }) as EmailDeliveryLog) })));
      set({ loading: false });
      return () => unsubs.forEach(fn => fn());
    };
    import('../lib/firebase').then(({ auth }) => {
      if (auth.currentUser) { setupListeners(); }
      else {
        const unsub = auth.onAuthStateChanged(user => { if (user) { setupListeners(); unsub(); } });
        setTimeout(() => { unsub(); if (!auth.currentUser && get().loading) setupListeners(); }, 2000);
      }
    });
  },

  addNews: async (newsItem) => {
    try {
      const id = crypto.randomUUID();
      await setDoc(doc(db, 'news', id), { ...newsItem, id, date: new Date().toISOString() });
      toast.success('تمت إضافة الخبر');
    } catch (error) { 
      console.error("addNews error:", error);
      toast.error('فشل الإضافة'); 
    }
  },

  deleteNews: async (id) => {
    try { await deleteDoc(doc(db, 'news', id)); toast.success('تم الحذف'); } catch { toast.error('فشل الحذف'); }
  },

  addMessage: async (msg) => {
    try {
      const id = crypto.randomUUID();
      await setDoc(doc(db, 'messages', id), { ...msg, id, timestamp: new Date().toISOString(), read: false });
      toast.success('تم إرسال الرسالة');
    } catch { toast.error('فشل الإرسال'); }
  },

  markMessageRead: async (id) => {
    try { await setDoc(doc(db, 'messages', id), { read: true }, { merge: true }); } catch { console.error('Failed to mark as read'); }
  },

  addPost: async (post) => {
    try {
      const id = crypto.randomUUID();
      await setDoc(doc(db, 'posts', id), { ...post, id, createdAt: new Date().toISOString(), likes: [], comments: [] });
    } catch { toast.error('فشل نشر المنشور'); }
  },

  editPost: async (id, updates) => {
    try { await setDoc(doc(db, 'posts', id), updates, { merge: true }); toast.success('تم التعديل'); } catch { toast.error('فشل التعديل'); }
  },

  deletePost: async (id) => {
    try { await deleteDoc(doc(db, 'posts', id)); toast.success('تم الحذف'); } catch { toast.error('فشل الحذف'); }
  },

  likePost: async (id) => {
    try {
      const post = get().posts.find(p => p.id === id);
      if (!post) return;
      const likes = post.likedByCurrentUser ? Math.max(0, post.likes - 1) : post.likes + 1;
      await setDoc(doc(db, 'posts', id), { likes, likedByCurrentUser: !post.likedByCurrentUser }, { merge: true });
    } catch { console.error('Like failed'); }
  },

  addComment: async (postId, comment) => {
    try {
      const post = get().posts.find(p => p.id === postId);
      if (!post) return;
      const newComment = { ...comment, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      await setDoc(doc(db, 'posts', postId), { comments: [...post.comments, newComment] }, { merge: true });
    } catch { toast.error('فشل إضافة التعليق'); }
  },

  addEmailDeliveryLog: async (log) => {
    try {
      const id = crypto.randomUUID();
      await setDoc(doc(db, 'emailDeliveryLogs', id), { ...log, id, timestamp: new Date().toISOString() });
    } catch { console.error('Failed to log email'); }
  }
}));
