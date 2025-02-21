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
        res.json(response.data);
    } catch (error) {
        console.error('Xaman API Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Xaman API request failed.' });
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