const HttpError = require('./http-error');
function validatePlan(body) {
  const { name, recommendedUsage, bandwidthMbps, monthlyPriceUsd, isActive = true } = body;
  const bandwidth = Number(bandwidthMbps), price = Number(monthlyPriceUsd);
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120 || typeof recommendedUsage !== 'string' || !recommendedUsage.trim() || recommendedUsage.length > 255 || bandwidthMbps === '' || bandwidthMbps == null || !Number.isInteger(bandwidth) || bandwidth < 0 || bandwidth > 4294967295 || monthlyPriceUsd === '' || monthlyPriceUsd == null || !Number.isFinite(price) || price < 0 || price > 99999999.99 || Math.abs(price * 100 - Math.round(price * 100)) > .00001 || typeof isActive !== 'boolean') {
    throw new HttpError(400, 'Nom, usages, débit entier positif ou nul et prix valide à deux décimales obligatoires');
  }
  return [name.trim(), bandwidth, recommendedUsage.trim(), price, isActive];
}
module.exports = { validatePlan };
