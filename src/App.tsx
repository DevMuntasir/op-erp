export { useAuth } from './features/auth/AuthProvider';

import { AppProviders } from './app/providers';
import { AppRouter } from './app/router';

export default function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
