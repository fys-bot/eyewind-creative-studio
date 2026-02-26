const API_BASE = '/api';

export const getAuthToken = () => localStorage.getItem('nexus_token');
export const setAuthToken = (token: string) => localStorage.setItem('nexus_token', token);
export const removeAuthToken = () => localStorage.removeItem('nexus_token');

async function request(endpoint: string, options: RequestInit = {}) {
    const token = getAuthToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers || {},
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    if (response.status === 401) {
        // Token expired
        removeAuthToken();
        window.location.reload(); // Simple reload to reset auth state
        throw new Error("Unauthorized");
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || `Request failed: ${response.status}`);
    }

    return response.json();
}

export const api = {
    auth: {
        login: (data: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
        register: (data: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
        me: () => request('/auth/me')
    },
    projects: {
        list: () => request('/projects'),
        save: (data: any) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
        delete: (id: string) => request(`/projects/${id}`, { method: 'DELETE' })
    },
    upload: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const token = getAuthToken();
        return fetch(`${API_BASE}/upload`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData
        }).then(res => res.json());
    }
};