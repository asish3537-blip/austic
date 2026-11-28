package in.paustik.mobile;
import org.json.*;
final class OrderChoices {
  static JSONObject repeatKitchen(JSONArray kitchens,JSONObject previous){
    String id=previous.optString("id"),name=previous.optString("name");
    for(int i=0;kitchens!=null&&i<kitchens.length();i++){
      JSONObject kitchen=kitchens.optJSONObject(i);if(kitchen==null)continue;
      if(id.isEmpty()?name.isEmpty()||!name.equals(kitchen.optString("name")):!id.equals(kitchen.optString("id")))continue;
      JSONArray meals=kitchen.optJSONArray("meals");
      for(int n=0;meals!=null&&n<meals.length();n++)if(meals.optJSONObject(n)!=null&&meals.optJSONObject(n).optInt("servings")>0)return kitchen;
    }
    return null;
  }
  static String supportMessage(String reference){
    return "Hi Paustik, I need help with order "+reference.replaceAll("[\\r\\n\\p{Cntrl}]"," ")+". Please help me with: ";
  }
}
