"use client";
import {useState}from"react";
import {useRouter}from"next/navigation";
export function DemoMarketplaceSeed(){const[progress,setProgress]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState("");const router=useRouter();
 async function prepare(){setBusy(true);setMessage("");try{for(let family=1;family<=10;family++){setProgress(family);const r=await fetch("/api/admin/demo-marketplace",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({family})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not prepare demo records.");}setMessage("30 demo accounts and 40 linked orders are ready. Repeating this action does not create duplicates.");router.refresh();}catch(e){setMessage(e instanceof Error?e.message:"Connection failed. You can safely retry.");}finally{setBusy(false);}}
 return <div className="demo-seed-control"><button className="button button-light" type="button" disabled={busy} onClick={prepare}>{busy?`Preparing group ${progress} of 10…`:"Prepare demo marketplace"}</button>{message&&<p role="status">{message}</p>}</div>;
}
