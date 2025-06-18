const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = async (req, res) => {
  try {
    const auth = Buffer.from(
      `${process.env.GORGIAS_EMAIL}:${process.env.GORGIAS_API_KEY}`
    ).toString('base64');

    const response = await fetch(
      `https://${process.env.GORGIAS_DOMAIN}/api/tickets?include=customer`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      return res.status(500).json({ error: 'Gorgias API failed' });
    }

    const data = await response.json();
    const tickets = data.data.map((ticket) => ({
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      created_at: ticket.created_datetime_utc,
      updated_at: ticket.updated_datetime_utc,
      customer_email: ticket.customer?.email || null,
    }));

    const { error } = await supabase
      .from('raw_tickets_gorgias')
      .upsert(tickets, { onConflict: 'id' });

    if (error) return res.status(500).json({ error });

    return res.status(200).json({ inserted: tickets.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
