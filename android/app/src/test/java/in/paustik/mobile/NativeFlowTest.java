package in.paustik.mobile;

import static org.junit.Assert.*;
import android.app.AlertDialog;
import android.content.Context;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.Spinner;
import org.json.*;
import org.junit.*;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.android.controller.ActivityController;
import org.robolectric.annotation.*;
import org.robolectric.shadows.*;
import java.lang.reflect.Field;
import java.util.*;

@RunWith(RobolectricTestRunner.class)
@Config(sdk=34)
@LooperMode(LooperMode.Mode.PAUSED)
public class NativeFlowTest {
    private ActivityController<KitchenActivity> controller;
    private KitchenActivity app;
    @Before public void setup(){controller=Robolectric.buildActivity(KitchenActivity.class).setup();app=controller.get();}
    @After public void close(){controller.pause().stop().destroy();}
    private View find(View parent,String tag){if(tag.equals(parent.getTag()))return parent;if(parent instanceof ViewGroup){ViewGroup g=(ViewGroup)parent;for(int i=0;i<g.getChildCount();i++){View child=find(g.getChildAt(i),tag);if(child!=null)return child;}}return null;}
    private View view(String tag){View result=find(app.getWindow().getDecorView(),tag);assertNotNull("Missing native control: "+tag,result);return result;}
    private void click(String tag){view(tag).performClick();ShadowLooper.idleMainLooper();}
    private void field(String name,String value){((EditText)view("field:"+name)).setText(value);}
    private void inject(String field,Object value)throws Exception{Field f=KitchenActivity.class.getDeclaredField(field);f.setAccessible(true);f.set(app,value);}
    private void idleUntil(String tag)throws Exception{for(int i=0;i<150;i++){ShadowLooper.idleMainLooper();if(find(app.getWindow().getDecorView(),tag)!=null)return;Thread.sleep(20);}view(tag);}
    private void loginAs(String role,FixtureApi fixture)throws Exception{inject("api",fixture);inject("user",new JSONObject().put("role",role).put("name","Local tester").put("email","local@example.test"));click("nav:Home");}

    @Test public void guestStartsWithoutNetworkOrBrowser(){assertNotNull(view("action:Try a practice order"));assertNotNull(view("action:Sign in"));assertNull(Shadows.shadowOf(app).getNextStartedActivity());}
    private int count(View parent,String tag){int n=tag.equals(parent.getTag())?1:0;if(parent instanceof ViewGroup){ViewGroup group=(ViewGroup)parent;for(int i=0;i<group.getChildCount();i++)n+=count(group.getChildAt(i),tag);}return n;}
    @Test public void practiceListShowsFiveUntilMoreIsRequested(){click("action:Try a practice order");assertEquals(5,count(app.getWindow().getDecorView(),"action:View menu"));click("action:See all practice kitchens");assertEquals(10,count(app.getWindow().getDecorView(),"action:View menu"));}
    @Test public void offlinePracticeCompletesFullOrderJourney()throws Exception{click("action:Try a practice order");click("action:View menu");click("action:Choose this meal");click("action:Review order");AlertDialog dialog=ShadowAlertDialog.getLatestAlertDialog();assertNotNull(dialog);dialog.getButton(AlertDialog.BUTTON_POSITIVE).performClick();ShadowLooper.idleMainLooper();assertEquals(1,new PracticeStore(app).orders().length());click("action:Track order");for(int i=0;i<6;i++)click("action:Simulate next stage");assertEquals("DELIVERED",new PracticeStore(app).orders().getJSONObject(0).getString("status"));assertNull(Shadows.shadowOf(app).getNextStartedActivity());}
    @Test public void mealPlanAndQuantityPersistOnDevice()throws Exception{click("action:Try a practice order");click("action:View menu");click("action:Choose this meal");((Spinner)view("choice:Servings")).setSelection(1);((Spinner)view("choice:Meal days")).setSelection(2);click("action:Review order");ShadowAlertDialog.getLatestAlertDialog().getButton(AlertDialog.BUTTON_POSITIVE).performClick();ShadowLooper.idleMainLooper();JSONObject order=new PracticeStore(app).orders().getJSONObject(0);assertEquals(4,order.getInt("days"));assertEquals("NO_PAYMENT",order.getString("paymentStatus"));assertTrue(order.getJSONArray("items").getString(0).startsWith("2 ×"));}
    @Test public void signInAndSignupAreNativeForms(){click("action:Sign in");assertNotNull(view("field:Email address"));assertNotNull(view("field:Password"));click("action:Create your account");assertNotNull(view("field:Phone number"));assertNotNull(view("field:Delivery address"));assertNull(Shadows.shadowOf(app).getNextStartedActivity());}
    @Test public void customerCheckoutUsesServerQuoteAndPreservesItsId()throws Exception{FixtureApi api=new FixtureApi(app);loginAs("CUSTOMER",api);idleUntil("action:View menu");click("action:View menu");click("action:Choose this meal");click("action:Review order");idleUntil("action:Place order");click("action:Place order");idleUntil("action:View orders");assertEquals("11111111-1111-4111-8111-111111111111",api.lastPayload.getString("quoteId"));assertEquals("22222222-2222-4222-8222-222222222222",api.lastPayload.getString("menuId"));assertNull(Shadows.shadowOf(app).getNextStartedActivity());}
    @Test public void motherGetsNativePostingAndOrderActions()throws Exception{loginAs("MOTHER",new FixtureApi(app));idleUntil("action:Prepared meal photo");assertNotNull(view("action:Add a meal"));assertNotNull(view("action:One-day special"));click("action:Add a meal");assertNotNull(view("field:Meal name"));assertNotNull(view("action:Save meal"));assertNull(Shadows.shadowOf(app).getNextStartedActivity());}
    @Test public void courierDeclineSendsTheOrderId()throws Exception{FixtureApi api=new FixtureApi(app);loginAs("DELIVERY_AGENT",api);idleUntil("action:Decline offer");click("action:Decline offer");idleUntil("action:Decline offer");for(int i=0;i<50&&api.lastPayload==null;i++){Thread.sleep(20);ShadowLooper.idleMainLooper();}assertEquals("33333333-3333-4333-8333-333333333333",api.lastPayload.getString("orderId"));assertEquals("/api/delivery/offers/decline",api.lastPath);}
    @Test public void offlineLibraryDoesNotContainFakeRatings()throws Exception{JSONArray kitchens=new PracticeStore(app).kitchens();assertEquals(10,kitchens.length());for(int i=0;i<kitchens.length();i++){JSONObject k=kitchens.getJSONObject(i);assertFalse(k.has("rating"));assertTrue(k.getString("name").contains("Practice"));}}
    @Test public void localPracticeDoesNotCreateBrowserOrPaymentIntents(){click("action:Try a practice order");click("action:View menu");click("action:Choose this meal");click("action:Review order");ShadowAlertDialog.getLatestAlertDialog().getButton(AlertDialog.BUTTON_POSITIVE).performClick();assertNull(Shadows.shadowOf(app).getNextStartedActivity());}

    @Test public void emailCodeLoginStaysNative()throws Exception{FixtureApi fixture=new FixtureApi(app);inject("api",fixture);click("action:Sign in");click("action:Email me a sign-in code");field("Email address","local@example.test");click("action:Email me a code");idleUntil("field:Six-digit email code");assertEquals("/api/auth/email-code/request",fixture.lastPath);field("Six-digit email code","123456");click("action:Sign in with code");idleUntil("action:View menu");assertEquals("/api/auth/email-code/verify",fixture.lastPath);assertEquals("123456",fixture.lastPayload.getString("code"));assertNull(Shadows.shadowOf(app).getNextStartedActivity());}
    @Test public void googleOptionHiddenUntilConfigured()throws Exception{inject("api",new FixtureApi(app));click("action:Sign in");Thread.sleep(50);ShadowLooper.idleMainLooper();assertEquals(0,count(app.getWindow().getDecorView(),"action:Continue with Google"));}
    @Test public void googleOptionAppearsWhenConfigured()throws Exception{inject("api",new FixtureApi(app){@Override JSONObject get(String path)throws Exception{if(path.equals("/api/auth/options"))return new JSONObject().put("google",true);return super.get(path);}});click("action:Sign in");idleUntil("action:Continue with Google");assertNull(Shadows.shadowOf(app).getNextStartedActivity());}

    static class FixtureApi extends NativeApi {
        volatile JSONObject lastPayload;volatile String lastPath;
        FixtureApi(Context c){super(c);}
        @Override JSONObject get(String path)throws Exception{
            if(path.equals("/api/auth/session"))return new JSONObject().put("user",new JSONObject().put("role","CUSTOMER").put("name","Local tester").put("email","local@example.test"));
            if(path.equals("/api/mobile/workspace")){JSONObject meal=new JSONObject().put("menuId","22222222-2222-4222-8222-222222222222").put("name","Local dalma").put("price",99).put("description","Rice and dalma").put("serviceDate",PracticeStore.date(1)).put("deliveryTime","12:30").put("servings",10);JSONObject kitchen=new JSONObject().put("name","Local kitchen").put("locality","Patia").put("meals",new JSONArray().put(meal));return new JSONObject().put("kitchens",new JSONArray().put(kitchen)).put("orders",new JSONArray()).put("deliveryArea","Patia");}
            if(path.equals("/api/mother/menu"))return new JSONObject("{\"kitchen\":{\"name\":\"Local Mother\",\"approved\":true},\"orders\":[{\"id\":\"local-order\",\"orderNumber\":\"LOCAL-1\",\"status\":\"PREPARING\",\"items\":[\"1 × Dalma\"]}],\"menus\":[],\"earningsRecorded\":10}");
            if(path.equals("/api/delivery/jobs"))return new JSONObject("{\"area\":{\"online\":true,\"city\":\"Bhubaneswar\",\"radiusKm\":25},\"capacity\":{\"mealCapacity\":6},\"assigned\":[],\"upcoming\":[],\"available\":[{\"deliveryId\":\"44444444-4444-4444-8444-444444444444\",\"orderId\":\"33333333-3333-4333-8333-333333333333\",\"orderNumber\":\"LOCAL-1\",\"pickup\":\"Mother\",\"dropoff\":\"Locality\",\"estimatedPay\":15}]}");
            return new JSONObject();
        }
        @Override JSONObject post(String path,JSONObject data)throws Exception{lastPath=path;lastPayload=data;if(path.equals("/api/checkout/quote"))return new JSONObject().put("quoteId","11111111-1111-4111-8111-111111111111").put("subtotal",99).put("deliveryFee",9).put("total",108).put("walletApplied",0).put("amountDue",108);if(path.equals("/api/marketplace/orders"))return new JSONObject().put("orderId","33333333-3333-4333-8333-333333333333").put("message","Local test order");return new JSONObject().put("saved",true);}
    }
}
