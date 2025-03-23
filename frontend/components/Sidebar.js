import { useState, useEffect } from 'react';
import {
  Bell,
  BookOpen,
  FileText,
  LayoutDashboard,
  Users,
  CheckSquare,
  Clock,
  Settings,
  User,
  ClipboardList,

  File,
  Building,
  List,
  FilePlus,
  FileCheck,
  FileSearch,
  FileText as FileTextIcon,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';


const ACCESS_LEVELS_ALL = ['admin', 'hod', 'staff', 'student', 'super_admin', 'auditor_general'];

const SidebarIcon = ({ icon: Icon }) => {
  return <Icon className="size-6 lg:size-5 transition-all duration-200" />;
};

export default function Sidebar() {
  const { user } = useAuth();
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (user) {
      setRole(user.role.toLowerCase());
    }
  }, [user]);

  const getAuditProgramsHref = (role) => {
    return role === 'admin' ? '/admin/audit-programs' : '/auditor/audit-programs';
  };

  const SIDEBAR_LINKS = [
    {
      label: 'MENU',
      links: [
        {
          name: 'Dashboard',
          href: `/dashboard/${role || 'staff'}`,
          access: ACCESS_LEVELS_ALL,
          icon: LayoutDashboard,
        },
        {
          name: 'Profile',
          href: '/profile',
          access: ACCESS_LEVELS_ALL,
          icon: User,
        },
        {
          name: 'Documents',
          href: '/admin/documents',
          access: ACCESS_LEVELS_ALL,
          icon: File,
        },
      ],
    },
    {
      label: 'Manage',
      links: [
        {
          name: 'User Management',
          href: '/manage/users',
          access: ['admin', 'super_admin'],
          icon: Users,
        },
        {
          name: 'Institution',
          href: '/super-admin/institution',
          access: ['super_admin'],
          icon: Building,
        },
        {
          name: 'Course Management',
          href: '/manage/courses',
          access: ['admin', 'hod', 'staff'],
          icon: BookOpen,
        },
        {
          name: 'Student Requests',
          href: '/manage/requests',
          access: ['hod', 'staff'],
          icon: ClipboardList,
        },
        {
          name: 'Exam & Grades',
          href: '/manage/exams',
          access: ['staff'],
          icon: CheckSquare,
        },
        {
          name: 'Class Schedules',
          href: '/schedule',
          access: ['hod', 'staff', 'student'],
          icon: Clock,
        },
        {
          name: 'Enrollment Requests',
          href: '/enrollment/requests',
          access: ['hod'],
          icon: FileText,
        },
      ],
    },
    {
      label: 'Audit',
      links: [
        {
          name: 'Audit Dashboard',
          href: '/audit/dashboard',
          access: ['admin', 'auditor_general'],
          icon: LayoutDashboard,
        },
        {
          name: 'Audit Programs',
          href: getAuditProgramsHref(role), // Dynamic href based on role
          access: ['admin', 'auditor_general'],
          icon: List,
          submenu: [
            {
              name: 'Active Programs',
              href: '/audit/programs/active',
              access: ['admin', 'auditor_general'],
              icon: FileTextIcon,
            },
            {
              name: 'Completed Programs',
              href: '/audit/programs/completed',
              access: ['admin', 'auditor_general'],
              icon: FileCheck,
            },
            {
              name: 'New Program',
              href: '/audit/programs/new',
              access: ['admin', 'auditor_general'],
              icon: FilePlus,
            },
          ],
        },
        {
          name: 'Tasks',
          href: '/audit/tasks',
          access: ['admin', 'auditor_general'],
          icon: ClipboardList,
          submenu: [
            {
              name: 'All Tasks',
              href: '/audit/tasks/all',
              access: ['admin', 'auditor_general'],
              icon: List,
            },
            {
              name: 'My Tasks',
              href: '/audit/tasks/mine',
              access: ['admin', 'auditor_general'],
              icon: User,
            },
            {
              name: 'Assign Tasks',
              href: '/audit/tasks/assign',
              access: ['admin', 'auditor_general'],
              icon: Users,
            },
          ],
        },
        {
          name: 'Reports',
          href: '/audit/reports',
          access: ['admin', 'auditor_general'],
          icon: FileTextIcon,
          submenu: [
            {
              name: 'Draft Reports',
              href: '/audit/reports/drafts',
              access: ['admin', 'auditor_general'],
              icon: FileTextIcon,
            },
            {
              name: 'Submitted Reports',
              href: '/audit/reports/submitted',
              access: ['admin', 'auditor_general'],
              icon: FileCheck,
            },
            {
              name: 'Generate Report',
              href: '/audit/reports/generate',
              access: ['admin', 'auditor_general'],
              icon: FilePlus,
            },
          ],
        },
        {
          name: 'Audit Trail',
          href: '/audit/trail',
          access: ['admin', 'auditor_general'],
          icon: FileSearch,
        },
      ],
    },
    {
      label: 'System',
      links: [
        {
          name: 'Notifications',
          href: '/notifications',
          access: ACCESS_LEVELS_ALL,
          icon: Bell,
        },
        {
          name: 'Settings',
          href: '/settings',
          access: ['admin', 'super_admin', 'auditor_general'],
          icon: Settings,
        },
        {
          name: 'Logout',
          href: '/logout',
          access: ACCESS_LEVELS_ALL,
          icon: LogOut,
        },
      ],
    },
  ];

  if (!role) {
    return <div className="w-16 lg:w-64 h-screen bg-zinc-200 p-4">Loading...</div>;
  }

  return (
    <div className="w-16 lg:w-64 h-screen p-4 flex flex-col justify-between gap-6 bg-zinc-200 shadow-lg transition-all duration-300">
      <div className="flex items-center justify-center lg:justify-start gap-3 mb-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="p-1 rounded-lg bg-white shadow-md transition-transform hover:scale-105">
            <Image
              src="https://res.cloudinary.com/dws2bgxg4/image/upload/v1739707358/logoooo_vvxiak.jpg"
              alt="UniERP"
              width={40}
              height={40}
              className="rounded-md"
            />
          </div>
          <span className="hidden lg:block text-xl font-semibold text-gray-800 tracking-tight">
            UniERP
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {SIDEBAR_LINKS.map((section) => (
          <div key={section.label} className="mb-6">
            <span className="hidden lg:block px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
              {section.label}
            </span>
            <div className="mt-2 space-y-1">
              {section.links.map((link) => {
                if (link.access.includes(role)) {
                  return (
                    <Link
                      key={link.name}
                      href={typeof link.href === 'function' ? link.href(role) : link.href} // Handle dynamic href
                      className="flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 text-gray-600 rounded-lg transition-all duration-200 hover:bg-blue-100 hover:text-blue-700 group"
                    >
                      <SidebarIcon icon={link.icon} />
                      <span className="hidden lg:block text-sm font-medium group-hover:font-semibold">
                        {link.name}
                      </span>
                    </Link>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}