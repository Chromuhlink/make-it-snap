const { supabaseAdmin, bucketName } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const expected = process.env.CLEANUP_SECRET;
    if (!expected || token !== expected) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Service role key not configured' });
      return;
    }

    // List files sorted by created_at desc
    const { data: files, error: listErr } = await supabaseAdmin.storage
      .from(bucketName)
      .list('', { limit: 1000, offset: 0, sortBy: { column: 'created_at', order: 'desc' } });
    if (listErr) throw listErr;

    if (!files || files.length <= 1) {
      res.status(200).json({ success: true, kept: files?.[0]?.name || null, deleted: [] });
      return;
    }

    const keep = files[0].name;
    const toDelete = files.slice(1).map(f => f.name);

    const { error: delErr } = await supabaseAdmin.storage
      .from(bucketName)
      .remove(toDelete);
    if (delErr) throw delErr;

    res.status(200).json({ success: true, kept: keep, deleted: toDelete });
  } catch (e) {
    console.error('Cleanup API error:', e);
    res.status(500).json({ error: 'Cleanup failed', message: e?.message || String(e) });
  }
};


