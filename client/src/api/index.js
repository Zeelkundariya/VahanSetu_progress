import axios from 'axios';
import { showToast } from '../components/Toast';

const api = axios.create({
  baseURL: '/',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

export { showToast, api };

export const login = (email, password) => {
  return api.post('/login', { email, password });
};

export const signup = (name, email, password) => {
  return api.post('/signup', { name, email, password });
};

export const logout = () => axios.get('/logout', { withCredentials: true });

export const getMe = () => api.get('/api/me');
export const getStations = (lat, lng) => api.get(`/api/stations${lat != null ? `?lat=${lat}&lng=${lng}` : ''}`);
export const getTripPlan = (params) => api.get('/api/trip_plan', { params });
export const getFleet = () => api.get('/api/fleet');
export const getCpo = () => api.get('/api/cpo_data');
export const getAnalytics = () => api.get('/api/analytics_data');
export const getAnalyticsFilter = (cycle) => api.get(`/api/analytics/filter?cycle=${cycle}`);
export const getProfile = () => api.get('/api/profile_data');
export const getNotifications = () => api.get('/api/notifications');
export const updateProfile = (name) => api.post('/api/profile/update', { name });
export const changePw = (current, newPw, confirm) => api.post('/api/change_password', { current_password: current, new_password: newPw, confirm_password: confirm });
export const verifyPremium = (payment_id, plan) => api.post('/premium/verify', { payment_id, plan });
export const cancelPremium = () => api.post('/premium/cancel');
export const addStation = (data) => {
  const form = new FormData();
  Object.entries(data).forEach(([k, v]) => form.append(k, v));
  return axios.post('/api/host/add_station', form, { withCredentials: true });
};
export const deleteStation = (id) => axios.post(`/api/host/delete_station/${id}`, {}, { withCredentials: true });

export default api;
