export interface SubjectLiftNativeModule {
  /** Cheap, synchronous capability check — false on unsupported OS versions (see the native module doc comments for exactly which). */
  isAvailable(): boolean;
  /**
   * Cuts the photographed item out from its background, on-device.
   * Resolves to a file:// URI for a transparent-background PNG, or `null`
   * if the feature isn't available right now OR no distinct subject was
   * found — both cases are meant to be handled identically by the caller:
   * fall back to the original photo.
   */
  liftSubject(uri: string): Promise<string | null>;
}
