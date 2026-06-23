# دليل التشغيل المجاني عبر Firebase (خطة Spark – بدون أي دفع)

هذا الدليل يشرح كيف تجعل التطبيق يعمل **كـ Backend سحابي حقيقي** مع مزامنة لحظية
بين كل الأجهزة، مجاناً بالكامل على خطة Firebase Spark.

> النتيجة: لو عدّلت المديرة علامة على هاتفها، يراها الأستاذ مباشرة على حاسوبه.
> ويعمل التطبيق حتى بدون إنترنت ثم يزامن تلقائياً عند عودة الاتصال.

---

## 1) إنشاء مشروع Firebase مجاني
1. ادخل إلى https://console.firebase.google.com وأنشئ مشروعاً جديداً (مجاني).
2. من **Build > Firestore Database** اضغط **Create database** (اختر وضع Production والمنطقة الأقرب).
3. من **Build > Authentication > Sign-in method** فعّل **Anonymous** (مجهول).
   - هذا يكفي ليعمل التطبيق فوراً بدون إنشاء حسابات.

## 2) ربط التطبيق بالمشروع
1. من **Project Settings (⚙️) > Your apps** أنشئ تطبيق **Web** واحصل على بيانات `firebaseConfig`.
2. انسخ ملف `.env.example` إلى `.env.local` واملأ القيم:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_FIREBASE_DATABASE_ID=        # اتركه فارغاً للقاعدة الافتراضية
   VITE_SCHOOL_ID=providence         # رمز قصير خاص بكل مدرسة
   ```

## 3) نشر قواعد الأمان
ادفع ملف `firestore.rules` المرفق إلى مشروعك:
```bash
npm install -g firebase-tools
firebase login
firebase use --add        # اختر مشروعك
firebase deploy --only firestore:rules
```
أو انسخ محتوى `firestore.rules` يدوياً من Console > Firestore > Rules ثم **Publish**.

## 4) التشغيل
```bash
npm install
npm run dev
```
افتح التطبيق على جهازين مختلفين بنفس `VITE_SCHOOL_ID` → ستلاحظ المزامنة اللحظية.

---

## كيف تبيع لأكثر من مدرسة (مجاناً)
لديك خياران، كلاهما مجاني:

- **الأبسط (موصى به للبداية):** مشروع Firebase منفصل لكل مدرسة (كل مشروع مجاني).
  غيّر `.env.local` لكل نشر.
- **مشروع واحد لعدة مدارس:** استخدم نفس المشروع وغيّر فقط `VITE_SCHOOL_ID` لكل
  مدرسة. البيانات معزولة تلقائياً تحت `schools/{schoolId}/...`.

---

## بنية البيانات في Firestore
```
schools/{schoolId}/collections/{key}   ← كل مجموعة بيانات في وثيقة واحدة
  مثال: schools/providence/collections/providence_students
        { value: [ ...قائمة التلاميذ... ], updatedAt: "..." }
```
المجموعات الخفيفة (تلاميذ، علامات، موظفون، مالية، غياب...) تُزامن سحابياً
داخل وثيقة Firestore واحدة لكل مجموعة (عملية واحدة لكل حفظ/قراءة).

أما الملفات الثقيلة (صور الجداول، الواجبات وملفاتها، صور الأخبار/المنشورات
بصيغة base64) فأصبحت تُزامن عبر **Firebase Storage** على شكل JSON blob في:
```
schools/{schoolId}/blobs/{key}.json          ← الحمولة الكاملة (بدون حد 1MB)
schools/{schoolId}/collections/{key}         ← مؤشّر صغير في Firestore
   { blob: true, downloadURL, updatedAt, size }
```
يُراقَب المؤشّر بـ onSnapshot للمزامنة اللحظية، وتُجلب الحمولة من Storage.
هكذا تبقى صور الـ base64 سليمة (ضرورية لتوليد ملفات PDF داخل المتصفّح)
وتتزامن الملفات بين كل الأجهزة — كل ذلك ضمن خطة Spark المجانية (5GB Storage).

---

## خطوات التقوية للإنتاج (مصادقة حقيقية)
أصبحت المصادقة حقيقية على مستوى الإنتاج:

1. في الـ console فعّل **Authentication → Sign-in method → Email/Password**.
2. انسخ `.env.example` إلى `.env.local` واملأ `VITE_FIREBASE_*` و`VITE_SCHOOL_ID`
   و`SEED_ADMIN_PASSWORD` (كلمة سر قوية).
3. أنشئ أول حساب مدير حقيقي + ملفه (الدور والمدرسة):
   ```bash
   npm install
   npm run seed
   ```
   يُنشئ مستخدم Firebase حقيقياً ويكتب `users/{uid} = { role:'admin', schoolId }`.
4. انشر القواعد المشدّدة:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```
5. بعد التأكد من دخول المدير الحقيقي، **عطّل الحسابات الافتراضية** بوضع
   `VITE_ALLOW_LEGACY_LOGIN=false` في `.env.local` ثم أعد البناء.

بعدها:
- كل حسابات الإدارة/الأساتذة هي مستخدمو Firebase حقيقيون بأدوار في `users/{uid}`.
- قواعد Firestore تفرض أن المستخدم لا يصل إلا لبيانات مدرسته (`schools/{schoolId}`).
- كلمات مرور أولياء الأمور **مُشفّرة bcrypt** (لا تُخزّن كنص صريح).
- يمكن للمدير إنشاء حسابات أساتذة/إداريين حقيقية من داخل التطبيق دون أن يخرج
  من جلسته (عبر `createStaffAccount`).

---

## تفعيل Firebase Storage ونشر القواعد
1. من **Build > Storage** في console فعّل Storage (ابقَ على خطة Spark المجانية).
2. تأكد أن `storageBucket` في `.env.local` يطابق مشروعك (القيمة الحالية مهيّأة مسبقاً).
3. انشر كل القواعد دفعة واحدة عبر Firebase CLI:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```
4. لنشر الواجهة (Hosting) مجاناً:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```
