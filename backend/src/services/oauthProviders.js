import dotenv from 'dotenv';
dotenv.config();

/**
 * Registry of available OAuth 2.0 providers configured via environment variables.
 * A provider is only active if its CLIENT_ID is present in the environment.
 */
export const getOAuthProviders = () => {
    const providers = [];

    // 1. Google Identity / OpenID Connect
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        providers.push({
            id: 'google',
            label: 'Google',
            issuer: 'https://accounts.google.com',
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET
        });
    }

    // 2. Microsoft Entra ID (Azure AD)
    if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET && process.env.MICROSOFT_TENANT_ID) {
        providers.push({
            id: 'microsoft',
            label: 'Microsoft',
            issuer: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/v2.0`,
            client_id: process.env.MICROSOFT_CLIENT_ID,
            client_secret: process.env.MICROSOFT_CLIENT_SECRET
        });
    }

    // 3. Institutional Generic OIDC
    if (process.env.INSTITUTIONAL_CLIENT_ID && process.env.INSTITUTIONAL_CLIENT_SECRET && process.env.INSTITUTIONAL_ISSUER) {
        providers.push({
            id: 'institutional',
            label: 'Institution SSO',
            issuer: process.env.INSTITUTIONAL_ISSUER,
            client_id: process.env.INSTITUTIONAL_CLIENT_ID,
            client_secret: process.env.INSTITUTIONAL_CLIENT_SECRET
        });
    }

    return providers;
};

export const getProviderConfig = (providerId) => {
    const providers = getOAuthProviders();
    return providers.find(p => p.id === providerId);
};
