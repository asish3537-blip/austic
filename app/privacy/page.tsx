import type {Metadata} from "next";
import {PrivacyNotice} from "@/components/privacy-notice";
export const metadata:Metadata={title:"Privacy notice"};
export default function PrivacyPage(){return <PrivacyNotice/>;}
