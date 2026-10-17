import { randomUUID } from 'node:crypto';
export const RECEIPT_LIMITS={daily:500,minute:15,inputTokensMinute:250000,appRequestsMinute:6,confirmedAt:'17/10/2026'};
export function usageDay(time){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time));}
function nextReset(time){let high=time+27*3600000,low=time;const day=usageDay(time);while(high-low>1000){const mid=Math.floor((high+low)/2);if(usageDay(mid)===day)low=mid;else high=mid;}return new Date(Math.ceil(high/1000)*1000).toISOString();}
// Append-only anonymous events; concurrent devices never overwrite a shared counter.
export function createReceiptUsage(store,now=()=>Date.now()){
  const write=async(kind,tokens=0)=>{const time=now();await store().set(`${kind}/${usageDay(time)}/${time}_${tokens}_${randomUUID()}`,'');};
  return{
    attempt:()=>write('requests'),tokens:value=>write('tokens',Number.isSafeInteger(value)&&value>=0?value:0),
    snapshot:async()=>{
      const time=now(),day=usageDay(time);
      const [requests,tokens]=await Promise.all([store().list({prefix:`requests/${day}/`}),store().list({prefix:`tokens/${day}/`})]);
      const recent=key=>Number(key.split('/').at(-1).split('_')[0])>time-60000;
      return{available:true,day,requests:requests.blobs.length,minuteRequests:requests.blobs.filter(row=>recent(row.key)).length,minuteInputTokens:tokens.blobs.filter(row=>recent(row.key)).reduce((sum,row)=>sum+Number(row.key.split('/').at(-1).split('_')[1]),0),resetsAt:nextReset(time)};
    }
  };
}
