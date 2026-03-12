import { NavLink } from 'react-router-dom';
import {
    Calendar,
    Users,
    FileText,
    Package,
    BarChart,
    Settings,
    LogOut,
    Hospital
} from 'lucide-react';
import { useAuthStore } from '../../hooks/useAuthStore';

const navItems = [
    { icon: BarChart, label: 'Dashboard', path: '/dashboard' },
    { icon: Calendar, label: 'Appointments', path: '/appointments' },
    { icon: Users, label: 'Patients', path: '/patients' },
    { icon: FileText, label: 'Billing', path: '/billing' },
    { icon: Package, label: 'Inventory', path: '/inventory' },
    { icon: BarChart, label: 'Reports', path: '/reports' },
    { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar() {
    const logout = useAuthStore((state) => state.logout);

    return (
        <aside className="w-64 border-r bg-slate-950 text-slate-50 flex flex-col h-full">
            <div className="p-6 flex items-center gap-3 border-b border-slate-800">
                <Hospital className="h-8 w-8 text-blue-600" />
                <span className="font-bold text-xl tracking-tight">DentalCloud</span>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${isActive
                                ? 'bg-blue-600/20 text-blue-400 font-medium'
                                : 'text-slate-400 hover:text-slate-50 hover:bg-slate-900'
                            }`
                        }
                    >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-900 transition-colors"
                >
                    <LogOut className="h-5 w-5" />
                    Logout
                </button>
            </div>
        </aside>
    );
}
