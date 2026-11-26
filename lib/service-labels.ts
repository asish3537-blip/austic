import type {UiLanguage} from "@/lib/ui-translations";
const labels:Record<string,readonly [string,string,string]> = {};
for(const key of ["Meal subscriptions","Meal subscription","Explore subscriptions","Meal Plans","Explore meal subscriptions"])
 labels[key]=["Meal Plans","भोजन प्लान","ଭୋଜନ ପ୍ଲାନ୍"];
for(const key of ["One-time meals","One-time meal","Order a Meal","Explore one-time meals"])
 labels[key]=["Order a Meal","एक बार भोजन मँगाएँ","ଥରେ ଭୋଜନ ମଗାନ୍ତୁ"];
for(const key of ["Homemade products","Homemade Foods"])
 labels[key]=["Homemade Foods","घर के बने खाद्य पदार्थ","ଘର ତିଆରି ଖାଦ୍ୟ"];
Object.assign(labels,{
 "Common questions":["Common questions","आम सवाल","ସାଧାରଣ ପ୍ରଶ୍ନ"],
 "Support local mothers. Enjoy home-style meals nearby.":["Support local mothers. Enjoy home-style meals nearby.","स्थानीय माताओं का साथ दें। पास में घर जैसा खाना पाएँ।","ସ୍ଥାନୀୟ ମା’ମାନଙ୍କୁ ସହଯୋଗ କରନ୍ତୁ। ପାଖରେ ଘରୋଇ ଭୋଜନ ପାଆନ୍ତୁ।"],
 "Android v1.3 · Android 7 or newer.":["Android v1.3 · Android 7 or newer.","Android v1.3 · Android 7 या नया संस्करण।","Android v1.3 · Android 7 କିମ୍ବା ନୂଆ ସଂସ୍କରଣ।"],
 "Join Paustik":["Join Paustik","Paustik से जुड़ें","Paustik ରେ ଯୋଗ ଦିଅନ୍ତୁ"],
 "Disclaimers & information":["Disclaimers & information","अस्वीकरण और जानकारी","ଅସ୍ୱୀକରଣ ଓ ସୂଚନା"],
 "Welcome to Paustik":["Welcome to Paustik","Paustik में आपका स्वागत है","Paustik କୁ ସ୍ୱାଗତ"],
 "Continue browsing":["Continue browsing","अभी वेबसाइट देखें","ଏବେ ୱେବସାଇଟ୍ ଦେଖନ୍ତୁ"],
 "Partner accounts require Paustik approval.":["Partner accounts require Paustik approval.","पार्टनर खातों के लिए Paustik की मंजूरी चाहिए।","ପାର୍ଟନର ଆକାଉଣ୍ଟ ପାଇଁ Paustik ଅନୁମୋଦନ ଆବଶ୍ୟକ।"],
 "Create a Customer account":["Create a Customer account","ग्राहक खाता बनाएँ","ଗ୍ରାହକ ଆକାଉଣ୍ଟ ଖୋଲନ୍ତୁ"]
});
export function serviceLabel(text:string,language:UiLanguage){return labels[text]?.[language==="hi"?1:language==="or"?2:0];}
