import test from 'node:test';
import assert from 'node:assert/strict';
import {createReceiptUsage,usageDay} from '../netlify/functions/lib/receipt-usage.js';

test('uso compartido anónimo: escrituras concurrentes no pierden intentos, tokens ni día de reinicio',async()=>{
 let time=Date.parse('2026-10-17T12:00:00Z');const events=new Map();
 const tracker=createReceiptUsage(()=>({set:async(key,value)=>events.set(key,value),list:async({prefix})=>({blobs:[...events.keys()].filter(key=>key.startsWith(prefix)).map(key=>({key}))})}),()=>time);
 await Promise.all(Array.from({length:20},()=>tracker.attempt()));await Promise.all([tracker.tokens(123),tracker.tokens(456)]);
 let snapshot=await tracker.snapshot();assert.equal(snapshot.requests,20);assert.equal(snapshot.minuteRequests,20);assert.equal(snapshot.minuteInputTokens,579);assert.equal(snapshot.day,'2026-10-17');assert.match(snapshot.resetsAt,/2026-10-18T07:00:0[01]/);
 assert.ok([...events.values()].every(value=>value===''));
 time+=61000;snapshot=await tracker.snapshot();assert.equal(snapshot.requests,20);assert.equal(snapshot.minuteRequests,0);assert.equal(snapshot.minuteInputTokens,0);
 time=Date.parse('2026-10-18T07:00:01Z');snapshot=await tracker.snapshot();assert.equal(snapshot.requests,0);
 assert.equal(usageDay(Date.parse('2026-11-03T07:59:59Z')),'2026-11-02');assert.equal(usageDay(Date.parse('2026-11-03T08:00:00Z')),'2026-11-03');
});
