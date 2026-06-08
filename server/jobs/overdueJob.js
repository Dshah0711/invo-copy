const cron = require('node-cron');
const Invoice = require('../models/Invoice');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendOverdueReminderEmail } = require('../services/emailService');

// Runs every day at 8:00 AM
const startOverdueJob = () => {
  cron.schedule('0 8 * * *', async () => {
    console.log('🕐 Running overdue invoice detection job...');

    try {
      const now = new Date();

      // Find all "Sent" invoices whose due date has passed
      const overdueInvoices = await Invoice.find({
        status: 'Sent',
        dueDate: { $lt: now },
      });

      if (overdueInvoices.length === 0) {
        console.log('✅ No new overdue invoices found.');
        return;
      }

      console.log(`⚠️ Found ${overdueInvoices.length} overdue invoices. Processing...`);

      for (const invoice of overdueInvoices) {
        try {
          // Update status to Overdue
          invoice.status = 'Overdue';
          invoice.reminderSentAt = new Date();
          await invoice.save();

          // Get the user (for sender info)
          const user = await User.findById(invoice.userId);
          if (!user) continue;

          // Send reminder email
          if (invoice.client?.email) {
            await sendOverdueReminderEmail({
              to: invoice.client.email,
              clientName: invoice.client.name,
              invoiceNumber: invoice.invoiceNumber,
              total: invoice.total,
              dueDate: invoice.dueDate,
              currencySymbol: invoice.currencySymbol || '₹',
              senderName: user.name,
              senderCompany: user.company,
            });
          }

          // Create in-app notification
          await Notification.create({
            userId: invoice.userId,
            type: 'invoice_overdue',
            title: 'Invoice Overdue',
            message: `Invoice ${invoice.invoiceNumber} for ${invoice.client.name} is overdue by ${Math.floor((now - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24))} day(s). Reminder sent to ${invoice.client.email}.`,
            referenceId: invoice._id,
            referenceModel: 'Invoice',
            icon: 'alert-triangle',
          });

          console.log(`✅ Processed overdue: ${invoice.invoiceNumber}`);
        } catch (invoiceError) {
          console.error(`❌ Error processing invoice ${invoice.invoiceNumber}:`, invoiceError.message);
        }
      }

      console.log('✅ Overdue job completed.');
    } catch (error) {
      console.error('❌ Overdue job failed:', error.message);
    }
  });

  console.log('⏰ Overdue detection cron job scheduled (runs daily at 8:00 AM)');
};

module.exports = { startOverdueJob };
