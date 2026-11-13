import assert from "node:assert/strict";import {test} from "node:test";
import {startVoiceCapture,recognitionConstructor,type BrowserRecognition,type RecognitionResultEvent} from "../lib/browser-voice";
class Recognition implements BrowserRecognition{
 static instance:Recognition;lang="";continuous=true;interimResults=true;maxAlternatives=5;started=false;aborted=false;
 onresult:((e:RecognitionResultEvent)=>void)|null=null;onerror:((e:{error:string})=>void)|null=null;onend:(()=>void)|null=null;
 constructor(){Recognition.instance=this;}start(){this.started=true;}abort(){this.aborted=true;}
}
test("voice capture follows the selected Hindi or Odia language",()=>{
 for(const language of ["hi-IN","or-IN"]){const stop=startVoiceCapture(Recognition,{text:()=>{},error:()=>{},ended:()=>{}},20000,language);assert.equal(Recognition.instance.lang,language);stop();}
});
test("voice is single-utterance, transcribes for review, and stops without an app action",()=>{
 const words:string[]=[],errors:string[]=[];let ended=0;const stop=startVoiceCapture(Recognition,{text:t=>words.push(t),error:e=>errors.push(e),ended:()=>ended++});const r=Recognition.instance;
 assert(r.started);assert.equal(r.lang,"en-IN");assert.equal(r.continuous,false);assert.equal(r.interimResults,false);r.onresult?.({results:[[{transcript:"Where are my meals?"}]]});assert.deepEqual(words,["Where are my meals?"]);assert(r.aborted);assert.equal(ended,1);stop();assert.equal(ended,1);assert.equal(r.onresult,null);assert.deepEqual(errors,[]);
});
test("closing capture prevents late transcript/error callbacks",()=>{
 let text=0,error=0;const stop=startVoiceCapture(Recognition,{text:()=>text++,error:()=>error++,ended:()=>{}});const r=Recognition.instance,result=r.onresult!,failed=r.onerror!;stop();result({results:[[{transcript:"Late recording"}]]});failed({error:"network"});assert.equal(text,0);assert.equal(error,0);
});
test("microphone refusal gives a typed-input fallback and ends recording",()=>{
 let error="",ended=0;startVoiceCapture(Recognition,{text:()=>assert.fail("no transcription expected"),error:e=>error=e,ended:()=>ended++});Recognition.instance.onerror?.({error:"not-allowed"});assert.match(error,/keep typing/);assert.equal(ended,1);assert(Recognition.instance.aborted);
});
test("voice automatically stops after its bounded listening time",async()=>{
 let ended=0;startVoiceCapture(Recognition,{text:()=>{},error:()=>{},ended:()=>ended++},10);await new Promise(resolve=>setTimeout(resolve,30));assert.equal(ended,1);assert(Recognition.instance.aborted);
});
test("start/constructor failure cannot leave recording active",()=>{
 let ended=0;class Broken extends Recognition{start(){throw new Error("unavailable");}}startVoiceCapture(Broken,{text:()=>{},error:()=>{},ended:()=>ended++});assert.equal(ended,1);assert(Broken.instance.aborted);
 class NoConstructor extends Recognition{constructor(){super();throw new Error("unavailable");}}startVoiceCapture(NoConstructor,{text:()=>{},error:()=>{},ended:()=>ended++});assert.equal(ended,2);
});
test("large transcripts are bounded and unsupported browsers stay optional",()=>{
 let text="";startVoiceCapture(Recognition,{text:t=>text=t,error:()=>{},ended:()=>{}});Recognition.instance.onresult?.({results:[[{transcript:"a".repeat(2000)}]]});assert.equal(text.length,1200);assert.equal(recognitionConstructor({}),undefined);assert.equal(recognitionConstructor({webkitSpeechRecognition:Recognition}),Recognition);
});
