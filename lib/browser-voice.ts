export type RecognitionResultEvent={results:ArrayLike<ArrayLike<{transcript:string}>>};
export type BrowserRecognition={
 lang:string;continuous:boolean;interimResults:boolean;maxAlternatives:number;
 onresult:((event:RecognitionResultEvent)=>void)|null;
 onerror:((event:{error:string})=>void)|null;onend:(()=>void)|null;
 start:()=>void;abort:()=>void;
};
export type RecognitionConstructor=new()=>BrowserRecognition;
export function recognitionConstructor(target:unknown):RecognitionConstructor|undefined{
 const w=target as {SpeechRecognition?:RecognitionConstructor;webkitSpeechRecognition?:RecognitionConstructor};
 return w.SpeechRecognition??w.webkitSpeechRecognition;
}
export function recognitionError(error:string){
 if(error==="not-allowed"||error==="service-not-allowed")return "Microphone access was not allowed. You can keep typing, or enable the microphone in your browser settings.";
 if(error==="audio-capture")return "No microphone was found. You can type your question instead.";
 if(error==="no-speech")return "I did not hear a question. Tap Talk to Paustik and try again, or type below.";
 if(error==="network")return "Your browser could not reach its speech service. Check your connection or type your question.";
 return "Voice input is unavailable on this device. You can still type your question.";
}
export function startVoiceCapture(ctor:RecognitionConstructor,callbacks:{text:(value:string)=>void;error:(message:string)=>void;ended:()=>void},timeoutMs=20000,language="en-IN"){
 let recognition:BrowserRecognition;
 try{recognition=new ctor();}catch{callbacks.error("Voice input could not start. You can type your question instead.");callbacks.ended();return ()=>{};}
 let active=true;
 recognition.lang=language;recognition.continuous=false;recognition.interimResults=false;recognition.maxAlternatives=1;
 const release=()=>{if(!active)return;active=false;clearTimeout(timer);recognition.onresult=null;recognition.onerror=null;recognition.onend=null;callbacks.ended();};
 const stop=()=>{if(!active)return;release();try{recognition.abort();}catch{}};
 const timer=setTimeout(stop,timeoutMs);
 recognition.onresult=event=>{if(!active)return;const text=Array.from(event.results,result=>result[0]?.transcript??"").join(" ").trim().slice(0,1200);if(text)callbacks.text(text);stop();};
 recognition.onerror=event=>{if(!active)return;if(event.error!=="aborted")callbacks.error(recognitionError(event.error));stop();};recognition.onend=release;
 try{recognition.start();}catch{callbacks.error("Voice input could not start. Try again or type your question.");stop();}
 return stop;
}
