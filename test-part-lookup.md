# Part Lookup Testing

## Test Parts to Try:

### Mock Data (Should work immediately):
- `LM358` - Op amp
- `STM32F103` - Microcontroller  
- `74HC595` - Shift register
- `568-4109-1-ND` - Arduino MCU (Digikey format)
- `TC2050-IDC-ND` - Cable assembly (Digikey format)
- `ATMEGA328P-PU` - Arduino MCU
- `ESP32-WROOM-32` - WiFi module
- `NE555P` - Timer IC

### Real Parts (Will attempt web scraping):
- `LM741CN` - Op amp
- `2N2222A` - Transistor
- `1N4007` - Diode
- `CD4017BE` - Counter IC

## Part Number Format Detection:
- **Digikey format**: Parts ending in `-ND`, `-1-ND`, `-CT-ND` (searches Digikey first)
- **Mouser format**: Parts like `595-TL072CP` (searches Mouser first)
- **Generic**: Searches both sites in default order

## Expected Behavior:
1. Enter part number
2. Wait 1 second (debounce)
3. See "Searching Digikey and Mouser..." status
4. After 2-12 seconds, see result:
   - ✅ Found on [correct source] - fields auto-populate
   - ℹ️ Not found - enter manually

## Debugging:
- Check browser console for API logs and search results
- Check Network tab for /api/part-lookup requests
- Status messages should appear below Part Number field
- Console should show format detection and search order
