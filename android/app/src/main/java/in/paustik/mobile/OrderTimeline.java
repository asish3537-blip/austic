package in.paustik.mobile;
import java.util.*;
import org.json.*;

/** Presentation only. Photos never advance an order's server status. */
final class OrderTimeline {
  static final String[] STATUSES={"ORDER_PLACED","CONFIRMED","PREPARING","READY_FOR_PICKUP","PICKED_UP","OUT_FOR_DELIVERY","DELIVERED"};
  static final String[] LABELS={"Order placed","Kitchen confirmed","Preparing your meal","Ready for courier","Picked up by courier","On the way","Delivered"};
  static String normalize(String status){return status.equals("DELIVERY_ASSIGNED")?"READY_FOR_PICKUP":status;}
  static final class Step {
    final String status,label,state,at,photo;
    Step(String status,String label,String state,String at,String photo){this.status=status;this.label=label;this.state=state;this.at=at;this.photo=photo;}
  }
  static List<Step> build(String status,JSONArray events){
    int current=Arrays.asList(STATUSES).indexOf(normalize(status));
    List<Step> steps=new ArrayList<>();
    for(int i=0;i<STATUSES.length;i++){
      String at="";
      for(int n=0;events!=null&&n<events.length();n++){
        JSONObject event=events.optJSONObject(n);
        if(event!=null && normalize(event.optString("status")).equals(STATUSES[i]) && !event.optString("at").isEmpty()){at=event.optString("at");break;}
      }
      steps.add(new Step(STATUSES[i],LABELS[i],i==current?"current":!at.isEmpty()?"recorded":current>i?"passed":status.equals("CANCELLED")||status.equals("FAILED")?"stopped":"upcoming",at,i==2?"PREPARED":i==3?"HANDOVER":""));
    }
    return steps;
  }
}
