const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { authenticate, allowRoles } = require('../middleware/auth');
const { collectGlobalReport } = require('../services/global-report.service');
const { renderGlobalReport } = require('../services/global-report-pdf.service');
const router=express.Router();
router.get('/global.pdf', authenticate, allowRoles('admin'), asyncHandler(async(req,res)=>{
  const report=await collectGlobalReport();
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition',`attachment; filename="rapport-global-lwasivanet-${report.generatedAt.slice(0,10)}.pdf"`);
  res.setHeader('Cache-Control','no-store');
  const doc=renderGlobalReport(report,res);
  doc.on('error',error=>res.destroy(error));
}));
module.exports=router;
