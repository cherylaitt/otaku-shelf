import CoreImage
import ExpoModulesCore
import Vision

/**
 * Wraps Vision's subject-lifting API (`VNGenerateForegroundInstanceMaskRequest`,
 * iOS 17+) to cut a photographed item out from its background, fully
 * on-device — no network call, no cloud API.
 *
 * IMPORTANT: this was written against Apple's documented API surface (WWDC23
 * session 10176 "Lift subjects from images in your app") but has not been
 * compiled/run in this environment — there's no Xcode/simulator available
 * here to verify it. Before shipping, rebuild the dev client
 * (`npx expo run:ios` or a new EAS build, since this is a new native module)
 * and manually test "Remove Background" end-to-end on a real photo, on both
 * a device running iOS 17+ (should produce a cutout) and one on iOS 16
 * (should gracefully report "not available" via `isAvailable()`, never
 * crash or hang).
 */
public class SubjectLiftModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SubjectLift")

    Function("isAvailable") { () -> Bool in
      if #available(iOS 17.0, *) { return true }
      return false
    }

    // Returns a file:// URI to a transparent-background PNG cutout, or nil
    // if the feature isn't available on this OS version OR Vision didn't
    // find a distinct foreground subject to lift (e.g. a very busy/cluttered
    // photo) — both are treated the same way by the JS side: fall back to
    // using the original, un-cutout photo rather than blocking the save.
    AsyncFunction("liftSubject") { (uri: String) -> String? in
      guard #available(iOS 17.0, *) else { return nil }
      return try SubjectLiftModule.performLift(uri: uri)
    }
  }

  @available(iOS 17.0, *)
  private static func performLift(uri: String) throws -> String? {
    guard let url = URL(string: uri), let sourceImage = CIImage(contentsOf: url) else {
      throw SubjectLiftError.invalidImage
    }

    let request = VNGenerateForegroundInstanceMaskRequest()
    let handler = VNImageRequestHandler(ciImage: sourceImage)
    try handler.perform([request])

    guard let result = request.results?.first, !result.allInstances.isEmpty else {
      return nil // no distinct foreground subject found
    }

    // croppedToInstancesExtent: true — the output is just the subject's own
    // bounding box (with transparent padding trimmed), which is what we
    // want for compositing a cutout onto a shelf background at a slot's
    // size, rather than carrying the full original photo's dead space.
    let maskedPixelBuffer = try result.generateMaskedImage(
      ofInstances: result.allInstances,
      from: handler,
      croppedToInstancesExtent: true
    )
    let maskedImage = CIImage(cvPixelBuffer: maskedPixelBuffer)

    let context = CIContext()
    let colorSpace = maskedImage.colorSpace ?? CGColorSpace(name: CGColorSpace.sRGB)!
    guard
      let pngData = context.pngRepresentation(
        of: maskedImage,
        format: .RGBA8,
        colorSpace: colorSpace,
        options: [:]
      )
    else {
      throw SubjectLiftError.renderFailed
    }

    let outputURL = FileManager.default.temporaryDirectory
      .appendingPathComponent(UUID().uuidString)
      .appendingPathExtension("png")
    try pngData.write(to: outputURL)
    return outputURL.absoluteString
  }

  enum SubjectLiftError: Error {
    case invalidImage
    case renderFailed
  }
}
