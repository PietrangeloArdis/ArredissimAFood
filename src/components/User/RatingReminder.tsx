import React, { useState } from 'react';
import { Star, AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useRatingData } from '../../hooks/useRatingData';

const RatingReminder: React.FC = () => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const { latestUnratedDate, loading } = useRatingData();

  const handleNavigateToRatings = () => {
    navigate('/home');
    setDismissed(true);
  };

  if (loading || dismissed || !latestUnratedDate) {
    return null;
  }

  const formattedDate = format(new Date(latestUnratedDate), 'EEEE d MMMM', { locale: it }).toLowerCase();

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-yellow-800">
            Valuta i tuoi piatti
          </h4>
          <p className="text-sm text-yellow-700 mt-1">
            Aiutaci a migliorare il servizio valutando i piatti che hai mangiato {formattedDate}.
          </p>
          <div className="mt-3 flex space-x-3">
            <button
              onClick={handleNavigateToRatings}
              className="inline-flex items-center text-sm text-yellow-600 hover:text-yellow-800 font-medium"
            >
              <Star className="h-4 w-4 mr-1" />
              Valuta ora
              <ArrowRight className="h-4 w-4 ml-1" />
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-sm text-yellow-500 hover:text-yellow-700"
            >
              Nascondi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RatingReminder;