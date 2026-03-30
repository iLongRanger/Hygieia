UPDATE invoices
SET public_token = encode(digest(public_token, 'sha256'), 'hex')
WHERE public_token IS NOT NULL;
