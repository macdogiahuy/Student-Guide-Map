import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import LocationDetailPage from './pages/LocationDetail';
import Directions from './pages/Directions';
import Login from './pages/Login';
import Register from './pages/Register';
import Promotions from './pages/Promotions';
import Favorites from './pages/Favorites';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import StoreDashboard from './pages/StoreDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminCategories from './pages/admin/AdminCategories';
import AdminStatistics from './pages/admin/AdminStatistics';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Full-screen — outside Layout so header/footer don't shrink the map */}
          <Route path="/directions/:id" element={<Directions />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/locations/:id" element={<LocationDetailPage />} />
            <Route path="/promotions" element={<Promotions />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/store" element={<StoreDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/statistics" element={<AdminStatistics />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
