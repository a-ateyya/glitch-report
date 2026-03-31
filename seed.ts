import Database from "better-sqlite3";

const db = new Database("glitch.db");
db.pragma("journal_mode = WAL");

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_ar TEXT NOT NULL,
    title_en TEXT,
    description_ar TEXT NOT NULL,
    description_en TEXT,
    category TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium',
    loss_amount INTEGER,
    date TEXT NOT NULL,
    sources_json TEXT NOT NULL DEFAULT '[]',
    tags_json TEXT NOT NULL DEFAULT '[]',
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'published',
    is_starred INTEGER NOT NULL DEFAULT 0,
    source_type TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL
  );
`);

const sampleIncidents = [
  {
    title_ar: "ChatGPT يقدم نصائح طبية خاطئة تؤدي لحالات طوارئ",
    title_en: "ChatGPT provides dangerous medical advice leading to ER visits",
    description_ar: "أفاد عدد من المستشفيات في الولايات المتحدة بزيادة في حالات الطوارئ الناتجة عن اتباع مرضى لنصائح طبية قدمها ChatGPT. تضمنت الحالات توصيات بجرعات دوائية خاطئة وتشخيصات مضللة. أصدرت إدارة الغذاء والدواء الأمريكية تحذيراً رسمياً بشأن الاعتماد على أدوات الذكاء الاصطناعي للحصول على استشارات طبية.",
    description_en: "Multiple US hospitals reported increased ER visits from patients following ChatGPT medical advice, including wrong dosage recommendations.",
    category: "ai",
    severity: "critical",
    loss_amount: null,
    date: "2026-03-28T00:00:00.000Z",
    sources_json: JSON.stringify([
      { title: "FDA Warning", url: "https://www.fda.gov/example" },
      { title: "Reuters Report", url: "https://www.reuters.com/example" }
    ]),
    tags_json: JSON.stringify(["صحة", "ChatGPT", "تشخيص_خاطئ"]),
    status: "published",
    is_starred: 1,
    source_type: "manual",
  },
  {
    title_ar: "اختراق منصة DeFi وسرقة 47 مليون دولار من أموال المستخدمين",
    title_en: "DeFi protocol hacked for $47M in user funds",
    description_ar: "تعرضت منصة التمويل اللامركزي NovaSwap لاختراق أمني كبير أدى إلى سرقة 47 مليون دولار من أموال المستخدمين. استغل المخترقون ثغرة في العقد الذكي الخاص بمجمع السيولة. المنصة علّقت جميع عملياتها وأعلنت عن تحقيق مع شركة أمن سيبراني.",
    description_en: "DeFi platform NovaSwap suffered a smart contract exploit draining $47M from liquidity pools.",
    category: "crypto",
    severity: "critical",
    loss_amount: 47000000,
    date: "2026-03-25T00:00:00.000Z",
    sources_json: JSON.stringify([
      { title: "CoinDesk", url: "https://www.coindesk.com/example" },
      { title: "Blockchain Analysis", url: "https://www.chainalysis.com/example" }
    ]),
    tags_json: JSON.stringify(["DeFi", "اختراق", "عقد_ذكي", "سيولة"]),
    status: "published",
    is_starred: 1,
    source_type: "manual",
  },
  {
    title_ar: "كاميرات مراقبة ذكية تبث بيانات المستخدمين علنياً لمدة أسبوع",
    title_en: "Smart security cameras publicly streaming user data for a week",
    description_ar: "اكتشف باحثون أمنيون أن كاميرات المراقبة الذكية من شركة SecureVision كانت تبث بيانات الفيديو والصوت الخاصة بآلاف المستخدمين على الإنترنت المفتوح لمدة أسبوع كامل بسبب خطأ في تحديث البرنامج الثابت. تأثر أكثر من 50,000 جهاز في منطقة الشرق الأوسط وأوروبا.",
    description_en: "SecureVision smart cameras publicly streamed private video/audio of thousands of users due to firmware update bug.",
    category: "iot",
    severity: "high",
    loss_amount: null,
    date: "2026-03-22T00:00:00.000Z",
    sources_json: JSON.stringify([
      { title: "TechCrunch", url: "https://techcrunch.com/example" },
      { title: "Security Research", url: "https://securitylab.example.com" }
    ]),
    tags_json: JSON.stringify(["كاميرات", "خصوصية", "بيانات", "تسريب"]),
    status: "published",
    is_starred: 0,
    source_type: "manual",
  },
  {
    title_ar: "نظام ذكاء اصطناعي للتوظيف يرفض المتقدمات بشكل منهجي",
    title_en: "AI hiring system systematically rejects female applicants",
    description_ar: "كشف تحقيق صحفي أن نظام الذكاء الاصطناعي المستخدم من قبل مجموعة شركات كبرى للفرز الأولي لطلبات التوظيف كان يرفض بشكل منهجي السير الذاتية للمتقدمات الإناث بنسبة أعلى بـ 40% مقارنة بالذكور ذوي المؤهلات المماثلة. تم اكتشاف أن بيانات التدريب كانت متحيزة.",
    description_en: "AI recruitment system found to systematically reject female applicants at 40% higher rate than equally qualified males.",
    category: "ai",
    severity: "high",
    loss_amount: null,
    date: "2026-03-20T00:00:00.000Z",
    sources_json: JSON.stringify([
      { title: "The Guardian", url: "https://www.theguardian.com/example" },
      { title: "MIT Tech Review", url: "https://www.technologyreview.com/example" }
    ]),
    tags_json: JSON.stringify(["تحيز", "توظيف", "تمييز"]),
    status: "published",
    is_starred: 1,
    source_type: "manual",
  },
  {
    title_ar: "عملية احتيال بالعملات المشفرة تستهدف مستثمرين خليجيين بقيمة 12 مليون دولار",
    title_en: "Crypto scam targeting Gulf investors for $12M",
    description_ar: "كشفت السلطات الإماراتية عن شبكة احتيال منظمة استهدفت مستثمرين خليجيين عبر منصة تداول وهمية تحمل اسم GulfCoin Pro. المنصة وعدت بعوائد تصل إلى 300% شهرياً واستقطبت أكثر من 2,000 ضحية قبل اختفاء القائمين عليها مع 12 مليون دولار.",
    description_en: "UAE authorities uncovered organized crypto fraud network targeting Gulf investors through fake GulfCoin Pro platform.",
    category: "crypto",
    severity: "high",
    loss_amount: 12000000,
    date: "2026-03-18T00:00:00.000Z",
    sources_json: JSON.stringify([
      { title: "Gulf News", url: "https://gulfnews.com/example" },
      { title: "UAE SCA", url: "https://www.sca.gov.ae/example" }
    ]),
    tags_json: JSON.stringify(["احتيال", "الإمارات", "منصة_وهمية"]),
    status: "published",
    is_starred: 0,
    source_type: "manual",
  },
  {
    title_ar: "أجهزة إنترنت الأشياء الطبية تتوقف عن العمل بسبب انتهاء شهادات الأمان",
    title_en: "Medical IoT devices fail due to expired security certificates",
    description_ar: "توقفت مئات من أجهزة مراقبة المرضى المتصلة بالإنترنت في عدة مستشفيات سعودية عن العمل فجأة بسبب انتهاء صلاحية شهادات SSL الخاصة بالخادم المركزي. تسبب العطل في فقدان بيانات المراقبة الحيوية لمدة 6 ساعات، مما أدى إلى نقل 15 مريضاً للعناية المركزة كإجراء احترازي.",
    description_en: "Medical IoT monitoring devices failed in Saudi hospitals due to expired SSL certificates, causing 6-hour data loss.",
    category: "iot",
    severity: "critical",
    loss_amount: 2500000,
    date: "2026-03-15T00:00:00.000Z",
    sources_json: JSON.stringify([
      { title: "Arab News", url: "https://www.arabnews.com/example" },
      { title: "Health Ministry Statement", url: "https://www.moh.gov.sa/example" }
    ]),
    tags_json: JSON.stringify(["طبي", "مستشفيات", "السعودية", "SSL"]),
    status: "published",
    is_starred: 1,
    source_type: "manual",
  },
  {
    title_ar: "نموذج ذكاء اصطناعي لتوليد الصور ينتج محتوى مسيء عند طلب صور ثقافية عربية",
    title_en: "AI image model generates offensive content when prompted for Arab cultural images",
    description_ar: "أظهر تحقيق أن أحد نماذج توليد الصور بالذكاء الاصطناعي الشهيرة ينتج بشكل متكرر صوراً نمطية ومسيئة عند مطالبته بإنشاء صور تتعلق بالثقافة العربية والإسلامية. تضمنت النتائج ربط الثقافة العربية بالعنف والتخلف بشكل منهجي.",
    description_en: "Popular AI image model consistently generates stereotypical and offensive imagery when prompted for Arab cultural content.",
    category: "ai",
    severity: "medium",
    loss_amount: null,
    date: "2026-03-12T00:00:00.000Z",
    sources_json: JSON.stringify([
      { title: "Al Jazeera", url: "https://www.aljazeera.com/example" }
    ]),
    tags_json: JSON.stringify(["تحيز_ثقافي", "صور", "نمطية"]),
    status: "published",
    is_starred: 0,
    source_type: "auto",
  },
  {
    title_ar: "انهيار عملة مشفرة مرتبطة بمشاهير تكلف المستثمرين 8 ملايين دولار",
    title_en: "Celebrity-backed crypto token collapses costing investors $8M",
    description_ar: "انهارت قيمة عملة CelebToken المشفرة التي روّج لها مشاهير عرب على وسائل التواصل بنسبة 99.8% خلال ساعات قليلة بعد أن سحب المطورون السيولة فجأة. خسر أكثر من 5,000 مستثمر ما مجموعه 8 ملايين دولار. لم يصدر أي من المشاهير المروجين أي تعليق حتى الآن.",
    description_en: "CelebToken promoted by Arab celebrities collapsed 99.8% after developers pulled liquidity.",
    category: "crypto",
    severity: "high",
    loss_amount: 8000000,
    date: "2026-03-10T00:00:00.000Z",
    sources_json: JSON.stringify([
      { title: "CoinTelegraph", url: "https://cointelegraph.com/example" },
      { title: "Twitter Thread", url: "https://x.com/example" }
    ]),
    tags_json: JSON.stringify(["rug_pull", "مشاهير", "سيولة"]),
    status: "published",
    is_starred: 0,
    source_type: "manual",
  },
  {
    title_ar: "أقفال ذكية في فندق فاخر تتعطل وتحبس النزلاء داخل الغرف",
    title_en: "Smart locks malfunction at luxury hotel trapping guests in rooms",
    description_ar: "تعطل نظام الأقفال الذكية في فندق خمس نجوم في دبي مما أدى إلى احتجاز أكثر من 200 نزيل داخل غرفهم لمدة ساعتين. حدث العطل بعد تحديث برمجي فاشل لنظام إدارة الممتلكات المتصل بالأقفال. اضطر الفندق لاستخدام مفاتيح يدوية احتياطية.",
    description_en: "Smart locks at 5-star Dubai hotel malfunctioned after software update, trapping 200+ guests.",
    category: "iot",
    severity: "medium",
    loss_amount: 500000,
    date: "2026-03-08T00:00:00.000Z",
    sources_json: JSON.stringify([
      { title: "Khaleej Times", url: "https://www.khaleejtimes.com/example" }
    ]),
    tags_json: JSON.stringify(["أقفال_ذكية", "فنادق", "دبي"]),
    status: "published",
    is_starred: 0,
    source_type: "manual",
  },
  {
    title_ar: "سيارة ذاتية القيادة تتسبب في حادث بسبب خطأ في التعرف على إشارة المرور",
    title_en: "Self-driving car causes accident after misreading traffic signal",
    description_ar: "تسببت سيارة ذاتية القيادة تابعة لشركة تقنية كبرى في حادث مروري في سان فرانسيسكو بعد فشل نظام الذكاء الاصطناعي في التعرف على إشارة مرور حمراء بسبب انعكاس ضوء الشمس. أصيب شخصان بجروح طفيفة. هذا هو الحادث الخامس من نوعه هذا العام.",
    description_en: "Self-driving car caused collision in San Francisco after AI failed to recognize red light due to sun glare.",
    category: "ai",
    severity: "high",
    loss_amount: 350000,
    date: "2026-03-05T00:00:00.000Z",
    sources_json: JSON.stringify([
      { title: "The Verge", url: "https://www.theverge.com/example" },
      { title: "NHTSA Report", url: "https://www.nhtsa.gov/example" }
    ]),
    tags_json: JSON.stringify(["سيارات", "قيادة_ذاتية", "حوادث"]),
    status: "published",
    is_starred: 0,
    source_type: "auto",
  },
  {
    title_ar: "مسودة: تقرير عن ثغرة في منصة تداول عملات مشفرة",
    title_en: "Draft: Crypto exchange vulnerability report",
    description_ar: "تم اكتشاف ثغرة أمنية في منصة تداول عملات مشفرة رئيسية تسمح بالوصول غير المصرح به إلى حسابات المستخدمين. لا يزال التحقيق جارياً.",
    description_en: "Security vulnerability discovered in major crypto exchange allowing unauthorized account access.",
    category: "crypto",
    severity: "critical",
    loss_amount: null,
    date: "2026-03-30T00:00:00.000Z",
    sources_json: JSON.stringify([]),
    tags_json: JSON.stringify(["ثغرة", "تحقيق"]),
    status: "draft",
    is_starred: 0,
    source_type: "manual",
  },
];

const stmt = db.prepare(`
  INSERT INTO incidents (title_ar, title_en, description_ar, description_en, category, severity, loss_amount, date, sources_json, tags_json, image_url, status, is_starred, source_type, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const item of sampleIncidents) {
  stmt.run(
    item.title_ar,
    item.title_en,
    item.description_ar,
    item.description_en,
    item.category,
    item.severity,
    item.loss_amount,
    item.date,
    item.sources_json,
    item.tags_json,
    null,
    item.status,
    item.is_starred,
    item.source_type,
    new Date().toISOString()
  );
}

console.log(`Seeded ${sampleIncidents.length} incidents`);
db.close();
