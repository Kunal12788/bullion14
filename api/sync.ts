
import getPool from './db';

// Using standard function signature to avoid type dependency issues during build
export default async function handler(req: any, res: any) {
  let client;
  try {
    // Lazy load the pool
    const pool = getPool();
    client = await pool.connect();
    
    // Auto-migration: Ensure table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS key_value_store (
        key TEXT PRIMARY KEY,
        value JSONB
      );
    `);

    if (req.method === 'GET') {
      // READ Operation
      const { rows } = await client.query("SELECT key, value FROM key_value_store WHERE key IN ('invoices', 'inventory')");
      const invoices = rows.find(r => r.key === 'invoices')?.value || [];
      const inventory = rows.find(r => r.key === 'inventory')?.value || [];
      
      res.status(200).json({ invoices, inventory });
      
    } else if (req.method === 'POST') {
      // WRITE Operation
      const body = req.body || {};
      const { invoices, inventory } = body;
      
      // Basic validation
      if (!invoices && !inventory) {
         res.status(400).json({ error: 'Missing data payload' });
         return;
      }

      await client.query('BEGIN');
      
      if (invoices) {
        await client.query(`
          INSERT INTO key_value_store (key, value) VALUES ('invoices', $1)
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [JSON.stringify(invoices)]);
      }
      
      if (inventory) {
        await client.query(`
          INSERT INTO key_value_store (key, value) VALUES ('inventory', $1)
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [JSON.stringify(inventory)]);
      }

      await client.query('COMMIT');
      res.status(200).json({ success: true });

    } else if (req.method === 'DELETE') {
       // Reset Operation
       await client.query("DELETE FROM key_value_store");
       res.status(200).json({ success: true });
    } else {
       res.status(405).json({ error: 'Method Not Allowed' });
    }
    
  } catch (error: any) {
    console.error('Database Error:', error);
    if (client) {
        try { await client.query('ROLLBACK'); } catch {}
    }
    const statusCode = error.message?.includes('DATABASE_URL') ? 500 : 503;
    res.status(statusCode).json({ error: error.message || 'Internal Server Error' });
  } finally {
    if (client) {
      client.release();
    }
  }
}
