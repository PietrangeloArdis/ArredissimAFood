import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { MenuSelection, User } from '../../types';
import { BarChart, Users, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const [selections, setSelections] = useState<MenuSelection[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth] = useState(new Date(2025, 5)); // June 2025
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      // Fetch users
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const usersData: User[] = [];
      usersSnapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() } as User);
      });
      setUsers(usersData);
      
      // Fetch selections for current month
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      const selectionsRef = collection(db, 'menuSelections');
      const q = query(
        selectionsRef,
        where('date', '>=', format(start, 'yyyy-MM-dd')),
        where('date', '<=', format(end, 'yyyy-MM-dd'))
      );
      
      const selectionsSnapshot = await getDocs(q);
      const selectionsData: MenuSelection[] = [];
      selectionsSnapshot.forEach((doc) => {
        selectionsData.push(doc.data() as MenuSelection);
      });
      setSelections(selectionsData);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };
  
  const getSelectionsPerDay = () => {
    const counts: Record<string, number> = {};
    selections.forEach((selection) => {
      counts[selection.date] = (counts[selection.date] || 0) + 1;
    });
    return counts;
  };
  
  const getTotalUsers = () => users.length;
  const getTotalSelections = () => selections.length;
  const getAverageSelectionsPerDay = () => {
    const days = Object.keys(getSelectionsPerDay()).length;
    return days ? (selections.length / days).toFixed(1) : '0';
  };
  
  const DashboardCard = ({ title, value, icon: Icon, color }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
  }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`rounded-full p-3 ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <p className="text-2xl font-semibold text-gray-700">{value}</p>
        </div>
      </div>
    </div>
  );
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="mt-1 text-gray-600">
          Summary for {format(currentMonth, 'MMMM yyyy')}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <DashboardCard
          title="Total Users"
          value={getTotalUsers()}
          icon={Users}
          color="bg-blue-500"
        />
        <DashboardCard
          title="Total Selections"
          value={getTotalSelections()}
          icon={CalendarIcon}
          color="bg-green-500"
        />
        <DashboardCard
          title="Avg. Selections/Day"
          value={getAverageSelectionsPerDay()}
          icon={BarChart}
          color="bg-purple-500"
        />
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Activity
          </h3>
          
          {selections.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Selections
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selections.slice(0, 5).map((selection, index) => {
                    const user = users.find(u => u.id === selection.userId);
                    return (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(parseISO(selection.date), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user?.email || 'Unknown User'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {selection.selectedItems.join(', ')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Selections</h3>
              <p className="mt-1 text-sm text-gray-500">
                No meal selections have been made yet.
              </p>
            </div>
          )}
          
          <div className="mt-6">
            <Link
              to="/admin/selections"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View all selections →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;