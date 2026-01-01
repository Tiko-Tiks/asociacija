# Send Email Edge Function

Supabase Edge Function for sending custom emails.

## Setup

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
supabase link --project-ref your-project-ref
```

4. Set environment variables:
```bash
# For Resend (recommended)
supabase secrets set RESEND_API_KEY=your_resend_api_key

# Optional: Set default from email
supabase secrets set EMAIL_FROM=noreply@branduolys.lt
```

5. Deploy the function:
```bash
supabase functions deploy send-email
```

## Usage

Call from your application:
```typescript
const { data, error } = await supabase.functions.invoke('send-email', {
  body: {
    to: 'user@example.com',
    from: 'noreply@branduolys.lt', // optional
    subject: 'Test Email',
    html: '<h1>Hello</h1>',
    text: 'Hello', // optional
  },
})
```

## Email Service Options

1. **Resend** (Recommended): Set `RESEND_API_KEY` secret
2. **SendGrid**: Modify function to use SendGrid API
3. **AWS SES**: Modify function to use AWS SES
4. **Supabase Auth Email**: Limited to auth emails only

## Environment Variables

- `RESEND_API_KEY`: Resend API key (optional, but recommended)
- `EMAIL_FROM`: Default from email address (optional)

