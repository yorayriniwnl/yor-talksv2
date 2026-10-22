import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type PaymentOperations } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function PaymentOperationsPage() {
  const currentUser=useAppStore(state=>state.currentUser);
  const role=currentUser?.role;
  const identityKey=`${currentUser?.id ?? ''}:${role ?? ''}`;
  const activeIdentity=useRef(identityKey);
  activeIdentity.current=identityKey;
  const requestSequence=useRef(0);
  const running=useRef(false);
  const [operations,setData]=useState<PaymentOperations|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[reason,setReason]=useState('');
  const [loadedFor,setLoadedFor]=useState('');
  const run=useCallback(async(work:()=>Promise<PaymentOperations>)=>{
    if(role!=='admin'||activeIdentity.current!==identityKey||running.current)return;
    const request=++requestSequence.current;
    const isCurrent=()=>request===requestSequence.current&&activeIdentity.current===identityKey;
    running.current=true;
    setLoadedFor(identityKey);setBusy(true);setError('');
    try{
      const value=await work();
      if(!value||!['jobs','disputes','checkouts','events','exposure'].every(key=>Array.isArray(value[key as keyof PaymentOperations])))throw new Error('Invalid operations response');
      if(isCurrent())setData(value);
    }catch(e){if(isCurrent())setError(e instanceof Error?e.message:'Payment operations could not load.');}
    finally{if(isCurrent()){running.current=false;setBusy(false);}}
  },[identityKey,role]);
  useEffect(()=>{
    setData(null);setError('');setReason('');setBusy(false);setLoadedFor(identityKey);
    if(role==='admin')void run(()=>api.getPaymentOperations());
    return()=>{requestSequence.current++;running.current=false;};
  },[identityKey,role,run]);
  const isCurrentView=loadedFor===identityKey;
  const data=isCurrentView?operations:null;
  const currentError=isCurrentView?error:'';
  const currentReason=isCurrentView?reason:'';
  const currentBusy=isCurrentView&&busy;
  return <main className="mx-auto max-w-4xl p-4 py-8 pb-28 space-y-6">
    <h1 className="font-display text-3xl font-bold">Payment operations</h1>
    {role!=='admin'?<p>Administrator access is required.</p>:<>
      <p className="text-sm text-muted-foreground">Review unresolved checkouts, disputes and failed reconciliation work. Each list shows up to 100 records. Reconciliation reads provider status. Refunds, dispute evidence and responses are handled in the provider dashboard by an authorized operator.</p>
      <Button disabled={currentBusy} variant="outline" onClick={()=>void run(()=>api.getPaymentOperations())}>{currentBusy?'Loading…':'Refresh payment operations'}</Button>
      {currentError&&<p role="alert" className="text-destructive">{currentError}</p>}
      <div className="space-y-2"><Label htmlFor="payment-operation-reason">Reason for reconciliation or retry</Label><Input id="payment-operation-reason" value={currentReason} maxLength={500} onChange={event=>setReason(event.target.value)} placeholder="Record why this action is needed"/><p className="text-xs text-muted-foreground">At least 10 characters. The actor, reason and target are recorded in the audit history.</p></div>
      {data&&<>
        <section className="space-y-3"><h2 className="text-xl font-semibold">Disputes</h2>{!data.disputes.length&&<p>No disputes recorded.</p>}{data.disputes.map(item=><article key={item.id} className="rounded-2xl border border-border/60 p-4 space-y-2"><p className="font-semibold">{item.product} · {item.status.replaceAll('_',' ')}</p><p className="text-sm break-all">{item.id}</p><p className="text-sm">Disputed ₹{(item.amount_minor/100).toFixed(2)} · Provider deduction ₹{(item.amount_deducted/100).toFixed(2)}</p>{item.respond_by&&<p className="text-sm">Respond by {new Date(item.respond_by).toLocaleString()}</p>}<p className="text-xs text-muted-foreground">Last checked: {item.checked_at?new Date(item.checked_at).toLocaleString():'Not yet checked'}</p><Button disabled={currentBusy||currentReason.trim().length<10} variant="outline" onClick={()=>void run(()=>api.reconcilePaymentDispute(item.id,currentReason.trim()))}>Reconcile dispute</Button></article>)}</section>
        <section className="space-y-3"><h2 className="text-xl font-semibold">Failed or retrying jobs</h2>{!data.jobs.length&&<p>No failed payment jobs.</p>}{data.jobs.map(item=><article key={item.id} className="rounded-2xl border border-border/60 p-4 space-y-2"><p>{item.kind.replaceAll('_',' ')} · {item.status} · Attempt {item.attempts}</p><p className="text-xs break-all">{item.id} · {item.last_error||'No error recorded'}</p>{item.status==='dead'&&<Button disabled={currentBusy||currentReason.trim().length<10} onClick={()=>void run(()=>api.retryPaymentJob(item.id,currentReason.trim()))}>Retry failed job</Button>}</article>)}</section>
        <section className="space-y-3"><h2 className="text-xl font-semibold">Checkouts needing review</h2>{!data.checkouts.length&&<p>No checkouts need review.</p>}{data.checkouts.map(item=><div key={item.id} className="rounded-xl border border-border/50 p-4"><p>{item.product} · {item.status.replaceAll('_',' ')} · ₹{(item.amount_minor/100).toFixed(2)}</p><p className="text-xs break-all">{item.id}</p></div>)}</section>
        <section><h2 className="text-xl font-semibold">Unprocessed events</h2>{data.events.length?data.events.map(item=><p key={item.event_id} className="text-sm break-all py-2">{item.event_id} · {item.event_type} · {item.status} · {item.last_error}</p>):<p>No unprocessed events.</p>}</section>
        <section><h2 className="text-xl font-semibold">Refund and chargeback overlap</h2><p className="text-sm text-muted-foreground">These amounts exceed the original payment and require provider balance review. Creator clawbacks are capped at the original credited amount.</p>{data.exposure.map(item=><p key={item.order_id} className="text-sm break-all py-2">{item.product} · {item.order_id} · ₹{(Number(item.excess_minor)/100).toFixed(2)}</p>)}</section>
      </>}
    </>}
  </main>;
}
