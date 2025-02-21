# Cult Staking Backend

This is the backend proxy server for the Cult Staking application, handling Xaman API interactions.

## Deployment

This backend is configured for deployment on Render.com. Follow these steps to deploy:

1. Create an account on [Render](https://render.com)
2. Connect your GitHub repository to Render
3. Create a new Web Service pointing to this repository
4. Set up the following environment variables in Render:
   - `REACT_APP_XAMAN_API_KEY`: Your Xaman API key
   - `REACT_APP_XAMAN_API_SECRET`: Your Xaman API secret

The service will automatically deploy and provide you with a URL like `https://your-app-name.onrender.com`.

## Local Development

To run the backend locally:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with:
   ```
   REACT_APP_XAMAN_API_KEY=your_api_key
   REACT_APP_XAMAN_API_SECRET=your_api_secret
   PORT=4000
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:4000`. 