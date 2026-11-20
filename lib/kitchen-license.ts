export function fssaiEvidenceExpiry(input:{licenseNumber?:string;validUntil?:string;perpetual?:boolean}) {
 if(!/^\d{14}$/.test(input.licenseNumber??""))throw new Error("Add the 14-digit FSSAI number shown on your certificate.");
 if(input.perpetual){if(input.validUntil)throw new Error("Choose a certificate expiry date or no expiry date, not both.");return null;}
 if(!input.validUntil||!/^\d{4}-\d{2}-\d{2}$/.test(input.validUntil))throw new Error("Add the certificate expiry date, or select no expiry date if the certificate has perpetual validity.");
 const date=new Date(input.validUntil+"T12:00:00Z");
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==input.validUntil)throw new Error("Check the certificate expiry date.");
 return new Date(input.validUntil+"T23:59:59.999+05:30");
}
