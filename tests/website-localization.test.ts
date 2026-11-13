import assert from "node:assert/strict";
import {test} from "node:test";
import {translated} from "../lib/ui-translations";
import {guidedHelp} from "../lib/assistant-guides";
test("public discovery, install and help copy changes with the selected language",()=>{
 for(const language of ["hi","or"] as const){for(const text of ["A little home.","Find your next meal","Search a kitchen, cuisine or dish","Download the app","Become a Mother Kitchen Partner","Guided help · voice & text"]){assert.notEqual(translated(text,language),text,`${language}: ${text}`);}}
 assert.equal(translated("Paustik","or"),"ପୌଷ୍ଟିକ");assert.equal(translated("Sonali's own dish","or"),"Sonali's own dish");
});
test("guided help answers native-language order questions without performing actions",()=>{
 for(const [language,question] of [["hi","ऑर्डर कैसे देखें"],["or","ଅର୍ଡର୍ କିପରି ଦେଖିବି"]] as const){const result=guidedHelp(question,"CUSTOMER",language);assert.match(result.reply,language==="hi"?/ऑर्डर/:/ଅର୍ଡର୍/);assert(result.links.every(link=>!link.href.startsWith('/admin')));}
});
