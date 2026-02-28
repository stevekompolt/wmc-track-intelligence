const SFDC_API_BASE = 'https://api.realintelligence.com/api';
const SFDC_ORG_ID = '00D5e000000HEcP';
const W2X_ENGINE = 'https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php';

export async function getCurrentIpAddress(): Promise<string> {
  const sources = [
    { url: 'https://api.ipify.org?format=json', extract: (d: any) => d.ip },
    { url: 'https://ipinfo.io/json', extract: (d: any) => d.ip },
    { url: 'https://api.my-ip.io/v2/ip.json', extract: (d: any) => d.ip },
    { url: 'https://httpbin.org/ip', extract: (d: any) => d.origin },
  ];

  for (const source of sources) {
    try {
      const res = await fetch(source.url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        const ip = source.extract(data);
        if (ip) return ip.trim();
      }
    } catch {
      // try next
    }
  }
  return 'unknown';
}

export async function getIPLocation(ip: string): Promise<{ city: string; country: string }> {
  const cacheKey = `ip_location_${ip}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch { /* ignore */ }
  }

  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      const location = { city: data.city || 'Unknown', country: data.country_name || 'Unknown' };
      localStorage.setItem(cacheKey, JSON.stringify(location));
      return location;
    }
  } catch {
    // fallback
  }
  return { city: 'Unknown', country: 'Unknown' };
}

export async function trackPortalLogin(contactId: string): Promise<void> {
  try {
    const ip = await getCurrentIpAddress();
    const location = await getIPLocation(ip);
    const loginUrl = window.location.href;

    const formData = new URLSearchParams();
    formData.append('sObj', 'ri__Portal__c');
    formData.append('ri__Action__c', 'WMC Intel Portal Login');
    formData.append('ri__Contact__c', contactId);
    formData.append('ri__IP_Address__c', ip);
    formData.append('ri__City__c', location.city);
    formData.append('ri__Country__c', location.country);
    formData.append('ri__Login_URL__c', loginUrl);

    // Hidden iframe POST (same pattern as wmc-media-hub)
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.name = 'portal_track_frame';
    document.body.appendChild(iframe);

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = W2X_ENGINE;
    form.target = 'portal_track_frame';

    formData.forEach((value, key) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();

    // Cleanup after a delay
    setTimeout(() => {
      form.remove();
      iframe.remove();
    }, 5000);
  } catch (error) {
    console.error('Portal login tracking failed:', error);
  }
}

export async function lookupContactByEmail(email: string): Promise<string | null> {
  try {
    const url = `${SFDC_API_BASE}/specific-wmc-member-email.py?orgId=${encodeURIComponent(SFDC_ORG_ID)}&email=${encodeURIComponent(email)}&sandbox=False`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json, text/plain, */*' },
    });

    if (!res.ok) return null;

    const text = await res.text();

    // Try JSON parse first
    try {
      const data = JSON.parse(text);
      return data.Id || data.id || data.sfdc_id || null;
    } catch {
      // Try XML-style extraction
      const match = text.match(/<id>([^<]+)<\/id>/i) || text.match(/"Id"\s*:\s*"([^"]+)"/);
      return match ? match[1] : null;
    }
  } catch (error) {
    console.error('Contact lookup failed:', error);
    return null;
  }
}
