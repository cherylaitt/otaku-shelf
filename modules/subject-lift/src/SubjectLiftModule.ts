import { NativeModule, requireNativeModule } from 'expo';
import { SubjectLiftNativeModule } from './SubjectLift.types';

declare class SubjectLiftModule extends NativeModule<{}> implements SubjectLiftNativeModule {
  isAvailable(): boolean;
  liftSubject(uri: string): Promise<string | null>;
}

export default requireNativeModule<SubjectLiftModule>('SubjectLift');
