# Fair Observer Donation Page

A donation page for Fair Observer built with Node.js, Express, and Stripe integration. Supports one-time and recurring monthly donations.

## Features

- One-time donations with preset amounts ($10, $25, $50, $100) or custom amount
- Monthly recurring subscriptions
- Stripe Checkout integration for secure payment processing
- Collects donor name and email
- Styled to match Fair Observer's design system
- Auto-redirect to fairobserver.com after successful donation
- Mobile-responsive design

## Project Structure

```
fo_donate/
├── server.js           # Express server with Stripe API integration
├── package.json        # Node.js dependencies
├── .env                # Environment variables (not in git)
├── .env.example        # Template for environment variables
├── .gitignore          # Git ignore rules
├── README.md           # This file
└── public/
    ├── index.html      # Main donation form page
    ├── success.html    # Thank you page (shown after successful donation)
    ├── cancel.html     # Cancellation page (shown if user cancels)
    └── assets/
        └── Logo.png    # Fair Observer logo
```

## Local Development

### Prerequisites

- Node.js 18+
- npm
- Stripe account with API keys

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/alexandercoward/fo-donate.git
   cd fo-donate
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and add your Stripe API keys:
   ```
   STRIPE_SECRET_KEY=sk_test_your_key_here
   STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
   PORT=3000
   NODE_ENV=development
   SUCCESS_REDIRECT_URL=https://fairobserver.com
   ```

5. Start the development server:
   ```bash
   npm start
   ```

6. Open http://localhost:3000 in your browser

### Testing Payments

Use Stripe's test card numbers for testing:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- Any future expiration date and any 3-digit CVC

## Production Deployment

### Server Details

- **Server**: publishing-platform (Hetzner Cloud)
- **IP Address**: 46.224.17.51
- **Application Path**: `/opt/fo-donate`
- **Process Manager**: PM2
- **Web Server**: nginx (Docker container)
- **Port**: 3002 (internal)

### Deployment Process

The application is deployed on the Hetzner server with the following setup:

1. **Application**: Runs via PM2 on port 3002
   ```bash
   # SSH into server
   ssh root@46.224.17.51

   # Navigate to app
   cd /opt/fo-donate

   # Pull latest changes
   git pull origin main

   # Install dependencies (if changed)
   npm install

   # Restart application
   pm2 restart fo-donate

   # Check status
   pm2 status
   ```

2. **nginx Configuration**: Located at `/opt/app/docker/nginx/conf.d/fo-donate.conf`
   - Proxies requests from donate.fairobserver.com to the Node.js app
   - SSL termination handled by nginx

3. **Firewall**: UFW configured to allow port 3002 from Docker networks

### PM2 Commands

```bash
# View logs
pm2 logs fo-donate

# Restart application
pm2 restart fo-donate

# Stop application
pm2 stop fo-donate

# View status
pm2 status

# Monitor resources
pm2 monit
```

## DNS Configuration

To make donate.fairobserver.com work, add the following DNS record in your Hostinger DNS management panel:

| Type | Name   | Value         | TTL  |
|------|--------|---------------|------|
| A    | donate | 46.224.17.51  | 3600 |

### Steps to Configure DNS in Hostinger:

1. Log into your Hostinger account
2. Go to **Hosting** → **fairobserver.com** → **DNS Zone Editor** (or similar)
3. Add a new **A Record**:
   - **Name/Host**: `donate`
   - **Points to/Value**: `46.224.17.51`
   - **TTL**: 3600 (or default)
4. Save the record
5. DNS propagation may take up to 24 hours, but usually completes within 1-2 hours

After DNS propagation, the site will be accessible at:
- https://donate.fairobserver.com

## API Endpoints

### `POST /create-checkout-session`

Creates a Stripe Checkout session for processing donations.

**Request Body:**
```json
{
  "amount": 25,
  "frequency": "once",
  "email": "donor@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

- `amount`: Donation amount in dollars
- `frequency`: "once" for one-time, "monthly" for recurring
- `email`: Donor's email address
- `firstName`: Donor's first name
- `lastName`: Donor's last name

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

### `GET /session/:sessionId`

Retrieves session details for the success page.

**Response:**
```json
{
  "customer_email": "donor@example.com",
  "customer_name": "John Doe",
  "amount_total": 2500,
  "mode": "payment"
}
```

### `GET /health`

Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-06T20:00:00.000Z"
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `STRIPE_SECRET_KEY` | Stripe secret API key | Yes |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable API key | Yes |
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `SUCCESS_REDIRECT_URL` | URL to redirect after donation | No |
| `HETZNER_API_TOKEN` | Hetzner Cloud API token | No |

## Going Live with Stripe

When ready to accept real payments:

1. Get your live API keys from https://dashboard.stripe.com/apikeys
2. Update `.env` on the server with live keys:
   ```bash
   ssh root@46.224.17.51
   cd /opt/fo-donate
   nano .env  # Update STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY
   pm2 restart fo-donate
   ```
3. Update `public/index.html` to use the live publishable key (search for `pk_test_`)

## Troubleshooting

### Application won't start
```bash
# Check PM2 logs
pm2 logs fo-donate --lines 100

# Check if port is in use
ss -tlnp | grep 3002

# Restart PM2
pm2 restart fo-donate
```

### nginx returns 502/504
```bash
# Check if app is running
pm2 status

# Check nginx config
docker exec nginx nginx -t

# Reload nginx
docker exec nginx nginx -s reload

# Check firewall rules
ufw status | grep 3002
```

### Stripe errors
- Verify API keys are correct in `.env`
- Check Stripe Dashboard for detailed error logs
- Ensure you're using test keys in development

## Security Notes

- Never commit `.env` files to git
- Use environment variables for all secrets
- The `.gitignore` file excludes sensitive files
- SSL/TLS is handled by nginx
- Stripe handles all payment card data (PCI compliant)

## Support

For questions or issues:
- GitHub: https://github.com/alexandercoward/fo-donate
- Fair Observer: https://fairobserver.com
