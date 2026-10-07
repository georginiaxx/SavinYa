// Active providers. To go live: add a real provider (e.g. one that calls YOUR backend proxy,
// never an API directly with a key in the browser) and list it here. Remove demo when real data is in.
import { demoProvider } from './demoProvider.js';
export const providers = [demoProvider];
