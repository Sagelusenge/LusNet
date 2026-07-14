const express = require('express');

const authRoutes = require('./auth.routes');
const budgetRoutes = require('./budget.routes');
const clientRoutes = require('./clients.routes');
const contractRoutes = require('./contracts.routes');
const dashboardRoutes = require('./dashboard.routes');
const documentRoutes = require('./documents.routes');
const equipmentRoutes = require('./equipment.routes');
const invoiceRoutes = require('./invoices.routes');
const notificationRoutes = require('./notifications.routes');
const paymentRoutes = require('./payments.routes');
const planRoutes = require('./plans.routes');
const publicRoutes = require('./public.routes');
const quoteRoutes = require('./quotes.routes');
const supportRoutes = require('./support.routes');
const userRoutes = require('./users.routes');
const clientSpaceRoutes = require('./client-space.routes');
const accountRequestRoutes = require('./account-requests.routes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API LWASIVA_NET operationnelle'
  });
});

router.use('/auth', authRoutes);
router.use('/budget', budgetRoutes);
router.use('/clients', clientRoutes);
router.use('/contracts', contractRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/documents', documentRoutes);
router.use('/equipment', equipmentRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/notifications', notificationRoutes);
router.use('/payments', paymentRoutes);
router.use('/plans', planRoutes);
router.use('/public', publicRoutes);
router.use('/quotes', quoteRoutes);
router.use('/support', supportRoutes);
router.use('/users', userRoutes);
router.use('/client-space', clientSpaceRoutes);
router.use('/account-requests', accountRequestRoutes);

module.exports = router;
