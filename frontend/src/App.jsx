import Sidebar from './components/sidebar'
import Login from './components/login-form';
import HRMSDashboard from './components/dashboard';
import LoaderGate from './components/loadingAnimation';
import { API_ENDPOINTS } from './service/apiEndpoints';

function App() {
  // Use the API base URL for server checking
  const serverUrl = API_ENDPOINTS.BASE_URL.replace('/api', '');
  
  return (
    <LoaderGate serverUrl={serverUrl}>
      <HRMSDashboard />
    </LoaderGate>
  )
}

export default App
