"use client";

import Link from "next/link";
import {serviceLabel} from "@/lib/service-labels";
import { useState } from "react";
import { useUiLanguage } from "@/components/ui-language";

type Role = "customer" | "mother" | "courier" | "admin";
type Copy = readonly [string, string, string];
const roles: Record<Role, Copy> = { customer: ["Customer", "ग्राहक", "ଗ୍ରାହକ"], mother: ["Mother Kitchen", "मदर किचन", "ମା’ଙ୍କ ରୋଷେଇଘର"], courier: ["Delivery partner", "डिलीवरी साथी", "ଡେଲିଭରି ସାଥୀ"], admin: ["Admin", "प्रशासक", "ପ୍ରଶାସକ"] };
const stages: Copy[] = [
  ["Order placed", "ऑर्डर मिला", "ଅର୍ଡର ମିଳିଲା"], ["Confirmed", "स्वीकृत", "ସ୍ୱୀକୃତ"], ["Preparing", "तैयारी जारी", "ପ୍ରସ୍ତୁତି ଚାଲିଛି"], ["Ready for pickup", "पिकअप के लिए तैयार", "ପିକ୍‌ଅପ୍ ପାଇଁ ପ୍ରସ୍ତୁତ"],
  ["Courier assigned", "डिलीवरी साथी नियुक्त", "ଡେଲିଭରି ସାଥୀ ନିଯୁକ୍ତ"], ["Picked up", "पिकअप हुआ", "ପିକ୍‌ଅପ୍ ହେଲା"], ["Out for delivery", "डिलीवरी के लिए निकला", "ଡେଲିଭରି ପାଇଁ ବାହାରିଲା"], ["Delivered", "डिलीवर हुआ", "ପହଞ୍ଚିଲା"],
];

/** Isolated teaching sandbox. Never creates accounts, orders, payments or messages. */
export function AppReview({ initialRole = "customer" }: { initialRole?: Role }) {
  const { language } = useUiLanguage();
  const c = (copy: Copy) => serviceLabel(copy[0],language) ?? copy[language === "hi" ? 1 : language === "or" ? 2 : 0];
  const [role, setRole] = useState<Role>(initialRole);
  const [declined,setDeclined]=useState(false);
  const [mode, setMode] = useState("meal");
  const [days, setDays] = useState(3);
  const [online, setOnline] = useState(true);
  const [discount, setDiscount] = useState(false);
  const [stage, setStage] = useState(-1);
  const [request, setRequest] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [error, setError] = useState("");
  const [batchFull, setBatchFull] = useState(false);
  const count = mode === "subscription" ? days : 1;
  const food = (mode === "product" ? 80 : 99) * count;
  const total = food + 9 * count - (discount ? 10 : 0);
  const money = (n: number) => new Intl.NumberFormat(language === "or" ? "or-IN" : language === "hi" ? "hi-IN" : "en-IN", { style: "currency", currency: "INR" }).format(n);
  function reset() { setDeclined(false);setStage(-1); setRequest(false); setAgreed(false); setPickup(""); setDrop(""); setError(""); setBatchFull(false); }
  function verify(value: string, expected: string, next: number) {
    if (value !== expected) { setError(c(["Incorrect sample code. Try again.", "नमूना कोड गलत है। दोबारा डालें।", "ନମୁନା କୋଡ୍ ଭୁଲ୍। ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।"])); return; }
    setError(""); setStage(next);
  }
  return <section className="app-review">
    <header className="review-heading"><div><span className="eyebrow">{c(["Interactive app review", "ऐप का इंटरैक्टिव परिचय", "ଆପ୍‌ର ଇଣ୍ଟରାକ୍ଟିଭ୍ ପରିଚୟ"])}</span><h2>{c(["One order. Every role.", "एक ऑर्डर। हर भूमिका।", "ଗୋଟିଏ ଅର୍ଡର। ପ୍ରତ୍ୟେକ ଭୂମିକା।"])}</h2></div><button type="button" className="plain-button" onClick={reset}>{c(["Reset preview", "फिर शुरू करें", "ପୁଣି ଆରମ୍ଭ କରନ୍ତୁ"])}</button></header>
    <p className="review-notice">{c(["Sample data only. No real login, order, payment, notification or delivery is created. Switch roles to follow the same sample order.", "यह केवल नमूना है। असली लॉगिन, ऑर्डर, भुगतान, सूचना या डिलीवरी नहीं होगी। उसी ऑर्डर को देखने के लिए भूमिका बदलें।", "ଏହା କେବଳ ନମୁନା। ପ୍ରକୃତ ଲଗ୍‌ଇନ୍, ଅର୍ଡର, ପେମେଣ୍ଟ, ସୂଚନା କିମ୍ବା ଡେଲିଭରି ହେବ ନାହିଁ। ସେହି ଅର୍ଡର ଦେଖିବାକୁ ଭୂମିକା ବଦଳାନ୍ତୁ।"])}</p>
    <div className="review-tabs" role="group" aria-label={c(["Preview role", "भूमिका", "ଭୂମିକା"])}>{(Object.keys(roles) as Role[]).map(r => <button key={r} type="button" aria-pressed={role === r} onClick={() => { setRole(r); setError(""); }}>{c(roles[r])}</button>)}</div>
    <div className="review-layout"><div className="review-card">
      <h3>{c(roles[role])}</h3>
      {role === "customer" && <>
        <label>{c(["Choose a purchase", "क्या खरीदना है", "କ’ଣ କିଣିବେ"])}<select value={mode} disabled={stage >= 0 || request} onChange={e => setMode(e.target.value)}><option value="meal">{c(["One-time meal", "एक बार का भोजन", "ଗୋଟିଏ ଥର ଭୋଜନ"])}</option><option value="subscription">{c(["Meal subscription", "भोजन सदस्यता", "ଭୋଜନ ସଦସ୍ୟତା"])}</option><option value="product">{c(["Homemade products", "घर के बने उत्पाद", "ଘର ତିଆରି ଉତ୍ପାଦ"])}</option></select></label>
        {mode === "subscription" && <label>{c(["Meal days", "भोजन के दिन", "ଭୋଜନ ଦିନ"])}<select value={days} disabled={stage >= 0} onChange={e => setDays(Number(e.target.value))}>{[3,4,5,6,7].map(n => <option key={n}>{n}</option>)}</select></label>}
        <p>{mode === "product" ? c(["Sweet sattu mix · 500 g · sample", "मीठा सत्तू · 500 ग्राम · नमूना", "ମିଠା ସତ୍ତୁ · ୫୦୦ ଗ୍ରାମ୍ · ନମୁନା"]) : c(["Home-style lunch · sample", "घर जैसा दोपहर का खाना · नमूना", "ଘରୋଇ ମଧ୍ୟାହ୍ନ ଭୋଜନ · ନମୁନା"])}</p>
        <label className="review-check"><input type="checkbox" checked={online} disabled={stage >= 0} onChange={e => setOnline(e.target.checked)}/>{c(["Eligible courier online within 25 km (sample)", "25 किमी में उपलब्ध डिलीवरी साथी (नमूना)", "୨୫ କିମି ମଧ୍ୟରେ ଉପଲବ୍ଧ ଡେଲିଭରି ସାଥୀ (ନମୁନା)"])}</label>
        {!online && <p role="status">{c(["Currently no eligible delivery partners online. Browsing stays available; new checkout is blocked.", "अभी कोई योग्य डिलीवरी साथी ऑनलाइन नहीं है। उत्पाद देख सकते हैं; नया चेकआउट बंद है।", "ବର୍ତ୍ତମାନ ଯୋଗ୍ୟ ଡେଲିଭରି ସାଥୀ ଅନ୍‌ଲାଇନ୍ ନାହାନ୍ତି। ଦେଖିପାରିବେ; ନୂଆ ଚେକ୍‌ଆଉଟ୍ ବନ୍ଦ।"])}</p>}
        <label className="review-check"><input type="checkbox" checked={discount} disabled={stage >= 0} onChange={e => setDiscount(e.target.checked)}/>{c(["Illustrative ₹10 offer — not a live coupon", "नमूना ₹10 छूट — असली कूपन नहीं", "ନମୁନା ₹୧୦ ରିହାତି — ପ୍ରକୃତ କୁପନ୍ ନୁହେଁ"])}</label>
        <dl className="review-receipt"><div><dt>{c(["Food", "भोजन", "ଭୋଜନ"])}</dt><dd>{money(food)}</dd></div><div><dt>{c(["Delivery estimate", "डिलीवरी अनुमान", "ଡେଲିଭରି ଆକଳନ"])}</dt><dd>{money(9 * count)}</dd></div>{discount && <div><dt>{c(["Sample discount", "नमूना छूट", "ନମୁନା ରିହାତି"])}</dt><dd>−{money(10)}</dd></div>}<div><dt>{c(["Total", "कुल", "ମୋଟ"])}</dt><dd>{money(total)}</dd></div><div><dt>{c(["Sample wallet used", "नमूना वॉलेट से", "ନମୁନା ୱାଲେଟ୍ ବ୍ୟବହାର"])}</dt><dd>{money(Math.min(555, total))}</dd></div><div><dt>{c(["Remaining payment", "बाकी भुगतान", "ବାକି ପେମେଣ୍ଟ"])}</dt><dd>{money(Math.max(0, total - 555))}</dd></div></dl>
        {stage < 0 && (mode === "product" && !agreed ? <><p>{request ? c(["Request sent. Switch to Mother Kitchen to suggest a delivery time.", "अनुरोध भेजा। समय सुझाने के लिए मदर किचन चुनें।", "ଅନୁରୋଧ ପଠାଗଲା। ସମୟ ପ୍ରସ୍ତାବ ପାଇଁ ମା’ଙ୍କ ରୋଷେଇଘର ବାଛନ୍ତୁ।"]) : c(["Preferred time is optional. Agree a time with the kitchen before checkout.", "पसंदीदा समय वैकल्पिक है। चेकआउट से पहले किचन से समय तय करें।", "ପସନ୍ଦର ସମୟ ଇଚ୍ଛାଧୀନ। ଚେକ୍‌ଆଉଟ୍ ପୂର୍ବରୁ ରୋଷେଇଘର ସହ ସମୟ ସ୍ଥିର କରନ୍ତୁ।"])}</p><button type="button" className="button" disabled={request || !online} onClick={() => setRequest(true)}>{c(["Simulate product request", "नमूना उत्पाद अनुरोध", "ନମୁନା ଉତ୍ପାଦ ଅନୁରୋଧ"])}</button></> : <button type="button" className="button" disabled={!online} onClick={() => setStage(0)}>{c(["Simulate checkout", "नमूना चेकआउट", "ନମୁନା ଚେକ୍‌ଆଉଟ୍"])}</button>)}
        {agreed && stage < 0 && <p>{c(["Sample time agreed: tomorrow, 12:30 IST.", "नमूना समय तय: कल 12:30 बजे।", "ନମୁନା ସମୟ ସ୍ଥିର: ଆସନ୍ତାକାଲି ୧୨:୩୦।"])}</p>}
        {stage === 6 && <p className="review-code">{c(["Customer handover code", "ग्राहक हैंडओवर कोड", "ଗ୍ରାହକ ହସ୍ତାନ୍ତର କୋଡ୍"])}: <strong>654321</strong></p>}
      </>}
      {role === "mother" && <>
        <p>{c(["Incoming orders first. Preparation and pickup stay connected to customer tracking.", "नए ऑर्डर पहले। तैयारी और पिकअप ग्राहक की ट्रैकिंग से जुड़े हैं।", "ନୂଆ ଅର୍ଡର ପ୍ରଥମେ। ପ୍ରସ୍ତୁତି ଓ ପିକ୍‌ଅପ୍ ଗ୍ରାହକଙ୍କ ଟ୍ରାକିଂ ସହ ଯୋଡ଼ିତ।"])}</p>
        {request && !agreed && <button type="button" className="button" onClick={() => setAgreed(true)}>{c(["Suggest tomorrow 12:30 · sample", "कल 12:30 सुझाएँ · नमूना", "ଆସନ୍ତାକାଲି ୧୨:୩୦ ପ୍ରସ୍ତାବ · ନମୁନା"])}</button>}
        {stage >= 0 && stage < 3 && <button type="button" className="button" onClick={() => setStage(stage + 1)}>{c(stage === 0 ? ["Accept order", "ऑर्डर स्वीकार करें", "ଅର୍ଡର ଗ୍ରହଣ କରନ୍ତୁ"] : stage === 1 ? ["Start cooking", "खाना बनाना शुरू करें", "ରୋଷେଇ ଆରମ୍ଭ କରନ୍ତୁ"] : ["Mark ready for pickup", "पिकअप के लिए तैयार", "ପିକ୍‌ଅପ୍ ପାଇଁ ପ୍ରସ୍ତୁତ କରନ୍ତୁ"])}</button>}
        {stage === 4 && <p className="review-code">{c(["Kitchen pickup code", "किचन पिकअप कोड", "ରୋଷେଇଘର ପିକ୍‌ଅପ୍ କୋଡ୍"])}: <strong>123456</strong></p>}
        <Link href="/mother-guide">{c(["Kitchen setup & food licence guide →", "किचन और खाद्य लाइसेंस गाइड →", "ରୋଷେଇଘର ଓ ଖାଦ୍ୟ ଲାଇସେନ୍ସ ଗାଇଡ୍ →"])}</Link>
      </>}
      {role === "courier" && <>
        <p>{c(["Scheduled jobs remain visible. Acceptance opens only after food is ready. Real pickup hours are 06:00–20:30 IST; this sandbox can run anytime.", "निर्धारित काम दिखते रहते हैं। भोजन तैयार होने पर ही स्वीकार कर सकते हैं। असली पिकअप समय 06:00–20:30 है; यह नमूना कभी भी चलता है।", "ନିର୍ଦ୍ଧାରିତ କାମ ଦେଖାଯାଏ। ଭୋଜନ ପ୍ରସ୍ତୁତ ହେଲେ ଗ୍ରହଣ କରିପାରିବେ। ପ୍ରକୃତ ପିକ୍‌ଅପ୍ ସମୟ ୦୬:୦୦–୨୦:୩୦; ନମୁନା ଯେକୌଣସି ସମୟରେ ଚାଲେ।"])}</p>
        {stage < 3 && <p>{c(["Waiting for a ready order", "तैयार ऑर्डर का इंतज़ार", "ପ୍ରସ୍ତୁତ ଅର୍ଡରକୁ ଅପେକ୍ଷା"])}</p>}
        {stage === 3 && !declined && <button type="button" className="button" onClick={() => setStage(4)}>{c(["Accept delivery", "डिलीवरी स्वीकार करें", "ଡେଲିଭରି ଗ୍ରହଣ କରନ୍ତୁ"])}</button>}
        {stage>=0&&stage<=3&&!declined&&<button type="button" className="button button-quiet offer-decline" onClick={()=>setDeclined(true)}>{c(["Decline","अस्वीकार करें","ଅସ୍ୱୀକାର କରନ୍ତୁ"])}</button>}{declined&&<p role="status">{c(["You declined this sample offer. The customer order stays open for another courier.","आपने नमूना प्रस्ताव अस्वीकार किया। ग्राहक का ऑर्डर दूसरे साथी के लिए खुला है।","ଆପଣ ନମୁନା ପ୍ରସ୍ତାବ ଅସ୍ୱୀକାର କଲେ। ଗ୍ରାହକଙ୍କ ଅର୍ଡର ଅନ୍ୟ ସାଥୀଙ୍କ ପାଇଁ ଖୋଲା ରହିବ।"])}</p>}
        {stage === 4 && <form onSubmit={e => { e.preventDefault(); verify(pickup, "123456", 5); }}><label>{c(["Pickup code from Mother", "माँ से पिकअप कोड", "ମା’ଙ୍କଠାରୁ ପିକ୍‌ଅପ୍ କୋଡ୍"])}<input inputMode="numeric" autoComplete="off" maxLength={6} value={pickup} onChange={e => setPickup(e.target.value)}/></label><button className="button" type="submit">{c(["Verify pickup", "पिकअप सत्यापित करें", "ପିକ୍‌ଅପ୍ ଯାଞ୍ଚ କରନ୍ତୁ"])}</button></form>}
        {stage === 5 && <button type="button" className="button" onClick={() => setStage(6)}>{c(["Start delivery", "डिलीवरी शुरू करें", "ଡେଲିଭରି ଆରମ୍ଭ କରନ୍ତୁ"])}</button>}
        {stage === 6 && <form onSubmit={e => { e.preventDefault(); verify(drop, "654321", 7); }}><label>{c(["Handover code from customer", "ग्राहक से हैंडओवर कोड", "ଗ୍ରାହକଙ୍କଠାରୁ ହସ୍ତାନ୍ତର କୋଡ୍"])}<input inputMode="numeric" autoComplete="off" maxLength={6} value={drop} onChange={e => setDrop(e.target.value)}/></label><button className="button" type="submit">{c(["Verify delivery", "डिलीवरी सत्यापित करें", "ଡେଲିଭରି ଯାଞ୍ଚ କରନ୍ତୁ"])}</button></form>}
        <p>{c(["Up to three compatible nearby orders per batch, subject to carrying capacity. Bulk jobs need a separate arrangement.", "क्षमता के अनुसार एक बैच में पास के अधिकतम तीन उपयुक्त ऑर्डर। बड़े ऑर्डर की अलग व्यवस्था।", "ବହନ କ୍ଷମତା ଅନୁଯାୟୀ ପାଖାପାଖି ସର୍ବାଧିକ ତିନିଟି ଉପଯୁକ୍ତ ଅର୍ଡର। ବଡ଼ ଅର୍ଡର ପାଇଁ ଅଲଗା ବ୍ୟବସ୍ଥା।"])}</p>
        <button type="button" className="plain-button" onClick={() => setBatchFull(true)}>{c(["Try adding a fourth job", "चौथा काम जोड़कर देखें", "ଚତୁର୍ଥ କାମ ଯୋଡ଼ି ଦେଖନ୍ତୁ"])}</button>{batchFull && <p role="status">{c(["Batch limit reached: maximum three orders.", "बैच की सीमा: अधिकतम तीन ऑर्डर।", "ବ୍ୟାଚ୍ ସୀମା: ସର୍ବାଧିକ ତିନି ଅର୍ଡର।"])}</p>}
      </>}
      {role === "admin" && <p>{c(["Operations reviews orders, kitchen licence evidence, feedback and earnings. This preview grants no admin access and triggers no approvals or payouts.", "संचालन में ऑर्डर, लाइसेंस प्रमाण, प्रतिक्रिया और आय की समीक्षा होती है। यह नमूना प्रशासक पहुँच, मंजूरी या भुगतान नहीं देता।", "ପରିଚାଳନାରେ ଅର୍ଡର, ଲାଇସେନ୍ସ ପ୍ରମାଣ, ମତାମତ ଓ ଆୟ ସମୀକ୍ଷା ହୁଏ। ଏହି ନମୁନା ପ୍ରଶାସକ ପ୍ରବେଶ, ଅନୁମୋଦନ କିମ୍ବା ପେଆଉଟ୍ ଦିଏ ନାହିଁ।"])}</p>}
      {error && <p role="alert" className="review-error">{error}</p>}
      {stage < 0 && role !== "customer" && <p>{c(["Start a sample purchase in the Customer tab.", "ग्राहक टैब में नमूना खरीद शुरू करें।", "ଗ୍ରାହକ ଟ୍ୟାବ୍‌ରେ ନମୁନା କ୍ରୟ ଆରମ୍ଭ କରନ୍ତୁ।"])}</p>}
      {(role === "mother" || role === "courier" || role === "admin") && <div className="review-income"><strong>{c(["Illustrative earnings", "नमूना आय", "ନମୁନା ଆୟ"])}</strong><p>{c(["Mother", "माँ", "ମା’"])}: {money(stage === 7 ? ((food - (discount ? 10 : 0)) / count) * .8 : 0)} · {c(["Courier", "डिलीवरी साथी", "ଡେଲିଭରି ସାଥୀ"])}: {money(stage === 7 ? 9 : 0)}</p><small>{c(["Example only: 80% food share and ₹9 per drop. Actual policy is adjustable; no bank payout is made here.", "सिर्फ उदाहरण: भोजन का 80% और प्रति डिलीवरी ₹9। असली नीति बदल सकती है; यहाँ बैंक भुगतान नहीं होता।", "କେବଳ ଉଦାହରଣ: ଭୋଜନର ୮୦% ଓ ପ୍ରତି ଡେଲିଭରି ₹୯। ପ୍ରକୃତ ନୀତି ବଦଳିପାରେ; ଏଠାରେ ବ୍ୟାଙ୍କ ପେଆଉଟ୍ ହୁଏ ନାହିଁ।"])}</small></div>}
    </div><aside className="review-card"><h3>{c(["Order tracking", "ऑर्डर ट्रैकिंग", "ଅର୍ଡର ଟ୍ରାକିଂ"])}</h3>{stage < 0 ? <p>{c(["Your sample order will appear here.", "आपका नमूना ऑर्डर यहाँ दिखेगा।", "ଆପଣଙ୍କ ନମୁନା ଅର୍ଡର ଏଠାରେ ଦେଖାଯିବ।"])}</p> : <ol className="review-timeline">{stages.map((s, i) => <li key={i} aria-current={stage === i ? "step" : undefined} className={i <= stage ? "done" : ""}><span aria-hidden="true">{i < stage ? "✓" : i + 1}</span>{c(s)}</li>)}</ol>}
      {mode === "subscription" && <p>{c(["Tracking demonstrates one meal day. Other subscription dates remain separate scheduled deliveries.", "ट्रैकिंग एक दिन के भोजन का उदाहरण है। बाकी दिन अलग निर्धारित डिलीवरी हैं।", "ଟ୍ରାକିଂ ଗୋଟିଏ ଦିନର ଉଦାହରଣ। ଅନ୍ୟ ଦିନଗୁଡ଼ିକ ଅଲଗା ନିର୍ଦ୍ଧାରିତ ଡେଲିଭରି।"])}</p>}
      <hr/><h3>ScooFoo</h3><p>{c(["Home-packed school tiffins use a separate approved school route and authorised reception handover, not ordinary customer delivery.", "घर से स्कूल टिफिन की अलग स्वीकृत रूट और अधिकृत रिसेप्शन को हैंडओवर होता है।", "ଘରର ସ୍କୁଲ୍ ଟିଫିନ୍ ପାଇଁ ଅଲଗା ଅନୁମୋଦିତ ରୁଟ୍ ଓ ଅଧିକୃତ ରିସେପ୍ସନ୍‌ରେ ହସ୍ତାନ୍ତର ହୁଏ।"])}</p><Link href="/scoofoo">{c(["Explore ScooFoo →", "ScooFoo देखें →", "ScooFoo ଦେଖନ୍ତୁ →"])}</Link><p><Link href="/app">{c(["Open my account →", "मेरा खाता खोलें →", "ମୋ ଆକାଉଣ୍ଟ ଖୋଲନ୍ତୁ →"])}</Link></p>
    </aside></div>
  </section>;
}

