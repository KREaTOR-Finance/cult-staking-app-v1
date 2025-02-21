require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

// Configure CORS with specific options
const allowedOrigins = [
  'https://kreator-finance.github.io',
  'http://localhost:3000',
  'http://localhost:4000',
  'https://cult-staking-app-v1.onrender.com'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log(`⚠️ Request from unauthorized origin: ${origin}`);
    }
    
    callback(null, true);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());

// Load API keys from .env
const XAMAN_API_KEY = process.env.REACT_APP_XAMAN_API_KEY;
const XAMAN_API_SECRET = process.env.REACT_APP_XAMAN_API_SECRET;

if (!XAMAN_API_KEY || !XAMAN_API_SECRET) {
  console.error('❌ Missing required Xaman API credentials');
}

const XAMAN_BASE_URL = 'https://xumm.app/api/v1';

// Root route handler
app.get('/', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>CULT Staking Backend API</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: -apple-system, system-ui, sans-serif; 
            padding: 20px; 
            max-width: 800px; 
            margin: 0 auto;
            line-height: 1.6;
            background: #1a1a1a;
            color: #fff;
          }
          pre { 
            background: #2d2d2d; 
            padding: 15px; 
            border-radius: 8px;
            overflow-x: auto;
            border: 1px solid #3d3d3d;
          }
          .status { 
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            background: #2d2d2d;
            border: 1px solid #3d3d3d;
          }
          .status.ok { border-color: #4CAF50; }
          .status.error { border-color: #f44336; }
          a { color: #FFD700; }
          h1, h2 { color: #FFD700; }
        </style>
      </head>
      <body>
        <h1>🎯 CULT Staking Backend API</h1>
        <div class="status ${XAMAN_API_KEY && XAMAN_API_SECRET ? 'ok' : 'error'}">
          <strong>Status:</strong> ${XAMAN_API_KEY && XAMAN_API_SECRET ? '✅ Running' : '❌ Missing API Keys'}
        </div>
        <h2>📚 Available Endpoints:</h2>
        <ul>
          <li><a href="/api/health">/api/health</a> - Health check endpoint</li>
          <li>/api/xaman/sign-request - Sign request endpoint (POST)</li>
          <li>/api/xaman/payload/:payloadId - Get payload status</li>
        </ul>
        <h2>🔧 Environment:</h2>
        <pre>${JSON.stringify({
          nodeEnv: process.env.NODE_ENV,
          port: process.env.PORT,
          apiKeysConfigured: !!(XAMAN_API_KEY && XAMAN_API_SECRET),
          allowedOrigins
        }, null, 2)}</pre>
        <h2>📝 Request Info:</h2>
        <pre>${JSON.stringify({
          url: req.url,
          method: req.method,
          headers: req.headers,
          timestamp: new Date().toISOString()
        }, null, 2)}</pre>
      </body>
    </html>
  `;
  res.send(html);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    apiKeysConfigured: !!(XAMAN_API_KEY && XAMAN_API_SECRET)
  });
});

/**
 * Proxy for Xaman Sign Request
 */
app.post('/api/xaman/sign-request', async (req, res) => {
    try {
        // Check if API keys are configured
        if (!XAMAN_API_KEY || !XAMAN_API_SECRET) {
            console.error('❌ Xaman API keys not configured');
            return res.status(500).json({ 
                error: 'Xaman API keys not configured. Please check backend environment variables.' 
            });
        }

        console.log('📤 Making request to Xaman API with body:', JSON.stringify(req.body, null, 2));
        
        const response = await axios.post(
            `${XAMAN_BASE_URL}/platform/payload`,
            req.body,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': XAMAN_API_KEY,
                    'x-api-secret': XAMAN_API_SECRET
                }
            }
        );
        
        console.log('📥 Xaman API Response:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('❌ Xaman API Error:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
            stack: error.stack
        });
        
        // Send more detailed error information
        res.status(500).json({ 
            error: error.response?.data?.error || error.message,
            details: error.response?.data
        });
    }
});

/**
 * Proxy for getting payload status
 */
app.get('/api/xaman/payload/:payloadId', async (req, res) => {
    try {
        const response = await axios.get(
            `${XAMAN_BASE_URL}/platform/payload/${req.params.payloadId}`,
            {
                headers: {
                    'x-api-key': XAMAN_API_KEY,
                    'x-api-secret': XAMAN_API_SECRET
                }
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error('❌ Xaman API Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to get payload status.' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

/**
 * Start the Express Server
 */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`
✅ Backend Server Started
🌍 Environment: ${process.env.NODE_ENV}
🚪 Port: ${PORT}
🔑 API Keys configured: ${!!(XAMAN_API_KEY && XAMAN_API_SECRET)}
🌐 Allowed Origins: ${allowedOrigins.join(', ')}
📝 Time: ${new Date().toISOString()}
  `);
}); 