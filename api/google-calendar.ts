import { Request, Response } from 'express';
import { dbAdmin } from './firebase-admin.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

// Helper to get the redirect URI dynamically based on the request origin
function getRedirectUri(req: Request) {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}/api/auth/google/callback`;
}

export const getGoogleAuthUrl = (req: Request, res: Response) => {
  const redirectUri = getRedirectUri(req);
  
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events',
    access_type: 'offline',
    prompt: 'consent'
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ url: authUrl });
};

export const handleGoogleCallback = async (req: Request, res: Response) => {
  const { code } = req.query;
  const redirectUri = getRedirectUri(req);

  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code as string,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange error:', tokenData);
      return res.status(500).send('Error exchanging code for token');
    }

    // Save tokens to Firestore
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + tokenData.expires_in);

    await dbAdmin.collection('settings').doc('google_calendar').set({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null, // Might not be present if not first auth
      expiry_date: expiryDate.getTime(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Send success message to parent window and close popup
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${tokenData.access_token}' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Autenticação concluída. Esta janela será fechada automaticamente.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).send('Internal Server Error');
  }
};

export const getValidAccessToken = async (): Promise<string | null> => {
  try {
    const docSnap = await dbAdmin.collection('settings').doc('google_calendar').get();
    if (!docSnap.exists) return null;

    const data = docSnap.data();
    if (!data || !data.access_token) return null;

    // Check if expired (with 5 minutes buffer)
    const now = new Date().getTime();
    if (data.expiry_date && now > data.expiry_date - 5 * 60 * 1000) {
      if (!data.refresh_token) {
        console.error('Google Calendar token expired and no refresh token available');
        return null;
      }

      // Refresh token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: data.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('Error refreshing token:', tokenData);
        return null;
      }

      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + tokenData.expires_in);

      await dbAdmin.collection('settings').doc('google_calendar').set({
        access_token: tokenData.access_token,
        expiry_date: expiryDate.getTime(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return tokenData.access_token;
    }

    return data.access_token;
  } catch (error) {
    console.error('Error getting valid access token:', error);
    return null;
  }
};

export const getGoogleEvents = async (req: Request, res: Response) => {
  const token = await getValidAccessToken();
  if (!token) {
    return res.status(401).json({ error: 'No valid Google Calendar token found' });
  }

  try {
    // Fetch events from the primary calendar
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1); // Get events from last month
    
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 3); // Get events up to 3 months in future

    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250'
    });

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

export const handleGoogleDisconnect = async (req: Request, res: Response) => {
  try {
    await dbAdmin.collection('settings').doc('google_calendar').delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
};

export const createGoogleEvent = async (summary: string, description: string, startTime: string, endTime: string) => {
  const token = await getValidAccessToken();
  if (!token) {
    throw new Error('No valid Google Calendar token found. Please connect your account.');
  }

  const event = {
    summary,
    description,
    start: {
      dateTime: startTime,
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: endTime,
      timeZone: 'America/Sao_Paulo',
    },
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Error creating Google Calendar event:', errorData);
    throw new Error('Failed to create event in Google Calendar');
  }

  const data = await response.json();
  return data;
};
