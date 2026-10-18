from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from xml.sax.saxutils import escape
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output/pdf/Pausstik_Authenticator_and_Kitchen_Guide.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont("Guide", "C:/Windows/Fonts/arial.ttf"))
pdfmetrics.registerFont(TTFont("GuideBold", "C:/Windows/Fonts/arialbd.ttf"))
pdfmetrics.registerFontFamily("Guide", normal="Guide", bold="GuideBold")
GREEN, DARK, MUTED = map(HexColor, ["#195b49", "#28352d", "#59665d"])
CREAM, BORDER = map(HexColor, ["#fbf8f0", "#dddacf"])
W, H = 595.28, 841.89
c = canvas.Canvas(str(OUT), pagesize=(W,H))
c.setTitle("Pausstik: kitchens, subscriptions and administrator sign-in")
c.setAuthor("Pausstik")
style = ParagraphStyle("body", fontName="Guide", fontSize=10.5, leading=15.5, textColor=DARK)

def paragraph(text, x, top, width=499, size=10.5, color=DARK):
    s = ParagraphStyle("p", parent=style, fontSize=size, leading=size*1.48, textColor=color)
    p = Paragraph(text, s)
    _, h = p.wrap(width, 800)
    p.drawOn(c, x, H-top-h)
    return top+h

def header(page, eyebrow, title, intro):
    c.setFillColor(CREAM); c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(GREEN); c.rect(0,H-13,W,13,fill=1,stroke=0)
    c.setFont("GuideBold",14); c.drawString(48,H-49,"Pausstik")
    c.setFont("Guide",9); c.setFillColor(MUTED); c.drawRightString(W-48,H-49,"18 October 2026 | User guide")
    c.setFont("GuideBold",9); c.setFillColor(GREEN); c.drawString(48,H-86,eyebrow)
    c.setFont("GuideBold",25); c.setFillColor(DARK); c.drawString(48,H-122,title)
    paragraph(intro,48,137)
    c.setStrokeColor(BORDER); c.line(48,48,W-48,48)
    c.setFont("Guide",8); c.setFillColor(MUTED); c.drawString(48,32,"Pausstik | Mother-led neighbourhood meals")
    c.drawRightString(W-48,32,f"{page} / 2")

def step(number, title, text, top):
    c.setFillColor(GREEN); c.circle(61,H-top-13,13,fill=1,stroke=0)
    c.setFillColor(white); c.setFont("GuideBold",11); c.drawCentredString(61,H-top-17,str(number))
    c.setFillColor(DARK); c.setFont("GuideBold",12); c.drawString(86,H-top-10,title)
    return paragraph(text,86,top+18,width=461)+18

def box(title, text, top):
    p = Paragraph(text,style); _, ph=p.wrap(467,700)
    height=ph+53
    c.setFillColor(white); c.setStrokeColor(BORDER); c.roundRect(48,H-top-height,499,height,10,fill=1,stroke=1)
    c.setFont("GuideBold",11); c.setFillColor(GREEN); c.drawString(64,H-top-23,title)
    p.drawOn(c,64,H-top-37-ph)
    return top+height+16

header(1,"CUSTOMER JOURNEY","Your kitchen. Your menu. Your week.",
       "Start with available kitchens near your delivery pin. Open one kitchen, explore its dated menu and choose the days that work for you.")
y=195
y=step(1,"Find a nearby kitchen","Sign in as a Customer and save your delivery location. Browse kitchen cards, compare cuisine, ratings and starting prices, or filter for vegetarian and non-vegetarian choices. A kitchen appears when its approved mother has published available meals.",y)
y=step(2,"Open the kitchen’s menu","Select <b>View menu</b>. Choose a menu day to see the available meals, three meal components and price. Save favourite kitchens for later. Sample kitchens are clearly labelled and cannot create orders.",y)
y=step(3,"Build a subscription","Choose at least <b>3 days</b> and up to <b>7 days</b> with the same mother. Use the 3, 5, 6 or 7-day shortcuts, choose one meal per day and set servings. Review meal costs plus <b>INR 30 delivery per selected day</b> before reserving.",y)
y=box("Meal starting prices","Base: <b>INR 69</b> | Egg: <b>INR 79</b> | Cheese: <b>INR 89</b> | Chicken: <b>INR 99</b><br/>Chicken meals cannot exceed INR 100. Your selected menu shows the actual meal price; delivery is separate.",y)
y=box("Payments, cancellations and tracking","Plans cover one week and renew manually. Online checkout is not connected: wallet credit is applied first and any balance follows the pilot collection process. Cancel a day at least <b>five hours before delivery</b>; eligible paid value less INR 5 is credited to the wallet. Order tracking updates as the mother and assigned courier progress the delivery.",y)
paragraph('Open the website and choose <b>Customer dashboard</b>. Help is available at <b>/help#customer-workspace</b>.',48,y,size=9,color=MUTED)
c.showPage()

header(2,"ADMINISTRATOR SECURITY","Link your authenticator once.",
       "Administrators use a password and an authenticator code after enrollment. Customers, mothers and couriers keep real SMS or WhatsApp verification and email confirmation.")
y=195
y=step(1,"Create the owner or sign in","For first owner setup, open <b>/admin-setup</b> and use the private replacement setup code supplied separately. Choose your account details and password. Existing admins use <b>/admin-sign-in</b>, then open <b>Admin security</b>.",y)
y=step(2,"Pair your authenticator app","In <b>/admin/security</b>, enter your current password. Scan the QR code in your authenticator app, or copy the manual key when using one phone. Enter the current six-digit code to confirm. The pairing QR expires after ten minutes.",y)
y=step(3,"Save recovery codes and sign in","Save the ten recovery codes displayed once. At your next login, enter your username, password and current authenticator code. Each app code or recovery code is accepted once. Wait for the next app code if you just used one.",y)
y=box("If you replace or lose your phone","Use your password and an unused recovery code to sign in. In Admin security, disable the old authenticator using your password and another unused code, then link the new phone. Regenerating recovery codes invalidates the old set. Password reset keeps your authenticator enabled.",y)
y=box("What the setup code can and cannot do","The owner setup code is different from the six-digit app code. It only works before owner setup is completed and before an administrator has enrolled an authenticator. Submitting owner recovery suspends prior admin accounts and revokes their sessions; their audit records remain. It cannot bypass an enrolled authenticator.",y)
paragraph("<b>Service status:</b> real SMS, WhatsApp and email require configured messaging providers. Authenticator setup does not activate those providers. Never share setup keys, recovery codes or passwords.",48,y,size=9,color=MUTED)
c.save()
public = ROOT / "public/docs" / OUT.name
public.parent.mkdir(parents=True,exist_ok=True)
shutil.copyfile(OUT,public)
print(str(OUT))
