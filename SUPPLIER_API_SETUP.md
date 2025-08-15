# Supplier API Setup Guide

## Digi-Key API Setup (Recommended - Free)

### 1. Create Digi-Key Developer Account
1. Go to https://developer.digikey.com/
2. Click "Get Started" or "Sign Up"
3. Create account with your email
4. Verify your email address

### 2. Create API Application
1. Log into the developer portal
2. Go to "My Apps" or "Applications"
3. Click "Create New App"
4. Fill out the form:
   - **App Name**: "Inventory Management System"
   - **App Type**: "Client Credentials" 
   - **Redirect URI**: Not needed for client credentials
   - **Description**: "Internal inventory management system"

### 3. Get API Credentials
1. After creating the app, you'll get:
   - **Client ID** (public)
   - **Client Secret** (keep private!)
2. Copy these to your `.env.local` file:
   ```
   DIGIKEY_CLIENT_ID=your_client_id_here
   DIGIKEY_CLIENT_SECRET=your_client_secret_here
   ```

### 4. API Limits
- **Free Tier**: 1,000 requests per day
- **Rate Limit**: 10 requests per second
- **Data**: Part details, pricing, availability, datasheets

## Mouser API Setup (Coming Soon)

### Benefits
- Large inventory of electronic components
- Real-time pricing and availability
- Free API access

### Setup Steps
1. Register at https://www.mouser.com/api-hub/
2. Request API access
3. Get API key
4. Add to environment variables

## Octopart API Setup (Coming Soon)

### Benefits
- Aggregates multiple suppliers
- Price comparison across vendors
- Part cross-references

### Setup Steps
1. Register at https://octopart.com/api/
2. Choose pricing plan (has free tier)
3. Get API key
4. Add to environment variables

## Testing Your Setup

1. Add your API keys to `.env.local`
2. Restart your development server
3. Go to your inventory app
4. Click "Supplier Lookup" button
5. Search for a common part like "LM358N"
6. You should see results from Digi-Key

## Troubleshooting

### "No results found"
- Check if your API keys are correct
- Verify the part number exists on Digi-Key
- Check browser console for error messages

### "API not configured" 
- Make sure environment variables are set
- Restart your development server
- Check `.env.local` file exists and has correct format

### Rate Limiting
- Free tier has daily limits
- Space out your searches
- Consider upgrading if you need more requests

## Usage Tips

1. **Search Strategy**: 
   - Use manufacturer part numbers for best results
   - Try common parts first (LM358, 1N4148, etc.)
   - Use exact part numbers when possible

2. **Data Quality**:
   - Digi-Key has the most comprehensive data
   - Always verify part specifications
   - Check availability before ordering

3. **Integration**:
   - Use "Use This" button to auto-fill inventory forms
   - Copy descriptions and specifications
   - Check datasheets for detailed specs
