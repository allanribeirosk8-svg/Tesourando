import React from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: {
    appointment_id?: string;
    client_name?: string;
    service?: string;
    date?: string;
    time?: string;
  } | null;
  read: boolean;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export default function NotificacoesPanel({ open, onClose, notifications, onMarkRead, onMarkAllRead }: Props) {
  // Listen for back button to close
  React.useEffect(() => {
    if (open) {
      const handlePop = () => {
        onClose();
      };
      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', handlePop);
      return () => {
        window.removeEventListener('popstate', handlePop);
      };
    }
  }, [open, onClose]);

  // Group notifications by date
  const groupedNotifications = React.useMemo<Record<string, AppNotification[]>>(() => {
    const groups: Record<string, AppNotification[]> = {};
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    notifications.forEach(n => {
      const dateStr = n.created_at.split('T')[0];
      let groupKey = dateStr;
      if (dateStr === today) groupKey = 'HOJE';
      else if (dateStr === yesterday) groupKey = 'ONTEM';
      else {
         groupKey = dateStr.split('-').reverse().join('/');
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(n);
    });
    return groups;
  }, [notifications]);

  const hasUnread = notifications.some(n => !n.read);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[300]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose();
              }
            }}
            className="fixed inset-x-0 bottom-0 z-[301] bg-[#1E1B4B] rounded-t-3xl shadow-2xl flex flex-col h-[75vh]"
          >
            {/* Drag Handle */}
            <div className="w-full flex justify-center pt-4 pb-2 shrink-0">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 flex items-center justify-between pb-4 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-2">
                <Bell size={20} className="text-white" />
                <h2 className="text-lg font-black text-white">Notificações</h2>
              </div>
              {hasUnread && (
                <button
                  onClick={onMarkAllRead}
                  className="text-xs font-bold text-title flex items-center gap-1 hover:text-white transition-colors"
                >
                  <CheckCheck size={14} /> Marcar todas lidas
                </button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-surface/50 border border-white/5 flex items-center justify-center mb-4">
                    <Bell size={32} className="text-title opacity-50" />
                  </div>
                  <h3 className="font-bold text-white mb-2">Nenhuma notificação ainda</h3>
                  <p className="text-sm text-title font-medium max-w-[250px]">
                    Quando um cliente agendar, você será avisado aqui.
                  </p>
                </div>
              ) : (
                (Object.entries(groupedNotifications) as [string, AppNotification[]][]).map(([dateLabel, notifs]) => (
                  <div key={dateLabel} className="space-y-3">
                    <h3 className="text-[10px] font-black tracking-widest uppercase text-title px-1">
                      {dateLabel}
                    </h3>
                    <div className="space-y-2">
                      {notifs.map(n => {
                        const time = n.created_at.split('T')[1].substring(0, 5);
                        return (
                          <div
                            key={n.id}
                            onClick={() => {
                              if (!n.read) onMarkRead(n.id);
                            }}
                            className={`
                              p-4 rounded-2xl relative transition-all border border-b border-b-white/5 border-l-0 border-r-0 border-t-0
                              ${n.read ? 'bg-transparent border-white/5' : 'bg-surface shadow-[0_2px_8px_rgba(0,0,0,0.2)]'}
                            `}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-1 shrink-0 w-2 h-2 flex justify-center">
                                {!n.read && <div className="w-2 h-2 rounded-full bg-[#F97316] shadow-[0_0_8px_rgba(249,115,22,0.6)]" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline gap-2 mb-1">
                                  <h4 className={`text-sm tracking-tight truncate ${n.read ? 'text-white font-bold' : 'text-white font-black'}`}>
                                    {n.title}
                                  </h4>
                                  <span className="text-[10px] font-bold text-title shrink-0">
                                    {time}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-title leading-snug">
                                  {n.body}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
