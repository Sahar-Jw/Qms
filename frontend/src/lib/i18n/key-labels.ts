import type { Lang } from './index';

/** [Arabic, English] */
type Pair = [string, string];

/** Plain-language names of the areas of the website (the first part of a text key). */
export const SECTION_LABELS: Record<string, Pair> = {
  app: ['التطبيق', 'App'],
  nav: ['القائمة الجانبية', 'Menu'],
  common: ['نصوص مشتركة', 'Shared texts'],
  auth: ['تسجيل الدخول والتسجيل', 'Sign in & register'],
  landing: ['الصفحة الرئيسية للموقع', 'Landing page'],
  profile: ['الملف الشخصي', 'My profile'],
  status: ['حالات عرض السعر', 'Quotation statuses'],
  statusAction: ['أزرار تغيير الحالة', 'Status buttons'],
  roles: ['الأدوار', 'Roles'],
  dashboard: ['لوحة التحكم', 'Dashboard'],
  quotations: ['عروض الأسعار', 'Quotations'],
  customers: ['العملاء', 'Customers'],
  materials: ['المواد', 'Materials'],
  companies: ['الشركات', 'Companies'],
  users: ['المستخدمون', 'Users'],
  settings: ['الإعدادات', 'Settings'],
  brand: ['هوية الموقع', 'Branding'],
  files: ['ملفات الكتالوج', 'Catalog files'],
  theme: ['ألوان الموقع', 'Website colours'],
  texts: ['نصوص الموقع', 'Website texts'],
  audit: ['سجل التدقيق', 'Audit log'],
  pdf: ['عرض السعر المطبوع (PDF)', 'Printed quotation (PDF)'],
  search: ['البحث', 'Search'],
  err: ['رسائل الخطأ', 'Error messages'],
};

/** Plain-language names of the remaining parts of a key (groups and the text itself). */
export const PART_LABELS: Record<string, Pair> = {
  // groups
  tabs: ['التبويبات', 'Tabs'], colors: ['الألوان', 'Colours'], usedFor: ['يُستخدم في', 'Used for'], actions: ['الإجراءات', 'Actions'], entities: ['السجلات', 'Records'],
  // generic
  name: ['الاسم', 'Name'], title: ['العنوان', 'Title'], sub: ['الوصف تحت العنوان', 'Description under the title'], tagline: ['الشعار النصي', 'Tagline'], websiteName: ['اسم الموقع', 'Website name'], tabTitle: ['عنوان تبويب المتصفح', 'Browser tab title'], tabTitleHint: ['وصف عنوان التبويب', 'Tab title hint'], logo: ['الشعار', 'Logo'], icon: ['الأيقونة', 'Icon'],
  profile: ['الملف الشخصي', 'My profile'], dashboard: ['لوحة التحكم', 'Dashboard'], quotations: ['عروض الأسعار', 'Quotations'], customers: ['العملاء', 'Customers'],
  materials: ['المواد', 'Materials'], companies: ['الشركات', 'Companies'], users: ['المستخدمون', 'Users'], settings: ['الإعدادات', 'Settings'], search: ['البحث', 'Search'],
  save: ['حفظ', 'Save'], cancel: ['إلغاء', 'Cancel'], edit: ['تعديل', 'Edit'], add: ['إضافة', 'Add'], new: ['جديد', 'New'], all: ['الكل', 'All'], status: ['الحالة', 'Status'],
  showPassword: ['إظهار كلمة المرور', 'Show password'], hidePassword: ['إخفاء كلمة المرور', 'Hide password'], loading: ['جارٍ التحميل', 'Loading'], confirm: ['تأكيد', 'Confirm'],
  deactivateTitle: ['عنوان نافذة التعطيل', 'Deactivate window title'], deactivateMsg: ['رسالة التعطيل', 'Deactivate message'], deactivateUserMsg: ['رسالة تعطيل مستخدم', 'Deactivate user message'],
  confirmTitle: ['عنوان نافذة التأكيد', 'Confirm window title'], working: ['جارٍ التنفيذ', 'Working'], noData: ['لا توجد بيانات', 'No data yet'], back: ['رجوع', 'Back'], close: ['إغلاق', 'Close'],
  next: ['التالي', 'Next'], prev: ['السابق', 'Previous'], page: ['صفحة', 'Page'], of: ['من', 'Of'], total: ['الإجمالي', 'Total'], active: ['فعّال', 'Active'], inactive: ['معطّل', 'Inactive'],
  phone: ['الهاتف', 'Phone'], email: ['البريد الإلكتروني', 'Email'], notes: ['ملاحظات', 'Notes'], date: ['التاريخ', 'Date'], from: ['من', 'From'], to: ['إلى', 'To'], logout: ['تسجيل الخروج', 'Sign out'],
  language: ['اللغة', 'Language'], clear: ['مسح الفلاتر', 'Clear filters'], saved: ['تم الحفظ', 'Saved'], created: ['تم الإنشاء', 'Created'], updated: ['تم التحديث', 'Updated'], view: ['عرض', 'View'],
  print: ['طباعة', 'Print'], duplicate: ['نسخ', 'Duplicate'], activate: ['تفعيل', 'Activate'], deactivate: ['تعطيل', 'Deactivate'], country: ['البلد', 'Country'], website: ['الموقع الإلكتروني', 'Website'],
  address: ['العنوان', 'Address'], code: ['الرمز', 'Code'], optional: ['اختياري', 'Optional'], required: ['مطلوب', 'Required'], invalid: ['غير صالح', 'Invalid'], results: ['النتائج', 'Results'],
  none: ['رسالة عدم وجود نتائج', 'Nothing found message'], select: ['اختيار', 'Select'], yes: ['نعم', 'Yes'], no: ['لا', 'No'], lastLogin: ['آخر دخول', 'Last sign-in'], never: ['أبداً', 'Never'],
  role: ['الدور', 'Role'], rows: ['صفوف', 'Rows'],
  // auth
  forgot: ['رابط نسيت كلمة المرور', 'Forgot password link'], forgotTitle: ['عنوان نسيت كلمة المرور', 'Forgot password title'], forgotSub: ['وصف نسيت كلمة المرور', 'Forgot password description'],
  sendLink: ['زر إرسال الرابط', 'Send link button'], forgotSent: ['رسالة تم إرسال الرابط', 'Link sent message'], backToLogin: ['رابط العودة لتسجيل الدخول', 'Back to sign in link'],
  resetTitle: ['عنوان إعادة التعيين', 'Reset title'], resetSub: ['وصف إعادة التعيين', 'Reset description'], resetBtn: ['زر إعادة التعيين', 'Reset button'], resetDone: ['رسالة تمت الإعادة', 'Reset done message'],
  newPassword: ['كلمة المرور الجديدة', 'New password'], imagesFailed: ['رسالة فشل رفع الصور', 'Images failed message'], imageTooBig: ['رسالة الصورة كبيرة', 'Image too big message'], confirmPassword: ['تأكيد كلمة المرور', 'Confirm password'], passwordMismatch: ['رسالة كلمتا المرور غير متطابقتين', 'Passwords do not match message'], loginTitle: ['عنوان تسجيل الدخول', 'Sign-in title'], loginSub: ['وصف تسجيل الدخول', 'Sign-in description'],
  registerTitle: ['عنوان إنشاء حساب', 'Register title'], registerSub: ['وصف إنشاء حساب', 'Register description'], password: ['كلمة المرور', 'Password'], fullName: ['الاسم الكامل', 'Full name'],
  login: ['تسجيل الدخول', 'Sign in'], register: ['إنشاء حساب', 'Register'], noAccount: ['ليس لديك حساب؟', "Don't have an account?"], haveAccount: ['لديك حساب؟', 'Already have an account?'],
  pendingTitle: ['عنوان بانتظار التفعيل', 'Awaiting activation title'], pendingBody: ['نص بانتظار التفعيل', 'Awaiting activation text'], passwordHint: ['تلميح كلمة المرور', 'Password hint'],
  // landing
  heroTitle: ['العنوان الرئيسي', 'Main headline'], feat1: ['ميزة سريعة 1', 'Quick feature 1'], feat2: ['ميزة سريعة 2', 'Quick feature 2'], feat3: ['ميزة سريعة 3', 'Quick feature 3'],
  heroSub: ['الوصف تحت العنوان الرئيسي', 'Text under the main headline'], eyebrow: ['النص الصغير فوق العنوان', 'Small text above the headline'], start: ['زر البدء', 'Start button'],
  p1: ['عنصر المعاينة 1', 'Preview item 1'], p2: ['عنصر المعاينة 2', 'Preview item 2'], p3: ['عنصر المعاينة 3', 'Preview item 3'],
  f1Title: ['عنوان الميزة 1', 'Feature 1 title'], f1Body: ['نص الميزة 1', 'Feature 1 text'], f2Title: ['عنوان الميزة 2', 'Feature 2 title'], f2Body: ['نص الميزة 2', 'Feature 2 text'],
  f3Title: ['عنوان الميزة 3', 'Feature 3 title'], f3Body: ['نص الميزة 3', 'Feature 3 text'], f4Title: ['عنوان الميزة 4', 'Feature 4 title'], f4Body: ['نص الميزة 4', 'Feature 4 text'],
  f5Title: ['عنوان الميزة 5', 'Feature 5 title'], f5Body: ['نص الميزة 5', 'Feature 5 text'], f6Title: ['عنوان الميزة 6', 'Feature 6 title'], f6Body: ['نص الميزة 6', 'Feature 6 text'],
  featuresTitle: ['عنوان قسم المزايا', 'Features section title'], featuresSub: ['وصف قسم المزايا', 'Features section description'], stepsTitle: ['عنوان قسم الخطوات', 'Steps section title'],
  s1Title: ['عنوان الخطوة 1', 'Step 1 title'], s1Body: ['نص الخطوة 1', 'Step 1 text'], s2Title: ['عنوان الخطوة 2', 'Step 2 title'], s2Body: ['نص الخطوة 2', 'Step 2 text'],
  s3Title: ['عنوان الخطوة 3', 'Step 3 title'], s3Body: ['نص الخطوة 3', 'Step 3 text'], ctaTitle: ['عنوان دعوة الإجراء الأخيرة', 'Final call-to-action title'], ctaSub: ['وصف دعوة الإجراء الأخيرة', 'Final call-to-action description'],
  // profile
  accountData: ['بيانات الحساب', 'Account details'], memberSince: ['عضو منذ', 'Member since'], changePhoto: ['زر تغيير الصورة', 'Change photo button'], removePhoto: ['زر حذف الصورة', 'Remove photo button'],
  photoHint: ['تلميح الصورة', 'Photo hint'], photoSaved: ['رسالة حفظ الصورة', 'Photo saved message'], photoRemoved: ['رسالة حذف الصورة', 'Photo removed message'], tooBig: ['رسالة الصورة كبيرة', 'Image too big message'],
  emailLocked: ['رسالة البريد غير قابل للتعديل', 'Email cannot be changed message'],
  // statuses
  draft: ['مسودة', 'Draft'], expired: ['منتهي', 'Expired'], locked: ['ملغي', 'Cancelled'], invoiced: ['مفوتر', 'Invoiced'], done: ['تم', 'Done'],
  technical_manager: ['المدير التقني', 'Technical manager'], general_manager: ['المدير العام', 'General manager'], manager: ['المدير', 'Manager'], employee: ['الموظف', 'Employee'],
  // dashboard
  hello: ['التحية', 'Greeting'], issuingFrom: ['نص الإصدار من الشركة', 'Issuing from text'], noCompany: ['رسالة عدم اختيار شركة', 'No company chosen message'], chooseCompany: ['رابط اختيار الشركة', 'Choose company link'],
  newQuotation: ['زر عرض سعر جديد', 'New quotation button'], byStatus: ['حسب الحالة', 'By status'], recent: ['أحدث العروض', 'Latest quotations'], quick: ['إجراءات سريعة', 'Quick actions'],
  totalQuotations: ['إجمالي العروض', 'Total quotations'], seeAll: ['عرض الكل', 'See all'], empty: ['رسالة عدم وجود بيانات', 'Empty message'], thisIssuer: ['الشركة المُصدِرة الحالية', 'Current issuing company'],
  // quotations
  number: ['الرقم', 'Number'], customer: ['العميل', 'Customer'], company: ['الشركة', 'Company'], responsible: ['المسؤول', 'Responsible'], totals: ['المجاميع', 'Totals'], searchPh: ['نص مربع البحث', 'Search box hint'],
  archived: ['مؤرشف', 'Archived'], allStates: ['كل الحالات', 'All statuses'], newTitle: ['عنوان عرض جديد', 'New quotation title'], editTitle: ['عنوان تعديل العرض', 'Edit quotation title'],
  details: ['التفاصيل', 'Details'], items: ['البنود', 'Items'], addItem: ['زر إضافة بند', 'Add item button'], removeItem: ['زر حذف بند', 'Remove item button'], bank: ['البنك', 'Bank'],
  validity: ['مدة الصلاحية', 'Validity period'], deliveryTime: ['مدة التسليم', 'Delivery time'], oneDayRemaining: ['يوم واحد متبقٍ', 'One day remaining'], daysRemaining: ['الأيام المتبقية', 'Days remaining'], paymentMethod: ['طريقة الدفع', 'Payment method'], paymentLocation: ['مكان الدفع', 'Payment location'],
  deliveryMethod: ['طريقة التسليم', 'Delivery method'], customerPayment: ['طريقة دفع العميل', 'Customer payment way'], customerPaymentPh: ['تلميح طريقة دفع العميل', 'Customer payment hint'], tax: ['الضريبة', 'Tax'],
  internalNotes: ['ملاحظات داخلية', 'Internal notes'], itemNotes: ['ملاحظات البند', 'Item notes'], material: ['المادة', 'Material'], materialPh: ['تلميح اختيار المادة', 'Material picker hint'],
  customerPh: ['تلميح اختيار العميل', 'Customer picker hint'], quantity: ['الكمية', 'Quantity'], unit: ['الوحدة', 'Unit'], unitPrice: ['سعر الوحدة', 'Unit price'], currency: ['العملة', 'Currency'],
  shipping: ['الشحن', 'Shipping'], customs: ['الجمارك', 'Customs'], cost: ['التكلفة', 'Cost'], itemCost: ['الكلفة', 'Cost'], totalCost: ['إجمالي التكلفة', 'Total cost'], summary: ['الملخص', 'Summary'], itemsCount: ['عدد البنود', 'Number of items'],
  currenciesCount: ['عدد العملات', 'Number of currencies'], commission: ['العمولة', 'Commission'], value: ['القيمة', 'Value'], perCurrency: ['المجاميع حسب العملة', 'Totals by currency'],
  noItems: ['رسالة إضافة بند', 'Add at least one item message'], issuingCompany: ['الشركة المُصدِرة', 'Issuing company'], changeInSettings: ['رابط التغيير من الإعدادات', 'Change in settings link'], companyDraftHint: ['تلميح تغيير الشركة', 'Change company hint'],
  companyMissing: ['رسالة اختيار الشركة', 'Choose company message'], printAr: ['زر الطباعة بالعربية', 'Print Arabic button'], printEn: ['زر الطباعة بالإنجليزية', 'Print English button'],
  pdfFallback: ['رسالة تعذر ملف PDF', 'PDF unavailable message'], pdfAr: ['زر PDF عربي', 'Arabic PDF button'], pdfEn: ['زر PDF إنجليزي', 'English PDF button'], includeCost: ['خيار تضمين التكلفة', 'Include cost option'],
  readOnly: ['رسالة العرض للقراءة فقط', 'Read-only message'], notOwner: ['رسالة ليس صاحب العرض', 'Not the owner message'], mineOnly: ['عروضي فقط', 'My quotations only'],
  duplicated: ['رسالة تم النسخ', 'Duplicated message'], duplicateConfirm: ['تأكيد النسخ', 'Duplicate confirmation'], info: ['معلومات', 'Info'], contact: ['جهة الاتصال', 'Contact'], createdBy: ['أنشأه', 'Created by'],
  saveCreate: ['زر حفظ العرض الجديد', 'Save new quotation button'], saveEdit: ['زر حفظ التعديلات', 'Save changes button'], pickCustomer: ['اختيار عميل', 'Pick a customer'], pickMaterial: ['اختيار مادة', 'Pick a material'],
  totalQty: ['إجمالي الكمية', 'Total quantity'], noResults: ['رسالة لا نتائج', 'No results message'], createdOk: ['رسالة تم الإنشاء', 'Created message'], savedOk: ['رسالة تم الحفظ', 'Saved message'],
  // customers / materials / companies
  companyName: ['اسم الشركة', 'Company name'], nameAr: ['الاسم بالعربية', 'Arabic name'], nameEn: ['الاسم بالإنجليزية', 'English name'], addPhone: ['زر إضافة هاتف', 'Add phone button'],
  contactPerson: ['شخص الاتصال', 'Contact person'], contactPhone: ['هاتف جهة الاتصال', 'Contact phone'], nature: ['طبيعة العمل', 'Business nature'], nameHint: ['تلميح الاسم', 'Name hint'], source: ['المصدر', 'Source'],
  stock: ['المخزون', 'Stock'], origin: ['بلد المنشأ', 'Country of origin'], img: ['صورة المنتج', 'Product picture'],
  catalogFiles: ['ملفات الكتالوج', 'Catalog files'], catalogHint: ['تلميح ملفات الكتالوج', 'Catalog files hint'], addCatalogFiles: ['زر إضافة ملفات الكتالوج', 'Add catalog files button'],
  removeCatalogFile: ['زر حذف ملف الكتالوج', 'Remove catalog file button'], catalogLimit: ['رسالة حد ملفات الكتالوج', 'Catalog file limit message'], uploadingCatalog: ['رسالة رفع ملفات الكتالوج', 'Catalog upload message'],
  sellingPrice: ['سعر البيع', 'Selling price'], sellingCurrency: ['عملة البيع', 'Selling currency'], linkHint: ['تلميح رابط المنتج', 'Product link hint'], currencyHint: ['تلميح العملة', 'Currency hint'],
  model: ['الموديل', 'Model'], catalogueNo: ['رقم الكتالوج', 'Catalogue number'],
  addressAr: ['العنوان بالعربية', 'Arabic address'], addressEn: ['العنوان بالإنجليزية', 'English address'],
  printTitle: ['عنوان قسم الترويسة والتذييل', 'Print header/footer title'], printHint: ['تلميح الترويسة والتذييل', 'Print header/footer hint'],
  headerImage: ['صورة الترويسة', 'Header image'], footerImage: ['صورة التذييل', 'Footer image'], uploadImage: ['زر رفع صورة', 'Upload image button'],
  taxEnabled: ['خيار تطبيق الضريبة على البند', 'Apply tax checkbox (item)'],
  replaceImage: ['زر استبدال الصورة', 'Replace image button'], removeImage: ['زر حذف الصورة', 'Remove image button'], noImage: ['لا توجد صورة', 'No image'], uploadLogo: ['زر رفع الشعار', 'Upload logo button'], logoHint: ['تلميح الشعار', 'Logo hint'],
  saveFirst: ['رسالة احفظ أولاً', 'Save first message'],
  // users / settings
  pending: ['بانتظار التفعيل', 'Awaiting activation'], changeRole: ['تغيير الدور', 'Change role'], cannotSelf: ['رسالة لا يمكن تعديل حسابك', 'Cannot change own account message'],
  protected: ['رسالة حساب محمي', 'Protected account message'], companySub: ['وصف الشركة المُصدِرة', 'Issuing company description'], current: ['المحددة', 'Selected'], automatic: ['رسالة الاختيار التلقائي', 'Chosen automatically message'],
  currentPassword: ['كلمة المرور الحالية', 'Current password'], passwordChanged: ['رسالة تغيير كلمة المرور', 'Password changed message'], account: ['حسابك', 'Your account'], companySaved: ['رسالة حفظ الشركة', 'Company saved message'],
  pick: ['زر استخدام هذه الشركة', 'Use this company button'],
  // theme
  everyone: ['ملاحظة تنطبق على الجميع', 'Applies to everyone note'], preview: ['معاينة', 'Preview'], hex: ['رمز اللون', 'Hex colour'], ink: ['اللون الداكن', 'Dark colour'], cocoa: ['اللون الأساسي', 'Primary colour'],
  clay: ['لون التمييز', 'Accent colour'], stone: ['اللون الفاتح الهادئ', 'Soft colour'], sand: ['لون الخلفية', 'Background colour'], unsaved: ['رسالة تغييرات غير محفوظة', 'Unsaved changes message'],
  discard: ['زر تجاهل التغييرات', 'Discard changes button'], reset: ['زر إعادة الافتراضي', 'Reset button'], resetMsg: ['رسالة تأكيد الإعادة', 'Reset confirmation message'], resetConfirm: ['زر تأكيد الإعادة', 'Reset confirm button'],
  invalidHex: ['رسالة لون غير صالح', 'Invalid colour message'], weak: ['تحذير التباين الضعيف', 'Low contrast warning'], unreadable: ['تحذير نص غير مقروء', 'Unreadable text warning'],
  // texts tab
  section: ['القسم', 'Section'], allSections: ['كل الأقسام', 'All sections'], editedOnly: ['المعدّلة فقط', 'Edited only'], key: ['المكان', 'Location'], arabic: ['العربية', 'Arabic'], english: ['الإنجليزية', 'English'],
  edited: ['معدّل', 'Edited'], defaultText: ['النص الأصلي', 'Original text'], keepVars: ['تنبيه الرموز', 'Placeholders note'], missingVars: ['رسالة رمز ناقص', 'Missing placeholder message'], tip: ['نصيحة', 'Tip'],
  // audit
  when: ['الوقت', 'When'], user: ['المستخدم', 'User'], action: ['الإجراء', 'Action'], record: ['السجل', 'Record'], ip: ['عنوان IP', 'IP address'], allActions: ['كل الإجراءات', 'All actions'],
  allEntities: ['كل السجلات', 'All records'], submitted: ['البيانات المُرسلة', 'Submitted data'], noDetails: ['رسالة لا تفاصيل', 'No details message'], imageAdded: ['رسالة رفع صورة', 'Image uploaded message'], imageReplaced: ['رسالة استبدال صورة', 'Image replaced message'], imageRemoved: ['رسالة حذف صورة', 'Image removed message'], avatar: ['الصورة الشخصية', 'Profile picture'], unknownUser: ['مستخدم غير مسجّل', 'Not signed in user'],
  create: ['إنشاء', 'Created'], update: ['تحديث', 'Updated'], delete: ['حذف', 'Deleted'], status_change: ['تغيير الحالة', 'Status changed'], login_failed: ['فشل تسجيل الدخول', 'Failed sign-in'],
  change_password: ['تغيير كلمة المرور', 'Changed password'], forgot_password: ['طلب إعادة كلمة المرور', 'Asked for password reset'], reset_password: ['إعادة تعيين كلمة المرور', 'Reset password'],
  translations: ['نصوص الموقع', 'Website texts'], auth: ['الحساب', 'Account'], nothing: ['رسالة لا نتائج', 'No matches message'],
  // printed quotation columns
  link: ['الرابط', 'Link / product link'], attn: ['عناية', 'Attention'], desc: ['البيان', 'Description'], qty: ['الكمية', 'Quantity'],
  item: ['كلمة البند', 'Word "Item"'], catalog: ['كلمة الكتالوج تحت البند', 'Word "Catalog" under an item'], catalogTitle: ['عنوان الكتالوجات المرفقة', 'Attached catalogs title'], catalogEyebrow: ['النص الصغير فوق عنوان الكتالوج', 'Small text above the catalog title'],
  catalogMaterial: ['عمود المادة', 'Material column'], catalogFile: ['عمود الملف', 'File column'], catalogType: ['عمود النوع', 'Type column'], kindPdf: ['نوع الملف: PDF', 'File type: PDF'], kindWord: ['نوع الملف: Word', 'File type: Word'], kindImage: ['نوع الملف: صورة', 'File type: Image'], catalogRef: ['إشارة الكتالوج تحت كل بند', 'Catalog pointer under each item'], catalogPdfNote: ['ملاحظة ملفات PDF المرفقة', 'Attached PDF files note'],
  // accessibility labels
  openMenu: ['زر فتح القائمة', 'Open menu button'], clearValue: ['زر مسح الاختيار', 'Clear selection button'],
  // audit log, branding and materials screens
  after: ['بعد', 'After'], before: ['قبل', 'Before'], beforeUnavailable: ['رسالة القيمة السابقة غير مسجّلة', 'Previous value not recorded message'], changes: ['التغييرات', 'Changes'],
  inline: ['عرض قديم ← جديد', 'Old → new view'], sideBySide: ['عرض جنباً إلى جنب', 'Side by side view'], trueValue: ['قيمة «نعم»', '"Yes" value'], falseValue: ['قيمة «لا»', '"No" value'], assets: ['الصور والملفات', 'Pictures and files'],
  audit: ['سجل التدقيق', 'Audit log'], files: ['الملفات', 'Files'], brand: ['هوية الموقع', 'Branding'], texts: ['النصوص', 'Texts'], theme: ['المظهر', 'Theme'],
  catalogue: ['الكتالوج', 'Catalogue'], changeImage: ['زر تغيير الصورة', 'Change picture button'], clickToZoom: ['تلميح تكبير الصورة', 'Zoom picture hint'], image: ['صورة المنتج', 'Product picture'], imageHint: ['تلميح الصورة', 'Picture hint'],
  optimizing: ['رسالة تجهيز الصورة', 'Preparing picture message'], savingDetails: ['رسالة حفظ البيانات', 'Saving details message'], uploadingImage: ['رسالة رفع الملفات', 'Uploading files message'],
  iconHint: ['تلميح الأيقونة', 'Icon hint'], iconRemoved: ['رسالة حذف الأيقونة', 'Icon removed message'], iconSaved: ['رسالة تحديث الأيقونة', 'Icon updated message'],
  logoRemoved: ['رسالة حذف الشعار', 'Logo removed message'], logoSaved: ['رسالة تحديث الشعار', 'Logo updated message'], remove: ['زر الحذف', 'Remove button'], upload: ['زر الرفع', 'Upload button'],
  maxSize: ['حقل الحد الأقصى للحجم', 'Maximum size label'], range: ['تلميح المدى المسموح', 'Allowed range hint'],
  applies: ['ملاحظة: الملفات القديمة لا تتأثر', 'Note: old files are not affected'], slow: ['تنبيه بطء الطباعة', 'Slow printing warning'],
  catalogTooBig: ['رسالة ملف أكبر من المسموح', 'File too large message'],
  // error codes
  REFERENCE_CONFLICT: ['السجل مرتبط ببيانات أخرى', 'Record is in use'], INSUFFICIENT_STOCK: ['المخزون غير كافٍ', 'Insufficient stock'], CATALOG_LIMIT_EXCEEDED: ['تجاوز حد ملفات الكتالوج', 'Catalog file limit exceeded'],
  CATALOG_FILE_NOT_FOUND: ['ملف الكتالوج غير موجود', 'Catalog file not found'], INVALID_CATALOG_FILE: ['ملف كتالوج غير صالح', 'Invalid catalog file'], CATALOG_FILE_UNAVAILABLE: ['ملف الكتالوج غير متاح', 'Catalog file unavailable'], CATALOG_FILE_TOO_LARGE: ['ملف الكتالوج أكبر من المسموح', 'Catalog file too large'],
  TOO_MANY_REQUESTS: ['طلبات كثيرة', 'Too many requests'], PAYLOAD_TOO_LARGE: ['الملف كبير جداً', 'File too large'], INTERNAL_SERVER_ERROR: ['خطأ داخلي في الخادم', 'Internal server error'],
  COMPANY_NOT_FOUND: ['الشركة غير موجودة', 'Company not found'], COMPANY_INACTIVE: ['الشركة معطّلة', 'Company inactive'], COMPANY_CANNOT_CHANGE: ['لا يمكن تغيير الشركة المُصدِرة', 'Issuing company cannot be changed'],
  CUSTOMER_NOT_FOUND: ['العميل غير موجود', 'Customer not found'], MATERIAL_NOT_FOUND: ['المادة غير موجودة', 'Material not found'], ROLE_NOT_FOUND: ['الدور غير موجود', 'Role not found'],
  USER_NOT_FOUND: ['المستخدم غير موجود', 'User not found'], FILE_REQUIRED: ['الملف مطلوب', 'File required'], INVALID_PERCENTAGE: ['نسبة غير صالحة', 'Invalid percentage'],
  ITEM_NOT_IN_QUOTATION: ['البند لا يتبع العرض', 'Item not in quotation'], FIELD_REQUIRED: ['الحقل مطلوب', 'Field required'],
  INVALID_CREDENTIALS: ['بريد أو كلمة مرور خاطئة', 'Wrong email or password'], ACCOUNT_LOCKED: ['الحساب مقفل مؤقتاً', 'Account temporarily locked'], ACCOUNT_NOT_ACTIVATED: ['الحساب غير مفعّل', 'Account not activated'],
  INVALID_RESET_TOKEN: ['رابط إعادة التعيين غير صالح', 'Invalid reset link'], EMAIL_TAKEN: ['البريد مستخدم مسبقاً', 'Email already registered'], VALIDATION_FAILED: ['فشل التحقق من الحقول', 'Fields failed validation'],
  FORBIDDEN: ['ممنوع: لا صلاحية', 'Forbidden: no permission'], UNAUTHORIZED: ['غير مصرّح: سجّل الدخول', 'Unauthorized: sign in again'], QUOTATION_READ_ONLY: ['العرض للقراءة فقط', 'Quotation is read-only'],
  NOT_OWNER: ['ليس صاحب العرض', 'Not the quotation owner'], PROTECTED_ACCOUNT: ['حساب محمي', 'Protected account'], INVALID_STATUS_TRANSITION: ['تغيير حالة غير مسموح', 'Status change not allowed'],
  ISSUING_COMPANY_NOT_SET: ['لم تُختر الشركة المُصدِرة', 'Issuing company not set'], ISSUING_COMPANY_INACTIVE: ['الشركة المُصدِرة معطّلة', 'Issuing company inactive'], CUSTOMER_INACTIVE: ['العميل معطّل', 'Customer inactive'],
  MATERIAL_INACTIVE: ['المادة معطّلة', 'Material inactive'], DUPLICATE_ENTRY: ['سجل مكرر', 'Duplicate record'], CUSTOMER_NAME_REQUIRED: ['اسم العميل مطلوب', 'Customer name required'],
  MATERIAL_NAME_REQUIRED: ['اسم المادة مطلوب', 'Material name required'], PRICE_CURRENCY_REQUIRED: ['عملة السعر مطلوبة', 'Price currency required'], COMPANY_MISMATCH: ['عدم تطابق الشركة', 'Company mismatch'],
  VALIDITY_BEFORE_QUOTATION_DATE: ['تاريخ الصلاحية قبل تاريخ العرض', 'Validity date before quotation date'],
  PASSWORD_MISMATCH: ['كلمتا المرور غير متطابقتين', 'Passwords do not match'], CANNOT_DEACTIVATE_SELF: ['لا يمكن تعطيل حسابك', 'Cannot deactivate yourself'], CANNOT_CHANGE_OWN_ROLE: ['لا يمكن تغيير دورك', 'Cannot change own role'], ROLE_NOT_ASSIGNABLE: ['دور غير قابل للمنح', 'Role not assignable'], WRONG_CURRENT_PASSWORD: ['كلمة المرور الحالية خاطئة', 'Wrong current password'],
  PDF_ENGINE_UNAVAILABLE: ['PDF غير متاح', 'PDF unavailable'], INVALID_FILE_TYPE: ['نوع ملف غير مسموح', 'File type not allowed'], INTERNAL_ERROR: ['خطأ في الخادم', 'Server error'],
  NETWORK: ['تعذر الاتصال بالخادم', 'Cannot reach the server'], QUOTATION_NOT_FOUND: ['العرض غير موجود', 'Quotation not found'],
};

const humanize = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
const idx = (lang: Lang) => (lang === 'ar' ? 0 : 1);

export const sectionLabel = (section: string, lang: Lang) => SECTION_LABELS[section]?.[idx(lang)] ?? humanize(section);

/** "settings.tabs.audit" -> "الإعدادات › التبويبات › سجل التدقيق" / "Settings › Tabs › Audit log" */
export function keyLabel(key: string, lang: Lang): string {
  const [section, ...rest] = key.split('.');
  return [sectionLabel(section, lang), ...rest.map((p) => PART_LABELS[p]?.[idx(lang)] ?? humanize(p))].join(' › ');
}
