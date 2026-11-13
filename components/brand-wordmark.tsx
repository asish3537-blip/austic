"use client";
import Image from "next/image";
import { useUiLanguage } from "@/components/ui-language";

export function BrandWordmark({className="",width=170,height=82,priority=false,original=false}:{className?:string;width?:number;height?:number;priority?:boolean;original?:boolean}) {
  const {language}=useUiLanguage();
  if(original)return <Image className={className} src="/assets/paustik-mother-wordmark.webp" alt="Paustik" width={width} height={height} priority={priority}/>;
  if(language==="en")return <span className={"paustik-native-wordmark paustik-english-wordmark "+className} role="img" aria-label="Paustik" lang="en"><strong>Pausti<span>k</span></strong></span>;
  if(language==="hi")return <span className={"paustik-native-wordmark paustik-hindi-wordmark "+className} role="img" aria-label="पौष्टिक" lang="hi"><strong>पौष्टि<span>क</span></strong></span>;
  return <span className={"paustik-native-wordmark "+className} role="img" aria-label="ପୌଷ୍ଟିକ୍" lang="or"><strong>ପୌଷ୍ଟି<span>କ୍</span></strong></span>;
}
