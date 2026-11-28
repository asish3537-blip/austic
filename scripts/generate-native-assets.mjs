import fs from 'node:fs/promises';
import {PILOT_KITCHENS} from '../lib/pilot-catalog.ts';
import {serviceLabel} from '../lib/service-labels.ts';
import {translated} from '../lib/ui-translations.ts';
const assets='android/app/src/main/assets';
await fs.mkdir(assets+'/food',{recursive:true});
await fs.mkdir(assets+'/fonts',{recursive:true});
for(const name of ['manrope','notosansdevanagari','notosansoriya']){await fs.copyFile('public/fonts/'+name+'.ttf',assets+'/fonts/'+name+'.ttf');await fs.copyFile('public/fonts/'+name+'-LICENSE.txt',assets+'/fonts/'+name+'-LICENSE.txt');}
await fs.writeFile(assets+'/review-demo.json',JSON.stringify(PILOT_KITCHENS.map(k=>({...k,locality:k.area,cuisine:'Practice meals · no food delivery'}))));
await fs.copyFile('public/assets/paustik-green-k-wordmark.png',assets+'/paustik-logo.png');
for(const name of ['egg','paneer','chicken','desi-chicken','mutton','mushroom'])await fs.copyFile('public/assets/pilot-'+name+'-curry.jpg',assets+'/food/'+name+'.jpg');
await fs.copyFile('public/assets/pilot-photo-credits.json',assets+'/photo-credits.json');
let source=await fs.readFile('android/app/src/main/java/in/paustik/mobile/KitchenActivity.java','utf8');
for(let i=0;i<8;i++)source=source.replace(/("(?:\\.|[^"\\])*")\s*\+\s*("(?:\\.|[^"\\])*")/g,(_,a,b)=>{try{return JSON.stringify(JSON.parse(a)+JSON.parse(b));}catch{return a+" + "+b;}});
const keys=new Set([...source.matchAll(/\b(?:label|button|field|choice|page|info|t)\(\s*"([^"\n]+)"/g)].map(m=>m[1]));
for(const s of ['OK','Cancel','Menu','Checkout','Online','Offline','Home','Orders','Account','Food shop','Sign in','Practice order','ORDER PLACED','CONFIRMED','PREPARING','READY FOR PICKUP','PICKED UP','OUT FOR DELIVERY','DELIVERED','CANCELLED'])keys.add(s);
for(const key of ["Vegetarian meal","Egg meal","Paneer meal","Chicken meal","Desi chicken meal","Mutton meal","Mushroom meal","Sattu","Sweets","Pickles","Other","Vegetarian","Vegan","Non-vegetarian","Reset password","Welcome back","Payment confirmation is pending. Check order status."])keys.add(key);
let overrides={};try{overrides=JSON.parse(await fs.readFile('android/native-copy.json','utf8'));}catch{}
const languages={en:{},hi:{},or:{}},missing=[];
for(const key of Object.keys(overrides))keys.add(key);
for(const key of keys){languages.en[key]=key;for(const language of ['hi','or']){const value=overrides[key]?.[language]??serviceLabel(key,language)??translated(key,language);languages[language][key]=value;if(value===key&&!/^https?:|^₹|^Paustik/.test(key))missing.push({key,language});}}
await fs.writeFile(assets+'/native-translations.json',JSON.stringify(languages));
await fs.mkdir('output/PhonePeNative14',{recursive:true});
await fs.writeFile('output/PhonePeNative14/missing-translations.json',JSON.stringify(missing,null,2));
console.log('Native assets prepared. UI keys:',keys.size,'Untranslated entries:',missing.length);
