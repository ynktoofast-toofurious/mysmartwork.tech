export const routeTokenByPage = {
    home: '1f4a8c2d9b3e7a6c',
    about: '7b1d5e9a3c4f8d2e',
    services: '2c9e6a1f4d7b3e8a',
    schedule: '8e3b1d6a4f2c9a7d',
    quote: '4d7a2c9e1b6f3a8c',
    tracking: '9a2f6d1c8e3b4a7d',
    gallery: '6c1e8a3d9b4f2a7e',
    contact: '3e9b4c1a7d2f6a8d',
    ask: '5a2d7e1c9b4f8a3d',
    register: '2f8a3d6c1e9b4a7d',
    login: '7d3a9c1e4f2b8a6d',
    dashboard: '1c8e4a7d2f9b3a6d',
    admin: '8a4d1f7c3e9b2a6d'
};

export const pageByRouteToken = Object.fromEntries(
    Object.entries(routeTokenByPage).map(([page, token]) => [token, page])
);

const basePath = import.meta.env.BASE_URL || '/';
const publicHomeHref = import.meta.env.DEV
    ? basePath
    : (import.meta.env.VITE_PUBLIC_HOME_URL || 'https://www.mysmartwork.tech/');

export function getBaseHref() {
    return basePath;
}

export function getPublicHomeHref() {
    return publicHomeHref;
}

export function getAssetHref(assetPath) {
    return `${basePath}${String(assetPath).replace(/^\//, '')}`;
}

export function getMaskedHref(pageKey) {
    if (pageKey === 'home') {
        return basePath;
    }

    const token = routeTokenByPage[pageKey];
    if (!token) {
        return basePath;
    }

    return `${basePath}?k=${encodeURIComponent(token)}`;
}
