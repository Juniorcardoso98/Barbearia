const API_URL = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro na requisição');
    }

    return data;
  }

  // Auth
  async register(userData) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    this.setToken(data.token);
    return data;
  }

  async login(credentials) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    this.setToken(data.token);
    return data;
  }

  async loginWithGoogle(googleData) {
    const data = await this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify(googleData),
    });
    this.setToken(data.token);
    return data;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async updateProfile(profileData) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async changePassword(currentPassword, newPassword) {
    return this.request('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  }

  // Services
  async getServices() {
    return this.request('/services');
  }

  async createService(serviceData) {
    return this.request('/services', {
      method: 'POST',
      body: JSON.stringify(serviceData),
    });
  }

  async updateService(id, serviceData) {
    return this.request(`/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(serviceData),
    });
  }

  async deleteService(id) {
    return this.request(`/services/${id}`, { method: 'DELETE' });
  }

  // Barbers
  async getBarbers() {
    return this.request('/barbers');
  }

  async getBarberSlots(barberId, date, duration) {
    return this.request(`/barbers/${barberId}/slots?date=${date}&duration=${duration}`);
  }

  // Appointments
  async createAppointment(appointmentData) {
    return this.request('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  }

  async getAppointments(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/appointments${query ? '?' + query : ''}`);
  }

  async cancelAppointment(id) {
    return this.request(`/appointments/${id}/cancel`, { method: 'PUT' });
  }

  async updateAppointmentStatus(id, status) {
    return this.request(`/appointments/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async addReview(appointmentId, rating, comment) {
    return this.request(`/appointments/${appointmentId}/review`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    });
  }

  async getAppointmentReview(appointmentId) {
    return this.request(`/appointments/${appointmentId}/review`);
  }

  async getBarberReviews(barberId) {
    return this.request(`/appointments/barber/${barberId}/reviews`);
  }

  // Admin
  async getUsers() {
    return this.request('/admin/users');
  }

  async createBarber(barberData) {
    return this.request('/admin/barbers', {
      method: 'POST',
      body: JSON.stringify(barberData),
    });
  }

  async updateUserRole(id, role) {
    return this.request(`/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async toggleUser(id) {
    return this.request(`/admin/users/${id}/toggle`, { method: 'PUT' });
  }

  async updateBarber(barberId, data) {
    return this.request(`/admin/barbers/${barberId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async setBarberSchedule(barberId, schedules) {
    return this.request(`/admin/barbers/${barberId}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ schedules }),
    });
  }

  async getStats() {
    return this.request('/admin/stats');
  }

  async getAdminAppointments(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/admin/appointments${query ? '?' + query : ''}`);
  }

  async getReports(startDate, endDate) {
    return this.request(`/admin/reports?start_date=${startDate}&end_date=${endDate}`);
  }

  // Settings (public)
  async getSettings() {
    return this.request('/settings');
  }

  async getGallery() {
    return this.request('/settings/gallery');
  }

  // Settings (admin)
  async updateSettings(settings) {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async addGalleryImage(imageData) {
    return this.request('/settings/gallery', {
      method: 'POST',
      body: JSON.stringify(imageData),
    });
  }

  async updateGalleryImage(id, imageData) {
    return this.request(`/settings/gallery/${id}`, {
      method: 'PUT',
      body: JSON.stringify(imageData),
    });
  }

  async deleteGalleryImage(id) {
    return this.request(`/settings/gallery/${id}`, { method: 'DELETE' });
  }

  logout() {
    this.setToken(null);
  }
}

const api = new ApiService();
export default api;
