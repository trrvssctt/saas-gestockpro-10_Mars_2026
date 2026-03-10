import { User, UserRole } from '../types';

const AUTH_STORAGE_KEY = 'gsp_session_vault';

/**
 * Définition stricte des plans
 */
const PLAN_RULES = {
  BASIC: {
    modules: [
      'dashboard',
      'categories',
      'subcategories',
      'inventory',
      'movements',
      'services',
      'customers',
      'sales',
      'payments',     // Trésorerie
      'governance',
      'subscription',
      'settings',
    ],
    limits: {
      customers: 5,
      users: 6,
      monthlySales: 20
    }
  },
  PRO: {
    modules: [
      'dashboard',
      'categories',
      'subcategories',
      'inventory',
      'services',
      'customers',
      'sales',
      'payments',
      'governance',
      'subscription',
      'settings',
      'security',
      'recovery',
      'movements',
    ],
    limits: {
      customers: 12,
      users: 10,
      monthlySales: 50
    }
  },
  ENTERPRISE: {
    modules: [
      'dashboard',
      'categories',
      'subcategories',
      'inventory',
      'services',
      'customers',
      'sales',
      'payments',
      'governance',
      'subscription',
      'settings',
      'security',
      'recovery',
      'movements',
      'inventorycampaigns',
      'rh',
      'my-leaves'
    ], // Tous les modules autorisés sauf le panneau 'superadmin'
    limits: null    // Aucune limite
  }
};

export const authBridge = {
  saveSession: (user: User, token: string) => {
    let roles: UserRole[] = [];

    if (Array.isArray(user.roles) && user.roles.length > 0) {
      roles = user.roles;
    } else if (user.role) {
      roles = [user.role];
    } else {
      roles = [UserRole.SALES];
    }

    const sessionUser = { ...user, roles };
    sessionStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ user: sessionUser, token, timestamp: Date.now() })
    );
    // Apply tenant UI preferences immediately so login shows correct look
    try {
      const tenant = (sessionUser as any).tenant || (sessionUser as any).tenantData || null;
      // tenant may include theme, fontFamily, baseFontSize, primaryColor
      if (tenant) {
        if (tenant.primaryColor) {
          document.documentElement.style.setProperty('--primary-kernel', tenant.primaryColor);
        }
        if (tenant.buttonColor || tenant.button_color) {
          document.documentElement.style.setProperty('--button-kernel', tenant.buttonColor || tenant.button_color);
        }
        if (tenant.fontFamily) {
          document.documentElement.style.setProperty('--kernel-font-family', tenant.fontFamily);
          document.documentElement.style.fontFamily = tenant.fontFamily;
        }
        if (tenant.baseFontSize) {
          document.documentElement.style.setProperty('--base-font-size', `${tenant.baseFontSize}px`);
          document.documentElement.style.fontSize = `${tenant.baseFontSize}px`;
        }
        const themeVal = tenant.theme ?? tenant.is_dark ?? 'light';
        const isDark = themeVal === 'dark' || themeVal === true;
        document.documentElement.classList.toggle('dark', Boolean(isDark));
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      }
    } catch (e) {
      // no-op
    }
  },

  getSession: (): { user: User; token: string } | null => {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    try {
      const data = JSON.parse(raw);
      if (Date.now() - data.timestamp > 86400000) {
        authBridge.clearSession();
        return null;
      }
      return data;
    } catch {
      return null;
    }
  },


  fetchMe: async (token: string): Promise<User | null> => {
    try {
      //const response = await fetch('http://localhost:3000/api/auth/me', {
       const response = await fetch('https://gestockpro.realtechprint.com/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) return null;

      const user = await response.json();
      return {
        ...user,
        roles: Array.isArray(user.roles) ? user.roles : [user.role]
      };
    } catch {
      return null;
    }
  },

  clearSession: () => sessionStorage.removeItem(AUTH_STORAGE_KEY),

  /**
   * 🔐 Gouvernance des accès par PLAN + RÔLE
   */
  canAccess: (user: User, moduleId: string): boolean => {
    const roles = Array.isArray(user.roles) ? user.roles : [user.role];
    const planId = (user as any).planId || 'BASIC';
    // Tenant payment gating: if tenant is not up-to-date, restrict access.
    const tenantStatus = (user as any)?.tenant?.paymentStatus;
    const isTenantOk = !tenantStatus || tenantStatus === 'UP_TO_DATE' || tenantStatus === 'TRIAL';
    if (!isTenantOk) {
      // SUPER_ADMIN allowed only to access superadmin panel
      if (roles.includes(UserRole.SUPER_ADMIN)) return moduleId === 'superadmin';
      // ADMIN can only access dashboard when tenant payments are not up-to-date
      if (roles.includes(UserRole.ADMIN)) return moduleId === 'dashboard';
      // All other roles: no access
      return false;
    }

    // SUPER ADMIN : accès réservé uniquement au panneau 'superadmin'
    // (retourne true seulement si le module demandé est 'superadmin')
    if (roles.includes(UserRole.SUPER_ADMIN)) return moduleId === 'superadmin';

    const plan = PLAN_RULES[planId as keyof typeof PLAN_RULES] || PLAN_RULES.BASIC;

    // ENTERPRISE : tous les modules
    if (plan.modules.includes('*')) return true;

    // Verrouillage du périmètre du plan avec support des sous-modules
    const hasModuleAccess = plan.modules.includes(moduleId) || 
                           plan.modules.some(planModule => moduleId.startsWith(planModule + '.'));
    if (!hasModuleAccess) return false;

    // ADMIN : accès à tous les modules du plan, y compris les sous-modules
    if (roles.includes(UserRole.ADMIN)) {
      // Pour les modules RH, autoriser tous les sous-modules si 'rh' est dans le plan
      if (moduleId.startsWith('rh.') && plan.modules.includes('rh')) return true;
      return true;
    }

    const roleMap: Record<string, string[]> = {
      [UserRole.SALES]: ['dashboard', 'sales', 'my-leaves'],
      [UserRole.SUPER_ADMIN]: ['superadmin'],
      [UserRole.HR_MANAGER]: [
        'dashboard',
        'rh',
        'rh.employees', 'rh.departments', 'rh.contracts', 'rh.org', 'rh.docs', 'rh.leaves', 'rh.recruitment', 'rh.training', 'rh.performance',
        'rh.payroll.settings', 'rh.payroll.generation', 'rh.payroll.slips', 'rh.payroll.bonuses', 'rh.payroll.advances', 'rh.payroll.declarations',
        'employees',
        'contracts',
        'payroll',
        'payslips',
        'advances',
        'declarations',
        'documents',
        'organigram',
        'time',
        'performance',
        'my-leaves'
      ],
      [UserRole.STOCK_MANAGER]: [
        'dashboard',
        'categories',
        'subcategories',
        'inventory',
        'movements',
        'services',
        // Allow limited visibility into HR (employees/documents) for operational managers
        'rh',
        'rh.employees', 'rh.departments', 'rh.docs',
        'employees',
        'documents',
        'my-leaves'
      ],
      [UserRole.ACCOUNTANT]: [
        'dashboard',
        'payments',
        'customers',
        'recovery',
        // Accounting needs access to payroll-related resources in Enterprise
        'rh',
        'rh.payroll.settings', 'rh.payroll.generation', 'rh.payroll.slips', 'rh.payroll.bonuses', 'rh.payroll.advances', 'rh.payroll.declarations',
        'payroll',
        'payslips',
        'advances',
        'declarations',
        'employees',
        'my-leaves'
      ],
      ['EMPLOYEE' as any]: ['dashboard', 'inventory', 'customers', 'services', 'my-leaves']
    };

    return roles.some(r => (roleMap[r as any] || []).includes(moduleId));
  },

  /**
   * 🚫 Gestion des quotas par PLAN
   */
  canPerform: (
    user: User,
    action: 'CREATE' | 'EDIT' | 'DELETE' | 'VIEW',
    resource: string
  ): boolean => {
    const roles = Array.isArray(user.roles) ? user.roles : [user.role];
    const planId = (user as any).planId || 'BASIC';

    // SUPER ADMIN / ADMIN : pas de restriction — autoriser CRUD complet
    if (roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.ADMIN)) {
      return true;
    }

    const plan = PLAN_RULES[planId as keyof typeof PLAN_RULES] || PLAN_RULES.BASIC;

    // ENTERPRISE : aucune limite
    if (!plan.limits) return true;

    if (action === 'CREATE') {
      if (resource === 'customers' && (user as any).customersCount >= plan.limits.customers) {
        return false;
      }

      if (resource === 'users' && (user as any).usersCount >= plan.limits.users) {
        return false;
      }

      if (
        resource === 'sales' &&
        (user as any).monthlySalesCount >= plan.limits.monthlySales
      ) {
        return false;
      }
    }

    return roles.some(r => {
      if (r === UserRole.HR_MANAGER) {
        // HR managers can perform all HR-related operations
        return ['employees','contracts','payroll','payslips','advances','declarations','documents','organigram','time','performance'].includes(resource);
      }
      if (r === UserRole.STOCK_MANAGER) {
        return ['categories', 'subcategories', 'inventory', 'movements', 'services','inventorycampaigns', 'employees', 'documents'].includes(resource);
      }
      if (r === UserRole.SALES) {
        if (['sales', 'customers', 'services'].includes(resource)) return true;
        return action === 'VIEW' && resource === 'inventory';
      }
      if (r === UserRole.ACCOUNTANT) {
        if (['payments', 'settings', 'recovery', 'services','sales','payroll','payslips','advances','declarations','employees'].includes(resource)) return true;
        return action === 'VIEW';
      }
      // Employees can view their own HR records and documents; they may create attendance/time entries
      if (r === UserRole.EMPLOYEE) {
        if (['payroll', 'payslips', 'documents', 'employees', 'organigram', 'time'].includes(resource)) {
          return action === 'VIEW' || resource === 'time' || resource === 'documents';
        }
        return action === 'VIEW';
      }
      return action === 'VIEW';
    });
  }
  ,

  /**
   * Retourne les limites du plan de l'utilisateur (ou null si illimité)
   */
  getPlanLimits: (user: User) => {
    const planId = (user as any).planId || 'BASIC';
    const plan = PLAN_RULES[planId as keyof typeof PLAN_RULES] || PLAN_RULES.BASIC;
    return plan.limits || null;
  },

  /**
   * Vérifie si la création d'une ressource est autorisée en fonction des limites du plan
   * resource: 'customers' | 'users' | 'sales'
   * currentCount: nombre actuel (pour sales on passe le compteur mensuel)
   */
  isCreationAllowed: (user: User, resource: string, currentCount: number) => {
    const planId = (user as any).planId || 'BASIC';
    const plan = PLAN_RULES[planId as keyof typeof PLAN_RULES] || PLAN_RULES.BASIC;
    const limits = plan.limits;
    if (!limits) return true; // unlimited (Enterprise)

    if (resource === 'customers') {
      return currentCount < limits.customers;
    }
    if (resource === 'users') {
      return currentCount < limits.users;
    }
    if (resource === 'sales') {
      return currentCount < limits.monthlySales;
    }
    return true;
  }
};
