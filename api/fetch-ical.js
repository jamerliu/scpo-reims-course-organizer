// Vercel serverless function — proxies Sciences Po iCal URL to bypass CORS
export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Only allow Sciences Po domains
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const allowed = ['scolarite-en.sciences-po.fr', 'scolarite.sciences-po.fr'];
  if (!allowed.some(d => parsed.hostname.endsWith(d))) {
    return res.status(403).json({ error: 'Only Sciences Po calendar URLs are allowed' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ScpoCoursePlanner/1.0)',
        'Accept': 'text/calendar, text/plain, */*',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Sciences Po returned ${response.status}` });
    }

    const text = await response.text();
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(text);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
