import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export function useDashboard() {
    return useQuery({
        queryKey: ['reports', 'dashboard'],
        queryFn: async () => {
            const res = await api.get('/reports/dashboard');
            return res.data?.data || res.data || {};
        },
        staleTime: 0,
        refetchOnWindowFocus: true,
        refetchInterval: 2 * 60 * 1000, // refresh every 2 mins
    });
}

export function useRevenueDaily(from?: string, to?: string) {
    return useQuery({
        queryKey: ['reports', 'revenue', 'daily', from, to],
        queryFn: async () => {
            const res = await api.get('/reports/revenue/daily', { params: { from, to } });
            const payload = res.data?.data || res.data;
            return Array.isArray(payload) ? payload : [];
        },
        staleTime: 0,
        refetchOnWindowFocus: true,
    });
}

export function useRevenueMonthly(from?: string, to?: string) {
    return useQuery({
        queryKey: ['reports', 'revenue', 'monthly', from, to],
        queryFn: async () => {
            const res = await api.get('/reports/revenue/monthly', { params: { from, to } });
            const payload = res.data?.data || res.data;
            return Array.isArray(payload) ? payload : [];
        },
        staleTime: 0,
        refetchOnWindowFocus: true,
    });
}

export function useRevenueByDoctor(from?: string, to?: string) {
    return useQuery({
        queryKey: ['reports', 'revenue', 'doctor', from, to],
        queryFn: async () => {
            const res = await api.get('/reports/revenue/doctor', { params: { from, to } });
            const payload = res.data?.data || res.data;
            return Array.isArray(payload) ? payload : [];
        },
        staleTime: 0,
        refetchOnWindowFocus: true,
    });
}

export function useAppointmentsSummary(from?: string, to?: string) {
    return useQuery({
        queryKey: ['reports', 'appointments', 'summary', from, to],
        queryFn: async () => {
            const res = await api.get('/reports/appointments/summary', { params: { from, to } });
            return res.data?.data || res.data || {};
        },
        staleTime: 0,
        refetchOnWindowFocus: true,
    });
}

export function usePatientGrowth(from?: string, to?: string) {
    return useQuery({
        queryKey: ['reports', 'patients', 'growth', from, to],
        queryFn: async () => {
            const res = await api.get('/reports/patients/growth', { params: { from, to } });
            const payload = res.data?.data || res.data;
            return Array.isArray(payload) ? payload : [];
        },
        staleTime: 0,
        refetchOnWindowFocus: true,
    });
}

export function useInventoryExpenses(from?: string, to?: string) {
    return useQuery({
        queryKey: ['reports', 'inventory', 'expenses', from, to],
        queryFn: async () => {
            const res = await api.get('/reports/inventory/expenses', { params: { from, to } });
            const payload = res.data?.data || res.data;
            return Array.isArray(payload) ? payload : [];
        },
        staleTime: 0,
        refetchOnWindowFocus: true,
    });
}

export function useChairUtilization(from?: string, to?: string) {
    return useQuery({
        queryKey: ['reports', 'chairs', 'utilization', from, to],
        queryFn: async () => {
            const res = await api.get('/reports/chairs/utilization', { params: { from, to } });
            const payload = res.data?.data || res.data;
            return Array.isArray(payload) ? payload : [];
        },
        staleTime: 0,
        refetchOnWindowFocus: true,
    });
}

export function usePendingPayments() {
    return useQuery({
        queryKey: ['reports', 'pending-payments'],
        queryFn: async () => {
            const res = await api.get('/reports/patients/pending-payments');
            const payload = res.data?.data || res.data;
            return Array.isArray(payload) ? payload : [];
        },
        staleTime: 0,
        refetchOnWindowFocus: true,
    });
}
