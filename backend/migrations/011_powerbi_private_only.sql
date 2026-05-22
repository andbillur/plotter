-- Ochiq (Publish to web) embed o'chiriladi — faqat login bilan CRM grafiklari

UPDATE app_settings SET value = '' WHERE key = 'powerbi_embed_url';

INSERT INTO app_settings (key, value) VALUES ('powerbi_mode', 'private')
ON CONFLICT (key) DO UPDATE SET value = 'private';
