// Android release yig'ish sozlamalari — `expo prebuild` paytida qo'llanadi (mahalliy, GitHub Actions va EAS uchun bir xil).
//
//  1) R8 kod siqish o'chiq: u ba'zi kutubxonalarning reflection bilan topiladigan klasslarini olib tashlab, ilovani
//     ochilishdayoq yopib qo'yishi mumkin. APK biroz kattaroq, lekin barqaror.
//  2) 32 va 64 bitli ARM telefonlar uchun (armeabi-v7a + arm64-v8a) — arzon va eski telefonlarda ham o'rnatiladi.
//     Sinov uchun boshqa ABI: `gradlew assembleRelease -PreactNativeArchitectures=x86_64`.
//  3) Kutilmagan yopilish: sababi faylga yoziladi va keyingi ochilishda oynada ko'rsatiladi — foydalanuvchi
//     «Nusxa olish» bilan matnni dasturchiga yuboradi (USB va kompyutersiz tashxis).
const fs = require('fs');
const path = require('path');
const { withDangerousMod, withGradleProperties, withMainActivity, withMainApplication } = require('expo/config-plugins');

const PROPS = {
  'android.enableMinifyInReleaseBuilds': 'false',
  'android.enableShrinkResourcesInReleaseBuilds': 'false',
  reactNativeArchitectures: 'armeabi-v7a,arm64-v8a',
};

const crashReportKt = pkg => `package ${pkg}

import android.app.Activity
import android.app.AlertDialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Build
import android.util.Log
import android.widget.Toast
import java.io.File

/**
 * Ilova kutilmaganda yopilsa, sababi faylga yoziladi va keyingi ochilishda oynada ko'rsatiladi.
 * Fayl foydalanuvchi oynani yopguncha saqlanadi (ilova yana yopilsa — eng so'nggi sabab yoziladi).
 * expo prebuild yaratadi: plugins/with-android-release.js — qo'lda o'zgartirmang.
 */
object CrashReport {
  private const val FILE_NAME = "yums-last-crash.txt"

  fun install(context: Context) {
    val file = File(context.filesDir, FILE_NAME)
    val previous = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler { thread, error ->
      try {
        val device = Build.MANUFACTURER + " " + Build.MODEL + " · Android " + Build.VERSION.RELEASE +
          " (API " + Build.VERSION.SDK_INT + ") · " + Build.SUPPORTED_ABIS.joinToString(",")
        val app = context.packageName + " " + versionOf(context)
        file.writeText(app + "\\n" + device + "\\nthread: " + thread.name + "\\n\\n" + Log.getStackTraceString(error).take(12000))
      } catch (e: Throwable) {
        // yozib bo'lmadi — tizimning odatiy ishlovi baribir chaqiriladi
      }
      previous?.uncaughtException(thread, error)
    }
  }

  fun showIfAny(activity: Activity) {
    val file = File(activity.filesDir, FILE_NAME)
    val text = try { if (file.exists()) file.readText() else "" } catch (e: Throwable) { "" }
    if (text.isBlank()) return
    AlertDialog.Builder(activity)
      .setTitle("Ilova oldingi safar xato bilan yopildi")
      .setMessage("«Nusxa olish» ni bosing va matnni dasturchiga yuboring.\\n\\n" + text.take(2500))
      .setPositiveButton("Nusxa olish") { _, _ ->
        val clipboard = activity.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboard.setPrimaryClip(ClipData.newPlainText("YUMS xato", text))
        Toast.makeText(activity, "Nusxa olindi", Toast.LENGTH_SHORT).show()
        file.delete()
      }
      .setNegativeButton("Yopish") { _, _ -> file.delete() }
      .setCancelable(false)
      .show()
  }

  private fun versionOf(context: Context): String = try {
    context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: ""
  } catch (e: Throwable) {
    ""
  }
}
`;

/** Kotlin manbasiga bir qator qo'shish: belgilangan chaqiruvdan keyin (ikki marta qo'shilmaydi) */
function insertAfter(contents, anchor, line, file) {
  if (contents.includes(line)) return contents;
  const m = anchor.exec(contents);
  if (!m) throw new Error(`with-android-release: ${file} ichida ${anchor} topilmadi`);
  const indent = /([ \t]*)$/.exec(contents.slice(0, m.index))[1];
  const at = m.index + m[0].length;
  return `${contents.slice(0, at)}\n${indent}${line}${contents.slice(at)}`;
}

module.exports = function withAndroidRelease(config) {
  config = withGradleProperties(config, c => {
    for (const [key, value] of Object.entries(PROPS)) {
      const item = c.modResults.find(p => p.type === 'property' && p.key === key);
      if (item) item.value = value;
      else c.modResults.push({ type: 'property', key, value });
    }
    return c;
  });

  config = withDangerousMod(config, ['android', async c => {
    const pkg = c.android?.package;
    if (!pkg) throw new Error('with-android-release: android.package berilmagan');
    const dir = path.join(c.modRequest.platformProjectRoot, 'app', 'src', 'main', 'java', ...pkg.split('.'));
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, 'CrashReport.kt'), crashReportKt(pkg));
    return c;
  }]);

  config = withMainApplication(config, c => {
    // eng boshida — React Native yuklanishidagi xatolar ham yozilsin
    c.modResults.contents = insertAfter(c.modResults.contents, /super\.onCreate\(\)/, 'CrashReport.install(this)', 'MainApplication');
    return c;
  });

  config = withMainActivity(config, c => {
    c.modResults.contents = insertAfter(c.modResults.contents, /super\.onCreate\((null|savedInstanceState)\)/, 'CrashReport.showIfAny(this)', 'MainActivity');
    return c;
  });

  return config;
};
