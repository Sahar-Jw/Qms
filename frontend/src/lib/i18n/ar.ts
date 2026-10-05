import type en from './en';

type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };

const ar: Shape<typeof en> = {
  app: { name: 'عروض الأسعار', tagline: 'الأسعار والعملاء والمواد في مكان واحد' },
  nav: { dashboard: 'لوحة التحكم', quotations: 'عروض الأسعار', customers: 'العملاء', materials: 'المواد', companies: 'الشركات', users: 'المستخدمون', settings: 'الإعدادات', search: 'ابحث في العروض والعملاء والمواد' },
  common: {
    save: 'حفظ', cancel: 'إلغاء', edit: 'تعديل', add: 'إضافة', new: 'جديد', search: 'بحث', all: 'الكل', status: 'الحالة', actions: 'إجراءات',
    loading: 'جارٍ التحميل…', noData: 'لا يوجد شيء هنا بعد', back: 'رجوع', close: 'إغلاق', next: 'التالي', prev: 'السابق', page: 'صفحة', of: 'من', total: 'الإجمالي',
    active: 'فعّال', inactive: 'غير فعّال', name: 'الاسم', phone: 'الهاتف', email: 'البريد الإلكتروني', notes: 'ملاحظات', date: 'التاريخ', from: 'من', to: 'إلى',
    logout: 'تسجيل الخروج', language: 'اللغة', clear: 'مسح التصفية', saved: 'تم الحفظ', created: 'تم الإنشاء', updated: 'تم التحديث', view: 'عرض', print: 'طباعة',
    duplicate: 'نسخ', activate: 'تفعيل', deactivate: 'إيقاف', country: 'البلد', website: 'الموقع الإلكتروني', address: 'العنوان', code: 'الرمز',
    optional: 'اختياري', required: 'مطلوب', invalid: 'قيمة غير صالحة', results: 'نتيجة', none: 'لا شيء', select: 'اختر…', yes: 'نعم', no: 'لا',
    lastLogin: 'آخر دخول', never: 'لم يدخل بعد', role: 'الدور', rows: 'سجل',
  },
  auth: {
    loginTitle: 'أهلاً بعودتك', loginSub: 'سجّل الدخول لإدارة عروض الأسعار', registerTitle: 'أنشئ حسابك', registerSub: 'يجب أن يفعّل المدير حسابك قبل أن تتمكن من الدخول',
    email: 'البريد الإلكتروني', password: 'كلمة المرور', fullName: 'الاسم الكامل', phone: 'الهاتف', login: 'تسجيل الدخول', register: 'إنشاء حساب',
    noAccount: 'ليس لديك حساب؟', haveAccount: 'لديك حساب؟', pendingTitle: 'تم إنشاء الحساب', pendingBody: 'يجب أن يفعّل المدير العام حسابك. يمكنك الدخول بعد التفعيل.',
    passwordHint: '8 أحرف على الأقل بين حروف وأرقام', heroTitle: 'كل عرض سعر، بسعره الصحيح',
    feat1: 'عربي وإنجليزي', feat2: 'إجماليات لكل عملة', feat3: 'طباعة وPDF', heroSub: 'أنشئ العروض بالعربية أو الإنجليزية، وأبقِ كل عملة منفصلة، واطبع بضغطة واحدة.',
  },
  status: { draft: 'مسودة', issued: 'صادر', expired: 'منتهي', locked: 'مقفل', invoiced: 'محوّل إلى فاتورة' },
  statusAction: {
    issued: 'إصدار العرض', draft: 'إعادته إلى مسودة', expired: 'تحديده كمنتهي', locked: 'قفل', invoiced: 'تحويل إلى فاتورة', unlock: 'فك القفل',
    confirm: 'تغيير الحالة إلى "{status}"؟', done: 'تم تغيير الحالة إلى {status}',
  },
  roles: { technical_manager: 'المدير التقني', general_manager: 'المدير العام', manager: 'المدير', employee: 'الموظف' },
  dashboard: {
    hello: 'مرحباً {name}', issuingFrom: 'تصدر العروض الجديدة باسم', noCompany: 'لم تختر الشركة المُصدِرة بعد', chooseCompany: 'اخترها من الإعدادات',
    newQuotation: 'عرض سعر جديد', byStatus: 'العروض حسب الحالة', recent: 'آخر العروض', quick: 'وصول سريع', totalQuotations: 'إجمالي العروض',
    seeAll: 'عرض الكل', empty: 'لا توجد عروض بعد. أنشئ أول عرض.', thisIssuer: 'الشركة المُصدِرة',
  },
  quotations: {
    title: 'عروض الأسعار', number: 'الرقم', date: 'التاريخ', customer: 'العميل', company: 'الشركة', responsible: 'المسؤول', totals: 'الإجماليات',
    searchPh: 'الرقم، العميل، المادة، المصرف، الملاحظات…', archived: 'المقفلة', active: 'غير المقفلة', allStates: 'الكل',
    newTitle: 'عرض سعر جديد', editTitle: 'تعديل {number}', details: 'بيانات العرض', items: 'البنود', addItem: 'إضافة بند', removeItem: 'حذف البند',
    bank: 'المصرف', validity: 'مدة الصلاحية', deliveryTime: 'مدة التسليم', paymentMethod: 'طريقة الدفع', paymentLocation: 'مكان الدفع',
    deliveryMethod: 'طريقة التسليم', customerPayment: 'طريقة دفع العميل', customerPaymentPh: 'مثال: دفعة مقدمة 50٪ والباقي عند التسليم',
    tax: 'نسبة الضريبة %', internalNotes: 'ملاحظات داخلية (لا تُطبع)', itemNotes: 'ملاحظة البند (لا تُطبع)',
    material: 'المادة', materialPh: 'ابحث بالرمز أو الاسم', customerPh: 'ابحث عن عميل', quantity: 'الكمية', unit: 'الوحدة', unitPrice: 'سعر الوحدة',
    currency: 'العملة', shipping: 'الشحن', customs: 'التخليص الجمركي', cost: 'تكلفة الوحدة', totalCost: 'التكلفة', summary: 'الملخص', itemsCount: 'البنود', currenciesCount: 'العملات', commission: 'العمولة %', value: 'القيمة', required: 'المطلوب',
    perCurrency: 'الإجماليات حسب العملة', noItems: 'أضف بنداً واحداً على الأقل', issuingCompany: 'تصدر باسم', changeInSettings: 'تغيير من الإعدادات',
    companyMissing: 'اختر الشركة المُصدِرة من الإعدادات قبل إنشاء العروض.', printAr: 'طباعة عربي', printEn: 'طباعة إنجليزي',
    pdfAr: 'PDF عربي', pdfEn: 'PDF إنجليزي', includeCost: 'مع التكلفة', readOnly: 'هذا العرض للقراءة فقط.', notOwner: 'يمكنك تعديل العروض التي أنشأتها فقط.', mineOnly: 'للعرض فقط', duplicated: 'تم إنشاء النسخة: {number}',
    duplicateConfirm: 'إنشاء نسخة كاملة من هذا العرض كمسودة جديدة؟', info: 'المعلومات', contact: 'جهة الاتصال', createdBy: 'المسؤول',
    saveCreate: 'إنشاء العرض', saveEdit: 'حفظ التعديلات', pickCustomer: 'اختر عميلاً', pickMaterial: 'اختر مادة',
    totalQty: 'بنود', noResults: 'لا توجد نتائج مطابقة', createdOk: 'تم إنشاء العرض {number}', savedOk: 'تم حفظ العرض',
  },
  customers: {
    title: 'العملاء', new: 'عميل جديد', edit: 'تعديل العميل', nameAr: 'الاسم بالعربية', nameEn: 'الاسم بلغة أجنبية', searchPh: 'الاسم، البلد، الهاتف، جهة الاتصال…',
    manager: 'المدير', contactPerson: 'الشخص المسؤول', contactPhone: 'هاتف الشخص المسؤول', nature: 'طبيعة العمل', nameHint: 'املأ أحد الاسمين على الأقل',
  },
  materials: {
    title: 'المواد', new: 'مادة جديدة', edit: 'تعديل المادة', code: 'الرمز', nameAr: 'الاسم بالعربية', nameEn: 'الاسم بلغة أجنبية', source: 'المصدر',
    stock: 'المخزون', unitPrice: 'سعر الوحدة', unit: 'الوحدة', currency: 'العملة', origin: 'بلد المنشأ', catalogue: 'الكتالوج', model: 'رقم الموديل',
    catalogueNo: 'رقم الكتالوج', searchPh: 'الرمز، الاسم، المصدر، الكتالوج…',
  },
  companies: {
    title: 'الشركات', new: 'شركة جديدة', edit: 'تعديل الشركة', nameAr: 'الاسم بالعربية', nameEn: 'الاسم بالإنجليزية', addressAr: 'العنوان بالعربية',
    addressEn: 'العنوان بالإنجليزية', logo: 'الشعار', uploadLogo: 'رفع الشعار', logoHint: 'PNG أو JPG أو WEBP حتى 1 ميغابايت', saveFirst: 'احفظ الشركة أولاً ثم ارفع شعارها',
  },
  users: { title: 'المستخدمون', pending: 'بانتظار التفعيل', changeRole: 'تغيير الدور', cannotSelf: 'لا يمكنك تعديل حسابك الخاص', protected: 'لا يستطيع المدير التقني والمدير العام تعديل حساب بعضهما' },
  settings: {
    title: 'الإعدادات', company: 'الشركة المُصدِرة', companySub: 'كل عرض سعر تنشئه يصدر باسم هذه الشركة.', current: 'المحددة',
    automatic: 'تُستخدم تلقائياً لأنها الشركة الفعّالة الوحيدة', password: 'تغيير كلمة المرور', currentPassword: 'كلمة المرور الحالية',
    newPassword: 'كلمة المرور الجديدة', passwordChanged: 'تم تغيير كلمة المرور', account: 'حسابك', companySaved: 'تم تحديث الشركة المُصدِرة', pick: 'استخدام هذه الشركة',
  },
  search: { title: 'نتائج البحث عن "{q}"', empty: 'اكتب شيئاً في خانة البحث بالأعلى', quotations: 'عروض الأسعار', customers: 'العملاء', materials: 'المواد', nothing: 'لا توجد نتائج' },
  err: {
    INVALID_CREDENTIALS: 'البريد الإلكتروني أو كلمة المرور غير صحيحة', ACCOUNT_LOCKED: 'محاولات فاشلة كثيرة. أعد المحاولة بعد 15 دقيقة.', ACCOUNT_NOT_ACTIVATED: 'لم يتم تفعيل حسابك بعد',
    EMAIL_TAKEN: 'هذا البريد الإلكتروني مسجّل مسبقاً', VALIDATION_FAILED: 'يرجى مراجعة الحقول المحددة', FORBIDDEN: 'ليست لديك صلاحية لتنفيذ هذا الإجراء',
    UNAUTHORIZED: 'يرجى تسجيل الدخول من جديد', QUOTATION_READ_ONLY: 'لم يعد بالإمكان تعديل هذا العرض', NOT_OWNER: 'يمكنك تعديل العروض التي أنشأتها فقط', PROTECTED_ACCOUNT: 'لا يستطيع المدير التقني والمدير العام تعديل حساب بعضهما', INVALID_STATUS_TRANSITION: 'تغيير الحالة هذا غير مسموح',
    ISSUING_COMPANY_NOT_SET: 'اختر الشركة المُصدِرة من الإعدادات أولاً', ISSUING_COMPANY_INACTIVE: 'الشركة المُصدِرة المختارة غير فعّالة. اختر شركة أخرى من الإعدادات.',
    CUSTOMER_INACTIVE: 'هذا العميل غير فعّال', MATERIAL_INACTIVE: 'هذه المادة غير فعّالة', DUPLICATE_ENTRY: 'يوجد سجل بنفس القيمة الفريدة مسبقاً',
    CUSTOMER_NAME_REQUIRED: 'أدخل اسم العميل بالعربية أو بلغة أجنبية', MATERIAL_NAME_REQUIRED: 'أدخل اسم المادة بالعربية أو بلغة أجنبية',
    PRICE_CURRENCY_REQUIRED: 'أدخل عملة السعر', COMPANY_MISMATCH: 'تصدر العروض باسم الشركة المختارة في الإعدادات', CANNOT_DEACTIVATE_SELF: 'لا يمكنك إيقاف حسابك الخاص',
    CANNOT_CHANGE_OWN_ROLE: 'لا يمكنك تغيير دورك', WRONG_CURRENT_PASSWORD: 'كلمة المرور الحالية غير صحيحة', PDF_ENGINE_UNAVAILABLE: 'خدمة PDF غير متاحة على هذا الخادم. استخدم الطباعة.',
    INVALID_FILE_TYPE: 'يُسمح بصور PNG أو JPG أو WEBP فقط', INTERNAL_ERROR: 'حدث خطأ في الخادم', NETWORK: 'تعذّر الاتصال بالخادم', QUOTATION_NOT_FOUND: 'العرض غير موجود',
  },
};
export default ar;
