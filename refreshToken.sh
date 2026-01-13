#!/usr/bin/env bash

# for local dev

set -euo pipefail

USER_ID="routinehub.dev@gmail.com"

export $(grep -v '^#' .env.local | xargs)

echo "Generating Google OAuth URL for ${USER_ID}..."
AUTH_URL=$(USER_ID="$USER_ID" node --no-warnings --loader ts-node/esm <<'TS'
    import { google } from 'googleapis';

    const userId = process.env.USER_ID;
    if (!userId) throw new Error('USER_ID is not set');

    const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
    );

    const state = Buffer.from(JSON.stringify({ userId })).toString('base64url');
    process.stdout.write(
    oauth2.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/calendar.events'],
        state
    })
    );
TS
)

echo ""
echo "Open this URL in your browser and complete the consent flow:"
echo "$AUTH_URL"
echo ""
read -rp "Paste the ?code=... value here and press Enter: " OAUTH_CODE_INPUT
if [[ -z "$OAUTH_CODE_INPUT" ]]; then
    echo "No code entered. Aborting."
    exit 1
fi

echo "Exchanging authorization code for tokens..."
REFRESH_TOKEN=$(USER_ID="$USER_ID" OAUTH_CODE="$OAUTH_CODE_INPUT" node --no-warnings --loader ts-node/esm <<'TS'
    import { google } from 'googleapis';

    const code = process.env.OAUTH_CODE;
    if (!code) throw new Error('OAUTH_CODE is not set');

    const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
    );

    const { tokens } = await oauth2.getToken(code);
    if (!tokens.refresh_token) {
    throw new Error('No refresh_token returned. Ensure prompt=consent & access_type=offline.');
    }
    process.stdout.write(tokens.refresh_token);
TS
)


SANITIZED_USER_ID=$(printf '%s' "$USER_ID" | tr '[:lower:]' '[:upper:]' | tr -c 'A-Z0-9' '_')
ENV_KEY="GOOGLE_REFRESH_TOKEN_${SANITIZED_USER_ID}"
echo ""
echo "Add to .env.local:"
echo "${ENV_KEY}=${REFRESH_TOKEN}"
