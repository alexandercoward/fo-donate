require('dotenv').config();
const express = require('express');
const Stripe = require('stripe');

const app = express();

// Validate required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('ERROR: STRIPE_SECRET_KEY environment variable is required');
  process.exit(1);
}

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(express.static('public'));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create a checkout session for one-time or recurring donations
app.post('/create-checkout-session', async (req, res) => {
  const { amount, frequency, email, firstName, lastName } = req.body;

  // Amount comes in as dollars, Stripe expects cents
  const amountInCents = Math.round(amount * 100);
  const fullName = `${firstName} ${lastName}`.trim();

  // Determine base URL for redirects (use same domain as request)
  let baseUrl;
  if (process.env.NODE_ENV === 'production') {
    const host = req.headers.host || '';
    baseUrl = host.includes('.xyz') ? 'https://donate.fairobserver.xyz' : 'https://donate.fairobserver.com';
  } else {
    baseUrl = req.headers.origin || `http://localhost:${process.env.PORT || 3000}`;
  }

  try {
    let sessionConfig = {
      payment_method_types: ['card'],
      customer_email: email || undefined,
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: false },
      success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel.html`,
      metadata: {
        donor_name: fullName,
        donor_first_name: firstName,
        donor_last_name: lastName,
      },
    };

    if (frequency === 'monthly') {
      // Recurring donation - create a subscription
      sessionConfig.mode = 'subscription';
      sessionConfig.line_items = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Monthly Donation to Fair Observer',
            description: 'Fair Observer is a 501(c)(3) non-profit news organization. Our mission is to educate global citizens of today and tomorrow. We are solely supported by donations. Thank you for your support.',
          },
          unit_amount: amountInCents,
          recurring: {
            interval: 'month',
          },
        },
        quantity: 1,
      }];
    } else {
      // One-time donation
      sessionConfig.mode = 'payment';
      sessionConfig.line_items = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Donation to Fair Observer',
            description: 'Fair Observer is a 501(c)(3) non-profit news organization. Our mission is to educate global citizens of today and tomorrow. We are solely supported by donations. Thank you for your support.',
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      }];
      sessionConfig.submit_type = 'donate';
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get session details (for success page)
app.get('/session/:sessionId', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    res.json({
      customer_email: session.customer_details?.email,
      customer_name: session.customer_details?.name,
      amount_total: session.amount_total,
      mode: session.mode,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Donation server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
