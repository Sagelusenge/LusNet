const test=require('node:test');const assert=require('node:assert/strict');const {validatePlan}=require('../src/utils/plan-input');
const valid={name:'Stream Plus',bandwidthMbps:10,recommendedUsage:'Télétravail',monthlyPriceUsd:20,isActive:true};
test('modification du prix et disponibilité',()=>{assert.deepEqual(validatePlan({...valid,monthlyPriceUsd:'25.50',isActive:false}),['Stream Plus',10,'Télétravail',25.5,false]);});
test('refuse prix négatifs, non numériques, débit fractionnaire et état ambigu',()=>{for(const change of [{monthlyPriceUsd:-1},{monthlyPriceUsd:'abc'},{monthlyPriceUsd:''},{monthlyPriceUsd:2.001},{bandwidthMbps:2.5},{isActive:'false'},{name:''}])assert.throws(()=>validatePlan({...valid,...change}));});
