const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateEquipmentAllocation } = require('../src/controllers/payments.controller');

test('alloue la part materiel selectionnee sans depasser le paiement recu', () => {
  assert.equal(calculateEquipmentAllocation({
    paymentAmount: 10,
    invoiceEquipmentAmount: 20,
    invoiceEquipmentAlreadyAllocated: 0,
    contractEquipmentRemaining: 100,
    isEquipmentPayment: true
  }), 10);
});

test('une ligne materiel facturee ne compte pas comme payee sans selection explicite', () => {
  assert.equal(calculateEquipmentAllocation({
    paymentAmount: 10,
    invoiceEquipmentAmount: 10,
    invoiceEquipmentAlreadyAllocated: 0,
    contractEquipmentRemaining: 100,
    isEquipmentPayment: false
  }), 0);
});

test('ne deduit pas deux fois la part materiel de la meme facture', () => {
  assert.equal(calculateEquipmentAllocation({
    paymentAmount: 15,
    invoiceEquipmentAmount: 20,
    invoiceEquipmentAlreadyAllocated: 20,
    contractEquipmentRemaining: 80,
    isEquipmentPayment: true
  }), 0);
});

test('alloue seulement la part materiel encore disponible sur une facture partielle', () => {
  assert.equal(calculateEquipmentAllocation({
    paymentAmount: 15,
    invoiceEquipmentAmount: 20,
    invoiceEquipmentAlreadyAllocated: 10,
    contractEquipmentRemaining: 90,
    isEquipmentPayment: true
  }), 10);
});

test('plafonne la deduction au solde materiel du contrat', () => {
  assert.equal(calculateEquipmentAllocation({
    paymentAmount: 30,
    invoiceEquipmentAmount: 30,
    invoiceEquipmentAlreadyAllocated: 0,
    contractEquipmentRemaining: 7.5,
    isEquipmentPayment: true
  }), 7.5);
});

test('utilise tout le paiement lorsqu il est explicitement declare comme materiel', () => {
  assert.equal(calculateEquipmentAllocation({
    paymentAmount: 25,
    invoiceEquipmentAmount: 0,
    invoiceEquipmentAlreadyAllocated: 0,
    contractEquipmentRemaining: 60,
    isEquipmentPayment: true
  }), 25);
});

test('ne produit jamais une deduction negative ou superieure au paiement', () => {
  assert.equal(calculateEquipmentAllocation({
    paymentAmount: -10,
    invoiceEquipmentAmount: 20,
    invoiceEquipmentAlreadyAllocated: 0,
    contractEquipmentRemaining: 100,
    isEquipmentPayment: true
  }), 0);
});
