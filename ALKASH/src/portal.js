const STORAGE_KEYS = {
    users: 'alkashUsers',
    packages: 'alkashPackages',
    cases: 'alkashCases',
    session: 'alkashSession'
};

const defaultUsers = [
    {
        name: 'Platform Admin',
        email: 'admin@alkashtrans.com',
        password: 'admin123',
        role: 'admin',
        enabled: true,
        features: ['prioritySupport', 'advancedTracking', 'bulkUpload']
    },
    {
        name: 'Jean Mukendi',
        email: 'jean@example.com',
        password: 'user123',
        role: 'user',
        enabled: true,
        features: ['advancedTracking']
    }
];

const defaultPackages = [
    {
        reference: 'ATX-2047',
        ownerEmail: 'jean@example.com',
        status: 'In Transit',
        route: 'Houston to Kinshasa',
        updatedAt: '2026-07-10',
        history: ['Picked up in Houston', 'Loaded in container', 'Vessel departed']
    },
    {
        reference: 'ATX-2304',
        ownerEmail: 'jean@example.com',
        status: 'Arrived in Kinshasa',
        route: 'Baltimore to Kinshasa',
        updatedAt: '2026-07-01',
        history: ['Export cleared', 'Ocean transit complete', 'Arrived at destination hub']
    }
];

const defaultCases = [
    {
        id: 'CASE-1101',
        userEmail: 'jean@example.com',
        issue: 'Requesting customs invoice copy',
        severity: 'open',
        createdAt: '2026-07-08'
    },
    {
        id: 'CASE-1102',
        userEmail: 'jean@example.com',
        issue: 'Container delay inquiry',
        severity: 'problem',
        createdAt: '2026-07-09'
    }
];

function readJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) {
            return fallback;
        }
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

export function initializePortalData() {
    if (!localStorage.getItem(STORAGE_KEYS.users)) {
        writeJson(STORAGE_KEYS.users, defaultUsers);
    }

    if (!localStorage.getItem(STORAGE_KEYS.packages)) {
        writeJson(STORAGE_KEYS.packages, defaultPackages);
    }

    if (!localStorage.getItem(STORAGE_KEYS.cases)) {
        writeJson(STORAGE_KEYS.cases, defaultCases);
    }
}

export function getUsers() {
    return readJson(STORAGE_KEYS.users, []);
}

export function getPackages() {
    return readJson(STORAGE_KEYS.packages, []);
}

export function getCases() {
    return readJson(STORAGE_KEYS.cases, []);
}

export function getSession() {
    return readJson(STORAGE_KEYS.session, null);
}

export function clearSession() {
    localStorage.removeItem(STORAGE_KEYS.session);
}

export function login(email, password) {
    const normalizedEmail = email.trim().toLowerCase();
    const users = getUsers();
    const user = users.find((item) => item.email.toLowerCase() === normalizedEmail);

    if (!user) {
        return { ok: false, message: 'No account found for this email.' };
    }

    if (!user.enabled) {
        return { ok: false, message: 'This account is disabled. Contact support.' };
    }

    if (user.password !== password) {
        return { ok: false, message: 'Invalid credentials.' };
    }

    const session = {
        name: user.name,
        email: user.email,
        role: user.role,
        features: user.features || []
    };

    writeJson(STORAGE_KEYS.session, session);

    return { ok: true, session };
}

export function registerUser({ name, email, password }) {
    const normalizedEmail = email.trim().toLowerCase();
    const users = getUsers();
    const existing = users.find((item) => item.email.toLowerCase() === normalizedEmail);

    if (existing) {
        return { ok: false, message: 'An account with this email already exists.' };
    }

    users.push({
        name: name.trim(),
        email: normalizedEmail,
        password,
        role: 'user',
        enabled: true,
        features: []
    });

    writeJson(STORAGE_KEYS.users, users);
    return { ok: true };
}

export function getUserPackages(email) {
    return getPackages().filter((item) => item.ownerEmail.toLowerCase() === email.toLowerCase());
}

export function addSupportCase(userEmail, issue) {
    const cases = getCases();
    const id = `CASE-${Math.floor(1000 + Math.random() * 9000)}`;

    cases.push({
        id,
        userEmail,
        issue,
        severity: 'open',
        createdAt: new Date().toISOString().slice(0, 10)
    });

    writeJson(STORAGE_KEYS.cases, cases);
    return id;
}

export function setUserRole(email, role) {
    const users = getUsers().map((user) => {
        if (user.email.toLowerCase() !== email.toLowerCase()) {
            return user;
        }
        return { ...user, role };
    });

    writeJson(STORAGE_KEYS.users, users);
}

export function setUserEnabled(email, enabled) {
    const users = getUsers().map((user) => {
        if (user.email.toLowerCase() !== email.toLowerCase()) {
            return user;
        }
        return { ...user, enabled };
    });

    writeJson(STORAGE_KEYS.users, users);
}

export function removeUser(email) {
    const users = getUsers().filter((user) => user.email.toLowerCase() !== email.toLowerCase());
    writeJson(STORAGE_KEYS.users, users);
}

export function setUserFeature(email, featureName, enabled) {
    const users = getUsers().map((user) => {
        if (user.email.toLowerCase() !== email.toLowerCase()) {
            return user;
        }

        const currentFeatures = new Set(user.features || []);
        if (enabled) {
            currentFeatures.add(featureName);
        } else {
            currentFeatures.delete(featureName);
        }

        return { ...user, features: Array.from(currentFeatures) };
    });

    writeJson(STORAGE_KEYS.users, users);
}

export function getPlatformHealthSummary() {
    const users = getUsers();
    const cases = getCases();
    const packages = getPackages();

    const activeUsers = users.filter((user) => user.enabled).length;
    const openCases = cases.filter((item) => item.severity === 'open' || item.severity === 'problem').length;

    return {
        totalUsers: users.length,
        activeUsers,
        disabledUsers: users.length - activeUsers,
        openCases,
        packagesInSystem: packages.length,
        uptime: '99.95%'
    };
}

export const featureCatalog = [
    { key: 'advancedTracking', label: 'Advanced Tracking' },
    { key: 'prioritySupport', label: 'Priority Support' },
    { key: 'bulkUpload', label: 'Bulk Upload' }
];

export function isAdminRole(role) {
    return role === 'admin' || role === 'co-admin';
}
