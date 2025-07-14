import React from 'react';
import { Bell, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';

const NotificationBanner: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, loading, markAsRead } = useNotifications();

  const handleNotificationClick = (notification: any) => {
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
    markAsRead(notification.id);
  };

  if (loading || notifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-6">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg shadow-sm"
        >
          <div className="flex items-start">
            <Bell className="h-5 w-5 text-amber-500 mt-0.5 mr-3" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-800">
                {notification.title}
              </h4>
              <p className="text-sm text-amber-700 mt-1">
                {notification.message}
              </p>
              {notification.actionUrl && (
                <button
                  onClick={() => handleNotificationClick(notification)}
                  className="mt-2 inline-flex items-center text-sm text-amber-600 hover:text-amber-800 font-medium"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Modifica la tua selezione
                </button>
              )}
            </div>
            <button
              onClick={() => markAsRead(notification.id)}
              className="ml-4 text-amber-400 hover:text-amber-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationBanner;