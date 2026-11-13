"use client";
import Image from "next/image";
import { useUiLanguage } from "@/components/ui-language";

export function BrandWordmark({className="",width=170,height=82,priority=false}:{className?:string;width?:number;height?:number;priority?:boolean}) {
  const {language}=useUiLanguage();
  if(language==="en")return <Image className={className} src="/assets/paustik-mother-wordmark.webp" alt="Paustik" width={width} height={height} priority={priority}/>;
  if(language==="hi")return <span className={"paustik-native-wordmark paustik-hindi-wordmark "+className} role="img" aria-label="पौष्टिक" lang="hi"><strong>पौष्टि<span>क</span></strong></span>;
  return <span className={"paustik-native-wordmark "+className} role="img" aria-label="ପୌଷ୍ଟିକ୍" lang="or"><strong>ପୌଷ୍ଟିକ<span className="wordmark-halant">୍</span></strong></span>;
}
