import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import { format, subDays } from 'date-fns';
import { it } from 'date-fns/locale';

// Initialize Firebase Admin
admin.initializeApp();

interface Rating {
  dishId: string;
  rating: number;
  count: number;
}

const transporter = nodemailer.createTransport({
  host: functions.config().smtp.host,
  port: functions.config().smtp.port,
  secure: true,
  auth: {
    user: functions.config().smtp.user,
    pass: functions.config().smtp.pass,
  },
});

export const sendWeeklyReport = functions.pubsub
  .schedule('0 8 * * 1') // Every Monday at 8:00 AM
  .timeZone('Europe/Rome')
  .onRun(async (context) => {
    try {
      // Get all admin users
      const adminUsers = await admin.firestore()
        .collection('users')
        .where('role', '==', 'admin')
        .where('active', '==', true)
        .get();

      if (adminUsers.empty) {
        console.log('No admin users found');
        return null;
      }

      // Get ratings from the last week
      const today = new Date();
      const lastWeek = subDays(today, 7);
      
      const ratingsSnapshot = await admin.firestore()
        .collection('menuFeedbacks')
        .where('date', '>=', format(lastWeek, 'yyyy-MM-dd'))
        .where('date', '<=', format(today, 'yyyy-MM-dd'))
        .get();

      // Calculate average ratings
      const ratings: Record<string, Rating> = {};
      
      ratingsSnapshot.forEach(doc => {
        const data = doc.data();
        if (!ratings[data.dishId]) {
          ratings[data.dishId] = {
            dishId: data.dishId,
            rating: data.rating,
            count: 1
          };
        } else {
          ratings[data.dishId].rating += data.rating;
          ratings[data.dishId].count += 1;
        }
      });

      // Calculate averages and sort by rating
      const sortedRatings = Object.values(ratings)
        .map(r => ({
          ...r,
          averageRating: Number((r.rating / r.count).toFixed(1))
        }))
        .sort((a, b) => b.averageRating - a.averageRating)
        .slice(0, 5);

      // Generate email content
      const emailContent = `
        <h2>Report Settimanale Valutazioni Piatti</h2>
        <p>Periodo: ${format(lastWeek, 'd MMMM', { locale: it })} - ${format(today, 'd MMMM yyyy', { locale: it })}</p>
        
        <h3>Top 5 Piatti della Settimana</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Piatto</th>
            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Valutazione Media</th>
            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Numero Voti</th>
          </tr>
          ${sortedRatings.map((item, index) => `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.dishId}</td>
              <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">⭐ ${item.averageRating}</td>
              <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">${item.count}</td>
            </tr>
          `).join('')}
        </table>
        
        <p style="margin-top: 20px; color: #6b7280;">
          Questo report viene inviato automaticamente ogni lunedì alle 8:00.
        </p>
      `;

      // Send email to each admin
      const emailPromises = adminUsers.docs.map(async (adminDoc) => {
        const adminEmail = adminDoc.data().email;
        
        await transporter.sendMail({
          from: `"ArredissimA Food" <${functions.config().smtp.user}>`,
          to: adminEmail,
          subject: `Report Settimanale Valutazioni - ${format(today, 'd MMMM yyyy', { locale: it })}`,
          html: emailContent,
        });
        
        console.log(`Weekly report sent to ${adminEmail}`);
      });

      await Promise.all(emailPromises);
      
      return null;
    } catch (error) {
      console.error('Error sending weekly report:', error);
      return null;
    }
  });