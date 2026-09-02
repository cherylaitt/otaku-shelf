package expo.modules.subjectlift

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.segmentation.subject.SubjectSegmentation
import com.google.mlkit.vision.segmentation.subject.SubjectSegmenterOptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.tasks.await
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

/**
 * Wraps ML Kit's on-device Subject Segmentation API
 * (play-services-mlkit-subject-segmentation) to cut a photographed item out
 * from its background — fully on-device, no network call, no cloud API.
 *
 * IMPORTANT — deliberate Android-version cap: as of this writing, the only
 * available version of this library (16.0.0-beta1, unpatched since Nov
 * 2023) has a known, unfixed native SIGSEGV crash (an MTE pointer-tagging
 * fault in its GPU delegate) on Android 16 / API 36+ — see
 * https://github.com/googlesamples/mlkit/issues/1017. That crash happens in
 * native code with no catchable JS/Kotlin-level exception, so the only safe
 * mitigation is to refuse to even attempt segmentation above
 * MAX_SUPPORTED_SDK_INT and report the feature as unavailable instead — a
 * feature that's simply missing beats one that takes the whole app down.
 * Re-check the library's changelog periodically and raise this cap (or
 * switch libraries) once a fix ships.
 *
 * IMPORTANT — this was written against ML Kit's documented API surface but
 * has not been compiled/run in this environment (no Android
 * emulator/device build cycle available here). Before shipping, rebuild the
 * dev client (`npx expo run:android` or a new EAS build, since this is a
 * new native module + new Gradle dependency) and manually test "Remove
 * Background" end-to-end on a real photo, on at least one device at/below
 * API 35 (should produce a cutout, possibly after a brief one-time model
 * download) and confirm `isAvailable()` correctly reports `false` on any
 * API 36+ device/emulator without attempting segmentation at all.
 */
class SubjectLiftModule : Module() {
  companion object {
    private const val MIN_SUPPORTED_SDK_INT = 24
    private const val MAX_SUPPORTED_SDK_INT = 35
  }

  override fun definition() = ModuleDefinition {
    Name("SubjectLift")

    Function("isAvailable") {
      Build.VERSION.SDK_INT in MIN_SUPPORTED_SDK_INT..MAX_SUPPORTED_SDK_INT
    }

    // Returns a file:// URI to a transparent-background PNG cutout, or null
    // if the feature isn't available on this OS version/build OR the
    // segmenter didn't find a subject — both are treated the same way by
    // the JS side: fall back to using the original, un-cutout photo rather
    // than blocking the save.
    AsyncFunction("liftSubject") Coroutine { uri: String ->
      liftSubject(uri)
    }
  }

  private suspend fun liftSubject(uriString: String): String? {
    if (Build.VERSION.SDK_INT !in MIN_SUPPORTED_SDK_INT..MAX_SUPPORTED_SDK_INT) return null

    val context = appContext.reactContext ?: return null
    val bitmap = try {
      context.contentResolver.openInputStream(Uri.parse(uriString))?.use { stream ->
        BitmapFactory.decodeStream(stream)
      }
    } catch (e: Exception) {
      null
    } ?: return null

    val segmenter = SubjectSegmentation.getClient(
      SubjectSegmenterOptions.Builder().enableForegroundBitmap().build()
    )

    val foreground = try {
      segmenter.process(InputImage.fromBitmap(bitmap, 0)).await().foregroundBitmap
    } catch (e: Exception) {
      null // any segmentation failure (no subject, model not downloaded yet, etc.) -> "unavailable"
    } ?: return null

    val outputFile = File(context.cacheDir, "${UUID.randomUUID()}.png")
    FileOutputStream(outputFile).use { out ->
      foreground.compress(Bitmap.CompressFormat.PNG, 100, out)
    }
    return Uri.fromFile(outputFile).toString()
  }
}
