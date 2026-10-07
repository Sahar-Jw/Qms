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
  theme: ['ألوان الموقع', 'Website colours'],
  texts: ['نصوص الموقع', 'Website texts'],
  audit: ['سجل التدقيق', 'Audit log'],
  search: ['البحث', 'Search'],
  err: ['رسائل الخطأ', 'Error messages'],
};

/** Plain-language names of the remaining parts of a key (groups and the text itself). */
export const PART_LABELS: Record<string, Pair> = {
  // groups
  tabs: ['التبويبات', 'Tabs'], colors: ['الألوان', 'Colours'], usedFor: ['يُستخدم في', 'Used for'], actions: ['الإجراءات', 'Actions'], entities: ['السجلات', 'Records'],
  // generic
  name: ['الاسم', 'Name'], title: ['العنوان', 'Title'], sub: ['الوصف تحت العنوان', 'Description under the title'], tagline: ['الشعار النصي', 'Tagline'],
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
  newPassword: ['كلمة المرور الجديدة', 'New password'], loginTitle: ['عنوان تسجيل الدخول', 'Sign-in title'], loginSub: ['وصف تسجيل الدخول', 'Sign-in description'],
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
  draft: ['مسودة', 'Draft'], issued: ['صادر', 'Issued'], expired: ['منتهي', 'Expired'], locked: ['مقفل', 'Locked'], invoiced: ['مفوتر', 'Invoiced'], unlock: ['فتح القفل', 'Unlock'], done: ['تم', 'Done'],
  technical_manager: ['المدير التقني', 'Technical manager'], general_manager: ['المدير العام', 'General manager'], manager: ['المدير', 'Manager'], employee: ['الموظف', 'Employee'],
  // dashboard
  hello: ['التحية', 'Greeting'], issuingFrom: ['نص الإصدار من الشركة', 'Issuing from text'], noCompany: ['رسالة عدم اختيار شركة', 'No company chosen message'], chooseCompany: ['رابط اختيار الشركة', 'Choose company link'],
  newQuotation: ['زر عرض سعر جديد', 'New quotation button'], byStatus: ['حسب الحالة', 'By status'], recent: ['أحدث العروض', 'Latest quotations'], quick: ['إجراءات سريعة', 'Quick actions'],
  totalQuotations: ['إجمالي العروض', 'Total quotations'], seeAll: ['عرض الكل', 'See all'], empty: ['رسالة عدم وجود بيانات', 'Empty message'], thisIssuer: ['الشركة المُصدِرة الحالية', 'Current issuing company'],
  // quotations
  number: ['الرقم', 'Number'], customer: ['العميل', 'Customer'], company: ['الشركة', 'Company'], responsible: ['المسؤول', 'Responsible'], totals: ['المجاميع', 'Totals'], searchPh: ['نص مربع البحث', 'Search box hint'],
  archived: ['مؤرشف', 'Archived'], allStates: ['كل الحالات', 'All statuses'], newTitle: ['عنوان عرض جديد', 'New quotation title'], editTitle: ['عنوان تعديل العرض', 'Edit quotation title'],
  details: ['التفاصيل', 'Details'], items: ['البنود', 'Items'], addItem: ['زر إضافة بند', 'Add item button'], removeItem: ['زر حذف بند', 'Remove item button'], bank: ['البنك', 'Bank'],
  validity: ['مدة الصلاحية', 'Validity period'], deliveryTime: ['مدة التسليم', 'Delivery time'], paymentMethod: ['طريقة الدفع', 'Payment method'], paymentLocation: ['مكان الدفع', 'Payment location'],
  deliveryMethod: ['طريقة التسليم', 'Delivery method'], customerPayment: ['طريقة دفع العميل', 'Customer payment way'], customerPaymentPh: ['تلميح طريقة دفع العميل', 'Customer payment hint'], tax: ['الضريبة', 'Tax'],
  internalNotes: ['ملاحظات داخلية', 'Internal notes'], itemNotes: ['ملاحظات البند', 'Item notes'], material: ['المادة', 'Material'], materialPh: ['تلميح اختيار المادة', 'Material picker hint'],
  customerPh: ['تلميح اختيار العميل', 'Customer picker hint'], quantity: ['الكمية', 'Quantity'], unit: ['الوحدة', 'Unit'], unitPrice: ['سعر الوحدة', 'Unit price'], currency: ['العملة', 'Currency'],
  shipping: ['الشحن', 'Shipping'], customs: ['الجمارك', 'Customs'], cost: ['التكلفة', 'Cost'], totalCost: ['إجمالي التكلفة', 'Total cost'], summary: ['الملخص', 'Summary'], itemsCount: ['عدد البنود', 'Number of items'],
  currenciesCount: ['عدد العملات', 'Number of currencies'], commission: ['العمولة', 'Commission'], value: ['القيمة', 'Value'], perCurrency: ['المجاميع حسب العملة', 'Totals by currency'],
  noItems: ['رسالة إضافة بند', 'Add at least one item message'], issuingCompany: ['الشركة المُصدِرة', 'Issuing company'], changeInSettings: ['رابط التغيير من الإعدادات', 'Change in settings link'],
  companyMissing: ['رسالة اختيار الشركة', 'Choose company message'], printAr: ['زر الطباعة بالعربية', 'Print Arabic button'], printEn: ['زر الطباعة بالإنجليزية', 'Print English button'],
  pdfFallback: ['رسالة تعذر ملف PDF', 'PDF unavailable message'], pdfAr: ['زر PDF عربي', 'Arabic PDF button'], pdfEn: ['زر PDF إنجليزي', 'English PDF button'], includeCost: ['خيار تضمين التكلفة', 'Include cost option'],
  readOnly: ['رسالة العرض للقراءة فقط', 'Read-only message'], notOwner: ['رسالة ليس صاحب العرض', 'Not the owner message'], mineOnly: ['عروضي فقط', 'My quotations only'],
  duplicated: ['رسالة تم النسخ', 'Duplicated message'], duplicateConfirm: ['تأكيد النسخ', 'Duplicate confirmation'], info: ['معلومات', 'Info'], contact: ['جهة الاتصال', 'Contact'], createdBy: ['أنشأه', 'Created by'],
  saveCreate: ['زر حفظ العرض الجديد', 'Save new quotation button'], saveEdit: ['زر حفظ التعديلات', 'Save changes button'], pickCustomer: ['اختيار عميل', 'Pick a customer'], pickMaterial: ['اختيار مادة', 'Pick a material'],
  totalQty: ['إجمالي الكمية', 'Total quantity'], noResults: ['رسالة لا نتائج', 'No results message'], createdOk: ['رسالة تم الإنشاء', 'Created message'], savedOk: ['رسالة تم الحفظ', 'Saved message'],
  // customers / materials / companies
  companyName: ['اسم الشركة', 'Company name'], nameAr: ['الاسم بالعربية', 'Arabic name'], nameEn: ['الاسم بالإنجليزية', 'English name'], addPhone: ['زر إضافة هاتف', 'Add phone button'],
  contactPerson: ['شخص الاتصال', 'Contact person'], contactPhone: ['هاتف جهة الاتصال', 'Contact phone'], nature: ['طبيعة العمل', 'Business nature'], nameHint: ['تلميح الاسم', 'Name hint'], source: ['المصدر', 'Source'],
  stock: ['المخزون', 'Stock'], origin: ['بلد المنشأ', 'Country of origin'], catalogue: ['الكتالوج', 'Catalogue'], model: ['الموديل', 'Model'], catalogueNo: ['رقم الكتالوج', 'Catalogue number'],
  addressAr: ['العنوان بالعربية', 'Arabic address'], addressEn: ['العنوان بالإنجليزية', 'English address'], logo: ['الشعار', 'Logo'], uploadLogo: ['زر رفع الشعار', 'Upload logo button'], logoHint: ['تلميح الشعار', 'Logo hint'],
  saveFirst: ['رسالة احفظ أولاً', 'Save first message'],
  // users / settings
  pending: ['بانتظار التفعيل', 'Awaiting activation'], changeRole: ['تغيير الدور', 'Change role'], cannotSelf: ['رسالة لا يمكن تعديل حسابك', 'Cannot change own account message'],
  protected: ['رسالة حساب محمي', 'Protected account message'], companySub: ['وصف الشركة المُصدِرة', 'Issuing company description'], current: ['المحددة', 'Selected'], automatic: ['رسالة الاختيار التلقائي', 'Chosen automatically message'],
  currentPassword: ['كلمة المرور الحالية', 'Current password'], passwordChanged: ['رسالة تغيير كلمة المرور', 'Password changed message'], account: ['حسابك', 'Your account'], companySaved: ['رسالة حفظ الشركة', 'Company saved message'],
  pick: ['زر استخدام هذه الشركة', 'Use this company button'], theme: ['المظهر', 'Theme'], texts: ['النصوص', 'Texts'], audit: ['سجل التدقيق', 'Audit log'],
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
  allEntities: ['كل السجلات', 'All records'], submitted: ['البيانات المُرسلة', 'Submitted data'], noDetails: ['رسالة لا تفاصيل', 'No details message'], unknownUser: ['مستخدم غير مسجّل', 'Not signed in user'],
  create: ['إنشاء', 'Created'], update: ['تحديث', 'Updated'], delete: ['حذف', 'Deleted'], status_change: ['تغيير الحالة', 'Status changed'], login_failed: ['فشل تسجيل الدخول', 'Failed sign-in'],
  change_password: ['تغيير كلمة المرور', 'Changed password'], forgot_password: ['طلب إعادة كلمة المرور', 'Asked for password reset'], reset_password: ['إعادة تعيين كلمة المرور', 'Reset password'],
  translations: ['نصوص الموقع', 'Website texts'], auth: ['الحساب', 'Account'], nothing: ['رسالة لا نتائج', 'No matches message'],
  // error codes
  INVALID_CREDENTIALS: ['بريد أو كلمة مرور خاطئة', 'Wrong email or password'], ACCOUNT_LOCKED: ['الحساب مقفل مؤقتاً', 'Account temporarily locked'], ACCOUNT_NOT_ACTIVATED: ['الحساب غير مفعّل', 'Account not activated'],
  INVALID_RESET_TOKEN: ['رابط إعادة التعيين غير صالح', 'Invalid reset link'], EMAIL_TAKEN: ['البريد مستخدم مسبقاً', 'Email already registered'], VALIDATION_FAILED: ['فشل التحقق من الحقول', 'Fields failed validation'],
  FORBIDDEN: ['ممنوع: لا صلاحية', 'Forbidden: no permission'], UNAUTHORIZED: ['غير مصرّح: سجّل الدخول', 'Unauthorized: sign in again'], QUOTATION_READ_ONLY: ['العرض للقراءة فقط', 'Quotation is read-only'],
  NOT_OWNER: ['ليس صاحب العرض', 'Not the quotation owner'], PROTECTED_ACCOUNT: ['حساب محمي', 'Protected account'], INVALID_STATUS_TRANSITION: ['تغيير حالة غير مسموح', 'Status change not allowed'],
  ISSUING_COMPANY_NOT_SET: ['لم تُختر الشركة المُصدِرة', 'Issuing company not set'], ISSUING_COMPANY_INACTIVE: ['الشركة المُصدِرة معطّلة', 'Issuing company inactive'], CUSTOMER_INACTIVE: ['العميل معطّل', 'Customer inactive'],
  MATERIAL_INACTIVE: ['المادة معطّلة', 'Material inactive'], DUPLICATE_ENTRY: ['سجل مكرر', 'Duplicate record'], CUSTOMER_NAME_REQUIRED: ['اسم العميل مطلوب', 'Customer name required'],
  MATERIAL_NAME_REQUIRED: ['اسم المادة مطلوب', 'Material name required'], PRICE_CURRENCY_REQUIRED: ['عملة السعر مطلوبة', 'Price currency required'], COMPANY_MISMATCH: ['عدم تطابق الشركة', 'Company mismatch'],
  CANNOT_DEACTIVATE_SELF: ['لا يمكن تعطيل حسابك', 'Cannot deactivate yourself'], CANNOT_CHANGE_OWN_ROLE: ['لا يمكن تغيير دورك', 'Cannot change own role'], WRONG_CURRENT_PASSWORD: ['كلمة المرور الحالية خاطئة', 'Wrong current password'],
  PDF_ENGINE_UNAVAILABLE: ['PDF غير متاح', 'PDF unavailable'], INVALID_FILE_TYPE: ['نوع ملف غير مسموح', 'File type not allowed'], INTERNAL_ERROR: ['خطأ في الخادم', 'Server error'],
  NETWORK: ['تعذر الاتصال بالخادم', 'Cannot reach the server'], QUOTATION_NOT_FOUND: ['العرض غير موجود', 'Quotation not found'], DICTIONARY_ENTRY_NOT_FOUND: ['المصطلح غير موجود', 'Term not found'],
};

const humanize = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
const idx = (lang: Lang) => (lang === 'ar' ? 0 : 1);

export const sectionLabel = (section: string, lang: Lang) => SECTION_LABELS[section]?.[idx(lang)] ?? humanize(section);

/** "settings.tabs.audit" -> "الإعدادات › التبويبات › سجل التدقيق" / "Settings › Tabs › Audit log" */
export function keyLabel(key: string, lang: Lang): string {
  const [section, ...rest] = key.split('.');
  return [sectionLabel(section, lang), ...rest.map((p) => PART_LABELS[p]?.[idx(lang)] ?? humanize(p))].join(' › ');
}
