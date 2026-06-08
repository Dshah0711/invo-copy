require('dotenv').config();
const mongoose = require('mongoose');

const User = require('./models/User');
const Client = require('./models/Client');
const Invoice = require('./models/Invoice');
const VendorInvoice = require('./models/VendorInvoice');
const Notification = require('./models/Notification');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB Connected\n');

  // ─── Clean slate ─────────────────────────────────────────────────────────────
  console.log('🧹 Clearing old seed data...');
  await Invoice.deleteMany({});
  await Client.deleteMany({});
  await VendorInvoice.deleteMany({});
  await Notification.deleteMany({});

  // ─── Demo User ────────────────────────────────────────────────────────────────
  let user = await User.findOne({ email: 'mansi@shah.com' });
  if (!user) {
    user = await User.create({
      name: 'Mansi Shah',
      email: 'mansi@shah.com',
      password: 'Mansi@12345',
      company: 'Shah Enterprises',
      phone: '+91 98765 43210',
      gstNumber: '24AAAAA0000A1Z5',
      invoicePrefix: 'INV',
      currency: 'INR',
      currencySymbol: '₹',
    });
    console.log('👤 Created demo user: mansi@shah.com / Mansi@12345');
  } else {
    user.invoiceCounter = 0;
    await user.save({ validateBeforeSave: false });
    console.log('👤 Using existing user:', user.email);
  }

  const uid = user._id;

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const ago = (months, days = 0) => {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    d.setDate(d.getDate() - days);
    return d;
  };
  const fromNow = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };

  // ─── Clients ─────────────────────────────────────────────────────────────────
  console.log('👥 Creating 6 clients...');
  const clientDefs = [
    { name: 'Rohan Mehta',   email: 'rohan@techsolutions.in',  phone: '+91 98001 11111', company: 'TechSolutions Pvt Ltd',    address: '42 MG Road, Bangalore 560001',       gstNumber: '29AABCT1332L1ZP' },
    { name: 'Priya Kapoor',  email: 'priya@designstudio.com',  phone: '+91 98002 22222', company: 'Kapoor Design Studio',      address: '18 Linking Road, Mumbai 400050',     gstNumber: '27AADFC2597N1Z9' },
    { name: 'Ankit Sharma',  email: 'ankit@startup.io',        phone: '+91 98003 33333', company: 'Startup Hub India',         address: '7 Connaught Place, New Delhi 110001',gstNumber: '07AAACS4026D1ZT' },
    { name: 'Sneha Patel',   email: 'sneha@realestate.com',    phone: '+91 98004 44444', company: 'Patel Realty Group',        address: '99 CG Road, Ahmedabad 380006',       gstNumber: '24AAACR3880M1ZD' },
    { name: 'Vikram Nair',   email: 'vikram@consulting.co',    phone: '+91 98005 55555', company: 'Nair Business Consulting',  address: '15 Marine Drive, Kochi 682001',      gstNumber: '32AAACN2485Q1ZF' },
    { name: 'Kavita Joshi',  email: 'kavita@ecommerce.com',    phone: '+91 98006 66666', company: 'Joshi E-Commerce',          address: '22 FC Road, Pune 411005',            gstNumber: '27AAACJ3640L1Z8' },
  ];
  const clients = await Client.insertMany(clientDefs.map(c => ({ ...c, userId: uid })));
  const [rohan, priya, ankit, sneha, vikram, kavita] = clients;
  console.log(`✅ ${clients.length} clients created\n`);

  // ─── Invoices ─────────────────────────────────────────────────────────────────
  console.log('📄 Creating 13 invoices...');
  const invoiceDefs = [
    // 5 months ago — Paid
    { ci: rohan,  items: [{ description: 'Website Redesign', quantity: 1, rate: 45000, amount: 45000 }, { description: 'SEO Optimization Package', quantity: 1, rate: 15000, amount: 15000 }], sub: 60000, tax: 10800, disc: 0, total: 70800, status: 'Paid',    due: ago(4, -15), paid: ago(4, -10), created: ago(5) },
    { ci: priya,  items: [{ description: 'Brand Identity Design', quantity: 1, rate: 35000, amount: 35000 }, { description: 'Logo Variations', quantity: 3, rate: 5000, amount: 15000 }],       sub: 50000, tax: 8550,  disc: 2500, total: 56050, status: 'Paid',    due: ago(4, -20), paid: ago(4, -18), created: ago(5,  -5) },
    // 4 months ago — Paid
    { ci: ankit,  items: [{ description: 'Product Strategy Consulting', quantity: 10, rate: 5000, amount: 50000 }, { description: 'Market Research Report', quantity: 1, rate: 20000, amount: 20000 }], sub: 70000, tax: 12600, disc: 0, total: 82600, status: 'Paid', due: ago(3, -10), paid: ago(3, -8), created: ago(4) },
    { ci: rohan,  items: [{ description: 'Mobile App Development', quantity: 1, rate: 120000, amount: 120000 }, { description: 'API Integration', quantity: 5, rate: 8000, amount: 40000 }], sub: 160000, tax: 25920, disc: 16000, total: 169920, status: 'Paid', due: ago(3, -5), paid: ago(3), created: ago(4, -10) },
    // 3 months ago — Paid
    { ci: sneha,  items: [{ description: 'Property Listing Website', quantity: 1, rate: 80000, amount: 80000 }, { description: 'Monthly Maintenance', quantity: 3, rate: 10000, amount: 30000 }], sub: 110000, tax: 19800, disc: 0, total: 129800, status: 'Paid', due: ago(2, -10), paid: ago(2, -8), created: ago(3) },
    { ci: vikram, items: [{ description: 'Business Process Audit', quantity: 1, rate: 40000, amount: 40000 }, { description: 'Workflow Optimization', quantity: 2, rate: 25000, amount: 50000 }], sub: 90000, tax: 16200, disc: 0, total: 106200, status: 'Paid', due: ago(2, -15), paid: ago(2, -12), created: ago(3, -8) },
    // 2 months ago — Paid
    { ci: kavita, items: [{ description: 'E-commerce Platform', quantity: 1, rate: 150000, amount: 150000 }, { description: 'Payment Gateway Integration', quantity: 1, rate: 25000, amount: 25000 }, { description: 'Admin Dashboard', quantity: 1, rate: 35000, amount: 35000 }], sub: 210000, tax: 35910, disc: 10500, total: 235410, status: 'Paid', due: ago(1, -10), paid: ago(1, -7), created: ago(2) },
    { ci: priya,  items: [{ description: 'UI/UX Design for Mobile App', quantity: 1, rate: 55000, amount: 55000 }, { description: 'Prototype & Wireframes', quantity: 1, rate: 20000, amount: 20000 }], sub: 75000, tax: 13500, disc: 0, total: 88500, status: 'Paid', due: ago(1, -5), paid: ago(1, -3), created: ago(2, -5) },
    // Last month — Sent & Overdue
    { ci: ankit,  items: [{ description: 'Digital Marketing Campaign', quantity: 1, rate: 30000, amount: 30000 }, { description: 'Social Media Management', quantity: 3, rate: 8000, amount: 24000 }, { description: 'Content Creation (10 posts)', quantity: 10, rate: 2000, amount: 20000 }], sub: 74000, tax: 13320, disc: 0, total: 87320, status: 'Sent', sentAt: ago(0, 20), due: fromNow(-5), created: ago(1) },
    { ci: rohan,  items: [{ description: 'Cloud Infrastructure Setup (AWS)', quantity: 1, rate: 60000, amount: 60000 }, { description: 'DevOps Consulting', quantity: 2, rate: 20000, amount: 40000 }], sub: 100000, tax: 18000, disc: 0, total: 118000, status: 'Overdue', sentAt: ago(1, -5), due: fromNow(-10), created: ago(1, -5) },
    // This month — Sent & Drafts
    { ci: sneha,  items: [{ description: 'CRM Software License (Annual)', quantity: 5, rate: 12000, amount: 60000 }, { description: 'Training & Onboarding', quantity: 1, rate: 15000, amount: 15000 }], sub: 75000, tax: 12150, disc: 7500, total: 79650, status: 'Sent', sentAt: new Date(), due: fromNow(15), created: fromNow(-10) },
    { ci: vikram, items: [{ description: 'Financial Analysis Report', quantity: 1, rate: 35000, amount: 35000 }, { description: 'Tax Planning Consultation', quantity: 4, rate: 5000, amount: 20000 }], sub: 55000, tax: 9900, disc: 0, total: 64900, status: 'Draft', due: fromNow(30), created: fromNow(-5) },
    { ci: kavita, items: [{ description: 'Inventory Management Module', quantity: 1, rate: 45000, amount: 45000 }, { description: 'Barcode Integration', quantity: 1, rate: 12000, amount: 12000 }, { description: 'Staff Training', quantity: 2, rate: 8000, amount: 16000 }], sub: 73000, tax: 13140, disc: 0, total: 86140, status: 'Draft', due: fromNow(20), created: new Date() },
  ];

  const year = new Date().getFullYear();
  const createdInvoices = [];
  for (let i = 0; i < invoiceDefs.length; i++) {
    const d = invoiceDefs[i];
    const invoiceNumber = `INV-${year}-${String(i + 1).padStart(4, '0')}`;
    const inv = await Invoice.create({
      userId: uid,
      invoiceNumber,
      client: { name: d.ci.name, email: d.ci.email, phone: d.ci.phone || '', company: d.ci.company || '', address: d.ci.address || '', gstNumber: d.ci.gstNumber || '' },
      clientId: d.ci._id,
      lineItems: d.items,
      subtotal: d.sub,
      taxType: 'GST',
      taxRate: 18,
      taxAmount: d.tax,
      discountPercent: d.disc > 0 ? 5 : 0,
      discountAmount: d.disc,
      total: d.total,
      currency: 'INR',
      currencySymbol: '₹',
      status: d.status,
      dueDate: d.due,
      issueDate: d.created,
      paidAt: d.paid || null,
      sentAt: d.sentAt || null,
      template: 'modern',
      notes: 'Thank you for your business! We look forward to working with you again.',
      terms: 'Payment due within 30 days. Late payments attract 1.5% monthly interest.',
    });
    // Manually set createdAt (bypass Mongoose auto)
    await Invoice.findByIdAndUpdate(inv._id, { $set: { createdAt: d.created } });
    createdInvoices.push(inv);
    console.log(`  📄 ${invoiceNumber} — ${d.ci.name} — ₹${d.total.toLocaleString('en-IN')} [${d.status}]`);
  }
  user.invoiceCounter = invoiceDefs.length;
  await user.save({ validateBeforeSave: false });

  // ─── Update client stats ──────────────────────────────────────────────────────
  console.log('\n📊 Updating client stats...');
  for (const client of clients) {
    const myInv = createdInvoices.filter(i => i.clientId.toString() === client._id.toString());
    await Client.findByIdAndUpdate(client._id, {
      invoiceCount: myInv.length,
      totalInvoiced: myInv.reduce((s, i) => s + i.total, 0),
      totalPaid: myInv.filter(i => i.status === 'Paid').reduce((s, i) => s + i.total, 0),
    });
  }

  // ─── Vendor Invoices ─────────────────────────────────────────────────────────
  console.log('\n📥 Creating 4 vendor invoices...');
  await VendorInvoice.insertMany([
    {
      userId: uid,
      vendorName: 'AWS India Pvt Ltd', vendorEmail: 'billing@aws.amazon.com',
      vendorAddress: 'World Trade Centre, Bangalore 560001',
      invoiceNumber: 'AWS-2024-06-8892',
      lineItems: [
        { description: 'EC2 Instance (m5.large) - 720 hrs', quantity: 720, rate: 20, amount: 14400 },
        { description: 'S3 Storage - 500GB', quantity: 500, rate: 0.023, amount: 11.5 },
        { description: 'CloudFront Data Transfer', quantity: 1, rate: 9614.5, amount: 9614.5 },
      ],
      subtotal: 24026, taxAmount: 4324, total: 28350,
      dueDate: fromNow(10), status: 'Approved', aiConfidence: 96,
      rawFileName: 'aws-invoice-june.pdf', fileType: 'pdf',
      vendorBankDetails: { bankName: 'HDFC Bank', accountNumber: '50100987654321', ifsc: 'HDFC0001234' },
    },
    {
      userId: uid,
      vendorName: 'Razorpay Software Pvt Ltd', vendorEmail: 'invoices@razorpay.com',
      vendorAddress: '1st Floor, SJR Cyber, Bangalore 560017',
      invoiceNumber: 'RZP-INV-2024-45231',
      lineItems: [{ description: 'Payment Gateway Fee (2% on ₹5,00,000)', quantity: 1, rate: 10000, amount: 10000 }],
      subtotal: 10000, taxAmount: 1800, total: 11800,
      dueDate: fromNow(5), status: 'Pending', aiConfidence: 91,
      rawFileName: 'razorpay-june.pdf', fileType: 'pdf',
      vendorBankDetails: { bankName: 'ICICI Bank', accountNumber: '123456789012', ifsc: 'ICIC0001234', upiId: 'razorpay@icici' },
    },
    {
      userId: uid,
      vendorName: 'Zoho Corporation', vendorEmail: 'billing@zoho.com',
      vendorAddress: 'Estancia IT Park, Chennai 600027',
      invoiceNumber: 'ZOHO-2024-001234',
      lineItems: [{ description: 'Zoho One - Annual Subscription (10 users)', quantity: 10, rate: 2000, amount: 20000 }],
      subtotal: 20000, taxAmount: 3600, total: 23600,
      dueDate: fromNow(-3), status: 'Paid', aiConfidence: 98,
      rawFileName: 'zoho-annual-plan.pdf', fileType: 'pdf',
      vendorBankDetails: { bankName: 'Yes Bank', accountNumber: '987654321098', ifsc: 'YESB0001234' },
    },
    {
      userId: uid,
      vendorName: 'Tata Power Mumbai', vendorEmail: 'customercare@tatapower.com',
      vendorAddress: 'Bombay House, 24 Homi Mody Street, Mumbai 400001',
      invoiceNumber: 'TP-MUM-2024-678901',
      lineItems: [{ description: 'Commercial Electricity - June 2024 (1400 units)', quantity: 1400, rate: 5, amount: 7000 }],
      subtotal: 7000, taxAmount: 1260, total: 8260,
      dueDate: fromNow(7), status: 'Pending', aiConfidence: 88,
      rawFileName: 'electricity-june.jpg', fileType: 'image',
      vendorBankDetails: { bankName: 'Bank of Baroda', accountNumber: '456789012345', ifsc: 'BARB0TATAPW', upiId: 'tatapowerpay@upi' },
    },
  ]);
  console.log('✅ 4 vendor invoices created');

  // ─── Notifications ────────────────────────────────────────────────────────────
  console.log('\n🔔 Creating notifications...');
  const overdueInv = createdInvoices.find(i => i.status === 'Overdue');
  await Notification.insertMany([
    {
      userId: uid,
      type: 'invoice_overdue',
      title: '⚠️ Invoice Overdue',
      message: `${overdueInv?.invoiceNumber} — ₹1,18,000 from Rohan Mehta is overdue by 10 days.`,
      referenceId: overdueInv?._id,
      referenceModel: 'Invoice',
      isRead: false,
    },
    {
      userId: uid,
      type: 'payment_received',
      title: '✅ Payment Received',
      message: 'INV-2024-0008 — ₹88,500 received from Kapoor Design Studio.',
      isRead: false,
    },
    {
      userId: uid,
      type: 'invoice_sent',
      title: '📧 Invoice Sent',
      message: 'INV-2024-0009 — ₹87,320 sent to Startup Hub India successfully.',
      isRead: true,
    },
  ]);

  // ─── Summary ──────────────────────────────────────────────────────────────────
  const paid = invoiceDefs.filter(i => i.status === 'Paid').reduce((s, i) => s + i.total, 0);
  const outstanding = invoiceDefs.filter(i => ['Sent', 'Draft', 'Overdue'].includes(i.status)).reduce((s, i) => s + i.total, 0);

  console.log('\n' + '═'.repeat(55));
  console.log('🎉  SEED COMPLETE');
  console.log('═'.repeat(55));
  console.log(`  👤  Login:       mansi@shah.com  |  Mansi@12345`);
  console.log(`  👥  Clients:     ${clients.length}`);
  console.log(`  📄  Invoices:    ${createdInvoices.length}  (8 Paid, 2 Sent, 1 Overdue, 2 Draft)`);
  console.log(`  📥  Payables:    4`);
  console.log(`  💰  Revenue:     ₹${paid.toLocaleString('en-IN')}`);
  console.log(`  ⏳  Outstanding: ₹${outstanding.toLocaleString('en-IN')}`);
  console.log('═'.repeat(55));
  console.log('\n  ✅  Open → http://localhost:5173\n');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(err => {
  console.error('\n❌ Seed failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
