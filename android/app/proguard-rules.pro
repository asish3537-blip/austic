# Activity and Razorpay callback entry points must remain available to Android and the SDK.
-keep class in.paustik.mobile.KitchenActivity { *; }
-keepattributes Signature,InnerClasses,EnclosingMethod
