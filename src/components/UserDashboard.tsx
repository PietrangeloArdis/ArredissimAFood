import React from 'react';
import { useNavigate } from 'react-router-dom';
import MealCalendar from './Calendar/MealCalendar';
import WeeklySummary from './User/WeeklySummary';
import MonthlySummary from './User/MonthlySummary';

const UserDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-6">
      <MealCalendar />
    </div>
  );
};

export default UserDashboard;