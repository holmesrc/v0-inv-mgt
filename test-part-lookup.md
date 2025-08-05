# Part Lookup Testing

## Test Parts to Try:

### Mock Data (Should work immediately):
- `LM358` - Op amp
- `STM32F103` - Microcontroller  
- `74HC595` - Shift register
- `568-4109-1-ND` - Arduino MCU
- `ATMEGA328P-PU` - Arduino MCU
- `ESP32-WROOM-32` - WiFi module
- `NE555P` - Timer IC

### Real Parts (Will attempt web scraping):
- `LM741CN` - Op amp
- `2N2222A` - Transistor
- `1N4007` - Diode
- `CD4017BE` - Counter IC

## Expected Behavior:
1. Enter part number
2. Wait 1 second (debounce)
3. See "Searching Digikey and Mouser..." status
4. After 2-12 seconds, see result:
   - ✅ Found on [source] - fields auto-populate
   - ℹ️ Not found - enter manually

## Debugging:
- Check browser console for API logs
- Check Network tab for /api/part-lookup requests
- Status messages should appear below Part Number field
