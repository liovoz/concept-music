import { ensureElectron, verifySetup } from './check-setup.mjs';
import { installServerDependencies } from './install-server-deps.mjs';

try {
  await ensureElectron({ repair: true });
  await installServerDependencies();
  await verifySetup({ repair: false });
} catch (error) {
  console.error(`[setup] ${error.message}`);
  process.exit(1);
}
