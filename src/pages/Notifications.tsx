import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationStore } from '../stores/notificationStore';
import { Bell, CheckCircle, Clock, Info } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';

export const Notifications: React.FC = () => {
  const { user } = useAuth();
  const { notifications, fetchNotifications, markAsRead, loading } = useNotificationStore();

  useEffect(() => {
    if (user && user.role === 'parent') {
      fetchNotifications(user.id);
    }
  }, [user, fetchNotifications]);

  if (user?.role !== 'parent') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Cette page est réservée aux parents.</p>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">الإشعارات</h2>
        <p className="text-muted-foreground mt-1">تابع إشعارات المدرسة والغيابات الخاصة بأبنائك.</p>
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">صندوق الوارد</h3>
            <p className="text-sm text-slate-500">لديك {unreadCount} إشعار غير مقروء</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <p className="text-muted-foreground">جاري تحميل الإشعارات...</p>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="font-semibold text-slate-900">لا توجد إشعارات</h3>
              <p className="text-sm text-slate-500">لم تتلق أي إشعارات بعد.</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map(notif => (
            <Card key={notif.id} className={`transition-all ${notif.isRead ? 'bg-slate-50/50' : 'bg-white border-blue-100 shadow-md'}`}>
              <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.isRead ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-600'}`}>
                  {notif.type === 'attendance_marked' ? <Clock className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-semibold ${notif.isRead ? 'text-slate-700' : 'text-slate-900'}`}>{notif.title}</h4>
                    {!notif.isRead && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                        جديد
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-sm mb-2">{notif.body}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(notif.createdAt).toLocaleString('ar-SA')}
                  </p>
                </div>

                {!notif.isRead && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => markAsRead(notif.id)}
                    className="shrink-0"
                  >
                    <CheckCircle className="w-4 h-4 ml-2" />
                    تحديد كمقروء
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
