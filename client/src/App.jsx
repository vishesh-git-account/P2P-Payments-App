import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SendMoney from './pages/SendMoney';

axios.defaults.baseURL = 'http://localhost:5000';

function App() {
  return (
    <Router>
      <div className="min-h-screen font-sans">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/send" element={<SendMoney />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;