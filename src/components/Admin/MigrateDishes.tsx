import React, { useState } from 'react';
import { collection, getDocs, doc, writeBatch, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Dish } from '../../types';
import toast from 'react-hot-toast';

const MigrateDishes: React.FC = () => {
  const [migrating, setMigrating] = useState(false);

  const handleMigration = async () => {
    if (!confirm('This will update all vegetarian dishes. Are you sure?')) {
      return;
    }

    setMigrating(true);
    try {
      const dishesRef = collection(db, 'dishes');
      const q = query(dishesRef, where('category', '==', 'Vegetariano'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        toast.success('No dishes need migration');
        return;
      }

      const batch = writeBatch(db);
      let count = 0;

      snapshot.forEach((docSnap) => {
        const dishRef = doc(db, 'dishes', docSnap.id);
        const data = docSnap.data() as Dish;

        batch.update(dishRef, {
          category: 'Altro',
          vegetarian: true,
          updatedAt: new Date().toISOString()
        });
        count++;
      });

      await batch.commit();
      toast.success(`Successfully migrated ${count} dishes`);
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('Error during migration');
    } finally {
      setMigrating(false);
    }
  };

  return (
    <button
      onClick={handleMigration}
      disabled={migrating}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
    >
      {migrating ? 'Migrating...' : 'Migrate Vegetarian Dishes'}
    </button>
  );
};

export default MigrateDishes;