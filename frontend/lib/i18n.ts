import type { LanguageCode } from "@/lib/types";

export type TranslationKey =
  | "brandSubtitleHome"
  | "brandSubtitleBuyer"
  | "brandSubtitleSeller"
  | "chooseSide"
  | "homeIntro"
  | "sellerRole"
  | "buyerRole"
  | "sellerTitle"
  | "sellerIntro"
  | "buyerTitle"
  | "buyerIntro"
  | "createSeller"
  | "sellerLogin"
  | "createBuyer"
  | "buyerLogin"
  | "browseFirst"
  | "switchRole"
  | "dashboard"
  | "addCraft"
  | "catalog"
  | "inquiries"
  | "sellerProfile"
  | "marketplace"
  | "cart"
  | "orders"
  | "buyerProfile"
  | "role"
  | "selectLanguage"
  | "languageIntro"
  | "selectedLanguage"
  | "noneSelected"
  | "voiceReady"
  | "voiceHint"
  | "continue"
  | "checkingSession";

const en: Record<TranslationKey, string> = {
  brandSubtitleHome: "Choose your role",
  brandSubtitleBuyer: "Buyer marketplace",
  brandSubtitleSeller: "Seller artisan studio",
  chooseSide: "Choose your side",
  homeIntro: "Artisans create AI-assisted listings. Buyers discover and order handmade products.",
  sellerRole: "Seller / Artisan",
  buyerRole: "Buyer / Customer",
  sellerTitle: "List products by photo and voice",
  sellerIntro: "Use language setup, artisan registration, AI listing popup, catalog, inquiries, and profile.",
  buyerTitle: "Shop verified artisan products",
  buyerIntro: "Browse marketplace, view product details, add to cart, checkout, and track orders.",
  createSeller: "Create seller account",
  sellerLogin: "Seller login",
  createBuyer: "Create buyer account",
  buyerLogin: "Buyer login",
  browseFirst: "Browse first",
  switchRole: "Switch role",
  dashboard: "Dashboard",
  addCraft: "Add Craft",
  catalog: "Catalog",
  inquiries: "Inquiries",
  sellerProfile: "Seller Profile",
  marketplace: "Marketplace",
  cart: "Cart",
  orders: "Orders",
  buyerProfile: "Buyer Profile",
  role: "Role",
  selectLanguage: "Choose your language",
  languageIntro: "Choose the language you are most comfortable using. The app will remember it for navigation, voice, and listing review.",
  selectedLanguage: "Selected language",
  noneSelected: "None selected",
  voiceReady: "Voice assistant ready",
  voiceHint: "Speak naturally in your language; typing long product details is optional.",
  continue: "Continue",
  checkingSession: "Checking secure session...",
};

const hi: Record<TranslationKey, string> = {
  ...en,
  brandSubtitleHome: "अपनी भूमिका चुनें",
  brandSubtitleBuyer: "खरीदार बाज़ार",
  brandSubtitleSeller: "विक्रेता कारीगर स्टूडियो",
  chooseSide: "अपना पक्ष चुनें",
  homeIntro: "कारीगर AI से लिस्टिंग बनाते हैं। खरीदार हस्तनिर्मित उत्पाद खोजते और ऑर्डर करते हैं।",
  sellerRole: "विक्रेता / कारीगर",
  buyerRole: "खरीदार / ग्राहक",
  sellerTitle: "फोटो और आवाज़ से उत्पाद सूची बनाएं",
  sellerIntro: "भाषा सेटअप, कारीगर पंजीकरण, AI लिस्टिंग, कैटलॉग, पूछताछ और प्रोफाइल इस्तेमाल करें।",
  buyerTitle: "कारीगरों के विश्वसनीय उत्पाद खरीदें",
  buyerIntro: "मार्केटप्लेस देखें, उत्पाद विवरण खोलें, कार्ट में जोड़ें, चेकआउट करें और ऑर्डर ट्रैक करें।",
  createSeller: "विक्रेता खाता बनाएं",
  sellerLogin: "विक्रेता लॉगिन",
  createBuyer: "खरीदार खाता बनाएं",
  buyerLogin: "खरीदार लॉगिन",
  browseFirst: "पहले देखें",
  switchRole: "भूमिका बदलें",
  dashboard: "डैशबोर्ड",
  addCraft: "क्राफ्ट जोड़ें",
  catalog: "कैटलॉग",
  inquiries: "पूछताछ",
  sellerProfile: "विक्रेता प्रोफाइल",
  marketplace: "मार्केटप्लेस",
  cart: "कार्ट",
  orders: "ऑर्डर",
  buyerProfile: "खरीदार प्रोफाइल",
  role: "भूमिका",
  selectLanguage: "अपनी भाषा चुनें", languageIntro: "वह भाषा चुनें जिसमें आप सहज हैं। ऐप इसे नेविगेशन, आवाज़ और लिस्टिंग समीक्षा के लिए याद रखेगा।",
  selectedLanguage: "चुनी गई भाषा", noneSelected: "कोई भाषा नहीं चुनी", voiceReady: "वॉइस सहायक तैयार है", voiceHint: "अपनी भाषा में स्वाभाविक रूप से बोलें; लंबे विवरण टाइप करना वैकल्पिक है।", continue: "आगे बढ़ें",
  checkingSession: "सुरक्षित सत्र जांचा जा रहा है...",
};

const gu: Record<TranslationKey, string> = {
  ...en,
  brandSubtitleHome: "તમારી ભૂમિકા પસંદ કરો", brandSubtitleBuyer: "ખરીદદાર બજાર", brandSubtitleSeller: "વિક્રેતા કારીગર સ્ટુડિયો",
  chooseSide: "તમારી ભૂમિકા પસંદ કરો", homeIntro: "કારીગરો AIની મદદથી યાદીઓ બનાવે છે. ખરીદદારો હાથથી બનેલી વસ્તુઓ શોધે અને મંગાવે છે.",
  sellerRole: "વિક્રેતા / કારીગર", buyerRole: "ખરીદદાર / ગ્રાહક", sellerTitle: "ફોટો અને અવાજથી ઉત્પાદન સૂચિ બનાવો",
  sellerIntro: "ભાષા, નોંધણી, AI સૂચિ, કેટલોગ, પૂછપરછ અને પ્રોફાઇલનો ઉપયોગ કરો.", buyerTitle: "કારીગરોની વિશ્વસનીય વસ્તુઓ ખરીદો",
  buyerIntro: "બજાર જુઓ, ઉત્પાદન ખોલો, કાર્ટમાં ઉમેરો અને ઓર્ડર કરો.", createSeller: "વિક્રેતા ખાતું બનાવો", sellerLogin: "વિક્રેતા લૉગિન",
  createBuyer: "ખરીદદાર ખાતું બનાવો", buyerLogin: "ખરીદદાર લૉગિન", browseFirst: "પહેલા જુઓ", switchRole: "ભૂમિકા બદલો",
  dashboard: "ડૅશબોર્ડ", addCraft: "હસ્તકલા ઉમેરો", catalog: "કેટલોગ", inquiries: "પૂછપરછ", sellerProfile: "વિક્રેતા પ્રોફાઇલ",
  marketplace: "બજાર", cart: "કાર્ટ", orders: "ઓર્ડર", buyerProfile: "ખરીદદાર પ્રોફાઇલ", role: "ભૂમિકા",
  selectLanguage: "તમારી ભાષા પસંદ કરો", languageIntro: "તમને અનુકૂળ ભાષા પસંદ કરો. એપ તેને નેવિગેશન, અવાજ અને સૂચિ સમીક્ષા માટે યાદ રાખશે.", selectedLanguage: "પસંદ કરેલી ભાષા", noneSelected: "કોઈ ભાષા પસંદ નથી", voiceReady: "વૉઇસ સહાયક તૈયાર", voiceHint: "તમારી ભાષામાં સ્વાભાવિક રીતે બોલો; લાંબું લખાણ વૈકલ્પિક છે.", continue: "આગળ વધો", checkingSession: "સુરક્ષિત સત્ર તપાસી રહ્યા છીએ...",
};

const mr: Record<TranslationKey, string> = {
  ...en,
  brandSubtitleHome: "तुमची भूमिका निवडा", brandSubtitleBuyer: "खरेदीदार बाजार", brandSubtitleSeller: "विक्रेता कारागीर स्टुडिओ",
  chooseSide: "तुमची भूमिका निवडा", homeIntro: "कारागीर AIच्या मदतीने सूची तयार करतात. खरेदीदार हस्तनिर्मित उत्पादने शोधून मागवतात.",
  sellerRole: "विक्रेता / कारागीर", buyerRole: "खरेदीदार / ग्राहक", sellerTitle: "फोटो आणि आवाजातून उत्पादन सूची तयार करा",
  sellerIntro: "भाषा, नोंदणी, AI सूची, कॅटलॉग, चौकशी आणि प्रोफाइल वापरा.", buyerTitle: "कारागिरांची विश्वसनीय उत्पादने खरेदी करा",
  buyerIntro: "बाजार पहा, उत्पादन उघडा, कार्टमध्ये जोडा आणि ऑर्डर करा.", createSeller: "विक्रेता खाते तयार करा", sellerLogin: "विक्रेता लॉगिन",
  createBuyer: "खरेदीदार खाते तयार करा", buyerLogin: "खरेदीदार लॉगिन", browseFirst: "आधी पहा", switchRole: "भूमिका बदला",
  dashboard: "डॅशबोर्ड", addCraft: "हस्तकला जोडा", catalog: "कॅटलॉग", inquiries: "चौकशी", sellerProfile: "विक्रेता प्रोफाइल",
  marketplace: "बाजार", cart: "कार्ट", orders: "ऑर्डर", buyerProfile: "खरेदीदार प्रोफाइल", role: "भूमिका",
  selectLanguage: "तुमची भाषा निवडा", languageIntro: "तुम्हाला सोयीची भाषा निवडा. ॲप ती नेव्हिगेशन, आवाज आणि सूची पुनरावलोकनासाठी लक्षात ठेवेल.", selectedLanguage: "निवडलेली भाषा", noneSelected: "भाषा निवडलेली नाही", voiceReady: "आवाज सहाय्यक तयार", voiceHint: "तुमच्या भाषेत सहज बोला; लांब माहिती टाइप करणे ऐच्छिक आहे.", continue: "पुढे जा", checkingSession: "सुरक्षित सत्र तपासत आहोत...",
};

const ta: Record<TranslationKey, string> = {
  ...en,
  brandSubtitleHome: "உங்கள் பங்கைத் தேர்ந்தெடுக்கவும்", brandSubtitleBuyer: "வாங்குபவர் சந்தை", brandSubtitleSeller: "விற்பனையாளர் கைவினைஞர் அரங்கம்",
  chooseSide: "உங்கள் பங்கைத் தேர்ந்தெடுக்கவும்", homeIntro: "கைவினைஞர்கள் AI உதவியுடன் பட்டியல்கள் உருவாக்குகின்றனர். வாங்குபவர்கள் கைவினைப் பொருட்களைத் தேடி ஆர்டர் செய்கின்றனர்.",
  sellerRole: "விற்பனையாளர் / கைவினைஞர்", buyerRole: "வாங்குபவர் / வாடிக்கையாளர்", sellerTitle: "புகைப்படம் மற்றும் குரலில் தயாரிப்பைப் பட்டியலிடுங்கள்",
  sellerIntro: "மொழி, பதிவு, AI பட்டியல், பட்டியல் தொகுப்பு, விசாரணைகள் மற்றும் சுயவிவரத்தைப் பயன்படுத்துங்கள்.", buyerTitle: "நம்பகமான கைவினைப் பொருட்களை வாங்குங்கள்",
  buyerIntro: "சந்தையைப் பார்த்து, பொருளைத் திறந்து, வண்டியில் சேர்த்து ஆர்டர் செய்யுங்கள்.", createSeller: "விற்பனையாளர் கணக்கு உருவாக்கு", sellerLogin: "விற்பனையாளர் உள்நுழைவு",
  createBuyer: "வாங்குபவர் கணக்கு உருவாக்கு", buyerLogin: "வாங்குபவர் உள்நுழைவு", browseFirst: "முதலில் பாருங்கள்", switchRole: "பங்கை மாற்று",
  dashboard: "முகப்புப் பலகை", addCraft: "கைவினை சேர்க்கவும்", catalog: "பட்டியல்", inquiries: "விசாரணைகள்", sellerProfile: "விற்பனையாளர் சுயவிவரம்",
  marketplace: "சந்தை", cart: "வண்டி", orders: "ஆர்டர்கள்", buyerProfile: "வாங்குபவர் சுயவிவரம்", role: "பங்கு",
  selectLanguage: "உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்", languageIntro: "உங்களுக்கு வசதியான மொழியைத் தேர்ந்தெடுக்கவும். வழிசெலுத்தல், குரல் மற்றும் பட்டியல் மதிப்பாய்வுக்கு செயலி அதை நினைவில் கொள்ளும்.", selectedLanguage: "தேர்ந்தெடுத்த மொழி", noneSelected: "மொழி தேர்ந்தெடுக்கப்படவில்லை", voiceReady: "குரல் உதவியாளர் தயார்", voiceHint: "உங்கள் மொழியில் இயல்பாகப் பேசுங்கள்; நீண்ட விவரங்களைத் தட்டச்சு செய்வது விருப்பமானது.", continue: "தொடரவும்", checkingSession: "பாதுகாப்பான அமர்வைச் சரிபார்க்கிறது...",
};

const te: Record<TranslationKey, string> = {
  ...en,
  brandSubtitleHome: "మీ పాత్రను ఎంచుకోండి", brandSubtitleBuyer: "కొనుగోలుదారుల మార్కెట్", brandSubtitleSeller: "విక్రేత హస్తకళా స్టూడియో",
  chooseSide: "మీ పాత్రను ఎంచుకోండి", homeIntro: "కళాకారులు AI సహాయంతో జాబితాలు తయారు చేస్తారు. కొనుగోలుదారులు చేతిపనులను కనుగొని ఆర్డర్ చేస్తారు.",
  sellerRole: "విక్రేత / కళాకారుడు", buyerRole: "కొనుగోలుదారు / వినియోగదారు", sellerTitle: "ఫోటో మరియు స్వరంతో ఉత్పత్తిని జాబితా చేయండి",
  sellerIntro: "భాష, నమోదు, AI జాబితా, కేటలాగ్, విచారణలు మరియు ప్రొఫైల్ ఉపయోగించండి.", buyerTitle: "నమ్మకమైన హస్తకళా ఉత్పత్తులను కొనండి",
  buyerIntro: "మార్కెట్ చూడండి, ఉత్పత్తిని తెరవండి, కార్ట్‌కు జోడించి ఆర్డర్ చేయండి.", createSeller: "విక్రేత ఖాతా సృష్టించండి", sellerLogin: "విక్రేత లాగిన్",
  createBuyer: "కొనుగోలుదారు ఖాతా సృష్టించండి", buyerLogin: "కొనుగోలుదారు లాగిన్", browseFirst: "ముందు చూడండి", switchRole: "పాత్ర మార్చండి",
  dashboard: "డాష్‌బోర్డ్", addCraft: "హస్తకళ జోడించండి", catalog: "కేటలాగ్", inquiries: "విచారణలు", sellerProfile: "విక్రేత ప్రొఫైల్",
  marketplace: "మార్కెట్", cart: "కార్ట్", orders: "ఆర్డర్లు", buyerProfile: "కొనుగోలుదారు ప్రొఫైల్", role: "పాత్ర",
  selectLanguage: "మీ భాషను ఎంచుకోండి", languageIntro: "మీకు సౌకర్యమైన భాషను ఎంచుకోండి. నావిగేషన్, స్వరం మరియు జాబితా సమీక్ష కోసం యాప్ దానిని గుర్తుంచుకుంటుంది.", selectedLanguage: "ఎంచుకున్న భాష", noneSelected: "భాష ఎంచుకోలేదు", voiceReady: "వాయిస్ సహాయకుడు సిద్ధంగా ఉన్నాడు", voiceHint: "మీ భాషలో సహజంగా మాట్లాడండి; పొడవైన వివరాలను టైప్ చేయడం ఐచ్ఛికం.", continue: "కొనసాగించండి", checkingSession: "సురక్షిత సెషన్‌ను తనిఖీ చేస్తోంది...",
};

const kn: Record<TranslationKey, string> = {
  ...en,
  brandSubtitleHome: "ನಿಮ್ಮ ಪಾತ್ರವನ್ನು ಆರಿಸಿ", brandSubtitleBuyer: "ಖರೀದಿದಾರರ ಮಾರುಕಟ್ಟೆ", brandSubtitleSeller: "ಮಾರಾಟಗಾರ ಕುಶಲಕರ್ಮಿ ಸ್ಟುಡಿಯೋ",
  chooseSide: "ನಿಮ್ಮ ಪಾತ್ರವನ್ನು ಆರಿಸಿ", homeIntro: "ಕುಶಲಕರ್ಮಿಗಳು AI ನೆರವಿನಿಂದ ಪಟ್ಟಿಗಳನ್ನು ರಚಿಸುತ್ತಾರೆ. ಖರೀದಿದಾರರು ಕೈತಯಾರಿಕಾ ವಸ್ತುಗಳನ್ನು ಹುಡುಕಿ ಆರ್ಡರ್ ಮಾಡುತ್ತಾರೆ.",
  sellerRole: "ಮಾರಾಟಗಾರ / ಕುಶಲಕರ್ಮಿ", buyerRole: "ಖರೀದಿದಾರ / ಗ್ರಾಹಕ", sellerTitle: "ಫೋಟೋ ಮತ್ತು ಧ್ವನಿಯಿಂದ ಉತ್ಪನ್ನ ಪಟ್ಟಿ ಮಾಡಿ",
  sellerIntro: "ಭಾಷೆ, ನೋಂದಣಿ, AI ಪಟ್ಟಿ, ಕ್ಯಾಟಲಾಗ್, ವಿಚಾರಣೆ ಮತ್ತು ಪ್ರೊಫೈಲ್ ಬಳಸಿ.", buyerTitle: "ವಿಶ್ವಾಸಾರ್ಹ ಕೈತಯಾರಿಕಾ ವಸ್ತುಗಳನ್ನು ಖರೀದಿಸಿ",
  buyerIntro: "ಮಾರುಕಟ್ಟೆ ನೋಡಿ, ಉತ್ಪನ್ನ ತೆರೆದು, ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಿ ಆರ್ಡರ್ ಮಾಡಿ.", createSeller: "ಮಾರಾಟಗಾರ ಖಾತೆ ರಚಿಸಿ", sellerLogin: "ಮಾರಾಟಗಾರ ಲಾಗಿನ್",
  createBuyer: "ಖರೀದಿದಾರ ಖಾತೆ ರಚಿಸಿ", buyerLogin: "ಖರೀದಿದಾರ ಲಾಗಿನ್", browseFirst: "ಮೊದಲು ನೋಡಿ", switchRole: "ಪಾತ್ರ ಬದಲಿಸಿ",
  dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", addCraft: "ಕರಕುಶಲ ಸೇರಿಸಿ", catalog: "ಕ್ಯಾಟಲಾಗ್", inquiries: "ವಿಚಾರಣೆಗಳು", sellerProfile: "ಮಾರಾಟಗಾರ ಪ್ರೊಫೈಲ್",
  marketplace: "ಮಾರುಕಟ್ಟೆ", cart: "ಕಾರ್ಟ್", orders: "ಆರ್ಡರ್‌ಗಳು", buyerProfile: "ಖರೀದಿದಾರ ಪ್ರೊಫೈಲ್", role: "ಪಾತ್ರ",
  selectLanguage: "ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆರಿಸಿ", languageIntro: "ನಿಮಗೆ ಅನುಕೂಲವಾದ ಭಾಷೆಯನ್ನು ಆರಿಸಿ. ನ್ಯಾವಿಗೇಶನ್, ಧ್ವನಿ ಮತ್ತು ಪಟ್ಟಿ ಪರಿಶೀಲನೆಗಾಗಿ ಆ್ಯಪ್ ಅದನ್ನು ನೆನಪಿಡುತ್ತದೆ.", selectedLanguage: "ಆರಿಸಿದ ಭಾಷೆ", noneSelected: "ಭಾಷೆ ಆರಿಸಿಲ್ಲ", voiceReady: "ಧ್ವನಿ ಸಹಾಯಕ ಸಿದ್ಧ", voiceHint: "ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಸಹಜವಾಗಿ ಮಾತನಾಡಿ; ಉದ್ದ ವಿವರಗಳನ್ನು ಟೈಪ್ ಮಾಡುವುದು ಐಚ್ಛಿಕ.", continue: "ಮುಂದುವರಿಸಿ", checkingSession: "ಸುರಕ್ಷಿತ ಸೆಷನ್ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...",
};

const bn: Record<TranslationKey, string> = {
  ...en,
  brandSubtitleHome: "আপনার ভূমিকা বেছে নিন", brandSubtitleBuyer: "ক্রেতা বাজার", brandSubtitleSeller: "বিক্রেতা কারিগর স্টুডিও",
  chooseSide: "আপনার ভূমিকা বেছে নিন", homeIntro: "কারিগরেরা AI সহায়তায় তালিকা তৈরি করেন। ক্রেতারা হাতে তৈরি পণ্য খুঁজে অর্ডার করেন।",
  sellerRole: "বিক্রেতা / কারিগর", buyerRole: "ক্রেতা / গ্রাহক", sellerTitle: "ছবি ও কণ্ঠ দিয়ে পণ্য তালিকাভুক্ত করুন",
  sellerIntro: "ভাষা, নিবন্ধন, AI তালিকা, ক্যাটালগ, জিজ্ঞাসা ও প্রোফাইল ব্যবহার করুন।", buyerTitle: "বিশ্বস্ত কারিগরি পণ্য কিনুন",
  buyerIntro: "বাজার দেখুন, পণ্য খুলুন, কার্টে যোগ করে অর্ডার করুন।", createSeller: "বিক্রেতা অ্যাকাউন্ট তৈরি করুন", sellerLogin: "বিক্রেতা লগইন",
  createBuyer: "ক্রেতা অ্যাকাউন্ট তৈরি করুন", buyerLogin: "ক্রেতা লগইন", browseFirst: "আগে দেখুন", switchRole: "ভূমিকা বদলান",
  dashboard: "ড্যাশবোর্ড", addCraft: "কারুশিল্প যোগ করুন", catalog: "ক্যাটালগ", inquiries: "জিজ্ঞাসা", sellerProfile: "বিক্রেতা প্রোফাইল",
  marketplace: "বাজার", cart: "কার্ট", orders: "অর্ডার", buyerProfile: "ক্রেতা প্রোফাইল", role: "ভূমিকা",
  selectLanguage: "আপনার ভাষা বেছে নিন", languageIntro: "আপনার স্বাচ্ছন্দ্যের ভাষা বেছে নিন। নেভিগেশন, কণ্ঠ ও তালিকা পর্যালোচনার জন্য অ্যাপ এটি মনে রাখবে।", selectedLanguage: "নির্বাচিত ভাষা", noneSelected: "কোনো ভাষা নির্বাচিত নয়", voiceReady: "ভয়েস সহকারী প্রস্তুত", voiceHint: "নিজের ভাষায় স্বাভাবিকভাবে বলুন; দীর্ঘ বিবরণ টাইপ করা ঐচ্ছিক।", continue: "এগিয়ে যান", checkingSession: "নিরাপদ সেশন পরীক্ষা করা হচ্ছে...",
};

const pa: Record<TranslationKey, string> = {
  ...en,
  brandSubtitleHome: "ਆਪਣੀ ਭੂਮਿਕਾ ਚੁਣੋ", brandSubtitleBuyer: "ਖਰੀਦਦਾਰ ਬਾਜ਼ਾਰ", brandSubtitleSeller: "ਵਿਕਰੇਤਾ ਕਾਰੀਗਰ ਸਟੂਡੀਓ",
  chooseSide: "ਆਪਣੀ ਭੂਮਿਕਾ ਚੁਣੋ", homeIntro: "ਕਾਰੀਗਰ AI ਦੀ ਮਦਦ ਨਾਲ ਸੂਚੀਆਂ ਬਣਾਉਂਦੇ ਹਨ। ਖਰੀਦਦਾਰ ਹੱਥ ਨਾਲ ਬਣੇ ਉਤਪਾਦ ਲੱਭ ਕੇ ਆਰਡਰ ਕਰਦੇ ਹਨ।",
  sellerRole: "ਵਿਕਰੇਤਾ / ਕਾਰੀਗਰ", buyerRole: "ਖਰੀਦਦਾਰ / ਗਾਹਕ", sellerTitle: "ਫੋਟੋ ਅਤੇ ਆਵਾਜ਼ ਨਾਲ ਉਤਪਾਦ ਸੂਚੀ ਬਣਾਓ",
  sellerIntro: "ਭਾਸ਼ਾ, ਰਜਿਸਟ੍ਰੇਸ਼ਨ, AI ਸੂਚੀ, ਕੈਟਾਲਾਗ, ਪੁੱਛਗਿੱਛ ਅਤੇ ਪ੍ਰੋਫਾਈਲ ਵਰਤੋ।", buyerTitle: "ਭਰੋਸੇਯੋਗ ਕਾਰੀਗਰੀ ਉਤਪਾਦ ਖਰੀਦੋ",
  buyerIntro: "ਬਾਜ਼ਾਰ ਵੇਖੋ, ਉਤਪਾਦ ਖੋਲ੍ਹੋ, ਕਾਰਟ ਵਿੱਚ ਪਾਓ ਅਤੇ ਆਰਡਰ ਕਰੋ।", createSeller: "ਵਿਕਰੇਤਾ ਖਾਤਾ ਬਣਾਓ", sellerLogin: "ਵਿਕਰੇਤਾ ਲੌਗਇਨ",
  createBuyer: "ਖਰੀਦਦਾਰ ਖਾਤਾ ਬਣਾਓ", buyerLogin: "ਖਰੀਦਦਾਰ ਲੌਗਇਨ", browseFirst: "ਪਹਿਲਾਂ ਵੇਖੋ", switchRole: "ਭੂਮਿਕਾ ਬਦਲੋ",
  dashboard: "ਡੈਸ਼ਬੋਰਡ", addCraft: "ਕਾਰੀਗਰੀ ਸ਼ਾਮਲ ਕਰੋ", catalog: "ਕੈਟਾਲਾਗ", inquiries: "ਪੁੱਛਗਿੱਛ", sellerProfile: "ਵਿਕਰੇਤਾ ਪ੍ਰੋਫਾਈਲ",
  marketplace: "ਬਾਜ਼ਾਰ", cart: "ਕਾਰਟ", orders: "ਆਰਡਰ", buyerProfile: "ਖਰੀਦਦਾਰ ਪ੍ਰੋਫਾਈਲ", role: "ਭੂਮਿਕਾ",
  selectLanguage: "ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ", languageIntro: "ਜਿਸ ਭਾਸ਼ਾ ਵਿੱਚ ਤੁਸੀਂ ਸਹਿਜ ਹੋ ਉਹ ਚੁਣੋ। ਐਪ ਨੇਵੀਗੇਸ਼ਨ, ਆਵਾਜ਼ ਅਤੇ ਸੂਚੀ ਸਮੀਖਿਆ ਲਈ ਇਸਨੂੰ ਯਾਦ ਰੱਖੇਗੀ।", selectedLanguage: "ਚੁਣੀ ਭਾਸ਼ਾ", noneSelected: "ਕੋਈ ਭਾਸ਼ਾ ਨਹੀਂ ਚੁਣੀ", voiceReady: "ਵੌਇਸ ਸਹਾਇਕ ਤਿਆਰ", voiceHint: "ਆਪਣੀ ਭਾਸ਼ਾ ਵਿੱਚ ਸੁਭਾਵਿਕ ਬੋਲੋ; ਲੰਮਾ ਵੇਰਵਾ ਟਾਈਪ ਕਰਨਾ ਵਿਕਲਪਿਕ ਹੈ।", continue: "ਅੱਗੇ ਵਧੋ", checkingSession: "ਸੁਰੱਖਿਅਤ ਸੈਸ਼ਨ ਦੀ ਜਾਂਚ ਹੋ ਰਹੀ ਹੈ...",
};

const dictionaries: Partial<Record<LanguageCode, Record<TranslationKey, string>>> = {
  en, hi, gu, mr, ta, te, kn, bn, pa,
};

export function translate(key: TranslationKey, language: LanguageCode = "en") {
  return dictionaries[language]?.[key] ?? en[key];
}
