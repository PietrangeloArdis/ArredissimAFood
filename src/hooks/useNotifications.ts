import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { Notification } from '../types';
import toast from 'react-hot-toast';

export const useNotifications = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!currentUser) return;

    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('userId', '==', currentUser.uid),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      const notificationsList: Notification[] = [];

      snapshot.forEach((doc) => {
        notificationsList.push({
          id: doc.id,
          ...doc.data()
        } as Notification);
      });

      notificationsList.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setNotifications(notificationsList);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
      
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Errore nell\'aggiornamento della notifica');
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [currentUser]);

  return { notifications, loading, markAsRead, refetch: fetchNotifications };
};