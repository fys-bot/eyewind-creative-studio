
import { User, SupportTicket, Organization, AdminStats } from '../types';

// Mock Data
const MOCK_USERS: User[] = [
    { id: 'u1', name: 'Alice Chen', email: 'alice@tech.com', plan: 'team', credits: 4500, joinDate: Date.now() - 86400000 * 30, role: 'admin', organizationId: 'org1', status: 'active' },
    { id: 'u2', name: 'Bob Smith', email: 'bob@freelance.io', plan: 'pro', credits: 800, joinDate: Date.now() - 86400000 * 15, role: 'user', status: 'active' },
    { id: 'u3', name: 'Charlie Lee', email: 'charlie@student.edu', plan: 'free', credits: 20, joinDate: Date.now() - 86400000 * 2, role: 'user', status: 'pending' },
    { id: 'u4', name: 'David Kim', email: 'david@studio.art', plan: 'team', credits: 12000, joinDate: Date.now() - 86400000 * 120, role: 'user', organizationId: 'org1', status: 'active' },
    { id: 'u5', name: 'Eva Green', email: 'eva@spam.com', plan: 'free', credits: 0, joinDate: Date.now() - 86400000 * 5, role: 'user', status: 'banned' },
];

const MOCK_ORGS: Organization[] = [
    { id: 'org1', name: 'Desora Inc.', plan: 'team', memberCount: 2, maxMembers: 10, creditsUsed: 45000, status: 'active', createdAt: Date.now() - 86400000 * 120 },
    { id: 'org2', name: 'Indie Game Co.', plan: 'pro', memberCount: 1, maxMembers: 1, creditsUsed: 1200, status: 'active', createdAt: Date.now() - 86400000 * 60 },
];

const MOCK_TICKETS: SupportTicket[] = [
    { id: 't1', userId: 'u2', userName: 'Bob Smith', subject: 'Video Generation Failed', message: 'I tried to generate a video but it timed out after 3 minutes. Credits were deducted.', status: 'open', priority: 'high', category: 'technical', createdAt: Date.now() - 3600000, updatedAt: Date.now() },
    { id: 't2', userId: 'u1', userName: 'Alice Chen', subject: 'Invoice Request', message: 'Can I get a PDF invoice for last month?', status: 'resolved', priority: 'low', category: 'billing', createdAt: Date.now() - 86400000, updatedAt: Date.now() - 4000000 },
    { id: 't3', userId: 'u4', userName: 'David Kim', subject: 'Feature Request: Spine Export', message: 'Do you plan to support JSON export for skeletal animations?', status: 'in_progress', priority: 'medium', category: 'feature', createdAt: Date.now() - 86400000 * 2, updatedAt: Date.now() - 86400000 },
];

export const getAdminStats = async (): Promise<AdminStats> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({
                totalUsers: 12450,
                activeUsers24h: 342,
                totalRevenue: 45290,
                pendingTickets: 5,
                systemHealth: 98
            });
        }, 500);
    });
};

export const getUsers = async (role: 'all' | 'enterprise' = 'all'): Promise<User[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            if (role === 'enterprise') {
                resolve(MOCK_USERS.filter(u => u.organizationId === 'org1')); // Simulate viewing specific org
            } else {
                resolve(MOCK_USERS);
            }
        }, 400);
    });
};

export const getTickets = async (): Promise<SupportTicket[]> => {
    return new Promise(resolve => setTimeout(() => resolve(MOCK_TICKETS), 400));
};

export const updateUserStatus = async (userId: string, status: 'active' | 'banned' | 'pending'): Promise<boolean> => {
    return new Promise(resolve => setTimeout(() => resolve(true), 300)); // Simulate API call
};

export const resolveTicket = async (ticketId: string): Promise<boolean> => {
    return new Promise(resolve => setTimeout(() => resolve(true), 300));
};
