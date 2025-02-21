require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Load API keys from .env
const XAMAN_API_KEY = process.env.REACT_APP_XAMAN_API_KEY;
const XAMAN_API_SECRET = process.env.REACT_APP_XAMAN_API_SECRET;

const XAMAN_BASE_URL = 'https://xumm.app/api/v1';

/**
 * Proxy for Xaman Sign Request
 */
app.post('/api/xaman/sign-request', async (req, res) => {
    try {
        // Check if API keys are configured
        if (!XAMAN_API_KEY || !XAMAN_API_SECRET) {
            console.error('Xaman API keys not configured');
            return res.status(500).json({ 
                error: 'Xaman API keys not configured. Please check backend environment variables.' 
            });
        }

        console.log('Making request to Xaman API with body:', JSON.stringify(req.body, null, 2));
        
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
        
        console.log('Xaman API Response:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Xaman API Error:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
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
        console.error('Xaman API Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to get payload status.' });
    }
});

/**
 * Start the Express Server
 */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`)); 