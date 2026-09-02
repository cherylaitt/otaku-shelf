import { registerWebModule, NativeModule } from 'expo';
import { SubjectLiftNativeModule } from './SubjectLift.types';

/** No on-device segmentation API on web — always unavailable, never throws. */
class SubjectLiftModule extends NativeModule<{}> implements SubjectLiftNativeModule {
  isAvailable(): boolean {
    return false;
  }
  async liftSubject(_uri: string): Promise<string | null> {
    return null;
  }
}

export default registerWebModule(SubjectLiftModule, 'SubjectLiftModule');
