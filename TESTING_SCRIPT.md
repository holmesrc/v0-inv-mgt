# 🧪 Inventory Management System - Testing Script

## **Pre-Test Setup**
- [ ] Open your app URL in browser
- [ ] Have Slack channel open to monitor notifications
- [ ] Clear browser console (F12 → Console → Clear)

---

## **1. 📊 Dashboard Overview Tests**

### **Basic Dashboard Load**
- [ ] Dashboard loads without errors
- [ ] Stats cards show: Total Items, Low Stock Items, Pending Changes
- [ ] Inventory table displays with data
- [ ] Search bar is visible and functional

### **Stats Verification**
- [ ] **Total Items**: Count matches your inventory
- [ ] **Low Stock Items**: Red number (should be ~97 based on earlier tests)
- [ ] **Pending Changes**: Shows any unsaved changes

---

## **2. 🔍 Search & Filter Tests**

### **Search Functionality**
- [ ] Type "LM358" in search → Results filter correctly
- [ ] Clear search → All items return
- [ ] Search by description → Works
- [ ] Search by location "H3" → Filters to H3 locations

### **Category Filters**
- [ ] **All Items** → Shows everything
- [ ] **Low Stock** → Shows only red-badged items
- [ ] **Approaching Low** → Shows yellow-badged items

### **Sorting**
- [ ] Click "Part Number" header → Sorts A-Z, then Z-A
- [ ] Click "Quantity" header → Sorts low to high, high to low
- [ ] Click "Location" header → Sorts alphabetically

---

## **3. ➕ Add Item Tests**

### **Basic Add Item**
- [ ] Click "Add Item" → Dialog opens
- [ ] Fill required fields:
  - Requester Name: "TestUser"
  - Part Number: "TEST-001"
  - Description: "Test Component"
  - Quantity: "50"
- [ ] Click "Add Item" → Success message
- [ ] Item appears in inventory table

### **Auto-Populate Test**
- [ ] Click "Add Item" → Dialog opens
- [ ] Type "LM358N" in Part Number field
- [ ] Wait 1 second → Watch for:
  - [ ] Spinning icon appears
  - [ ] "Searching Digi-Key..." message
  - [ ] MFG Part Number auto-fills
  - [ ] Description auto-fills
  - [ ] Supplier shows "Digi-Key"

### **Duplicate Detection**
- [ ] Try adding same part number again
- [ ] Should show duplicate warning
- [ ] Options to merge or create separate entry

### **Batch Mode**
- [ ] Toggle "Batch Mode" → Interface changes
- [ ] Add multiple items in batch
- [ ] Submit batch → All items added

---

## **4. ✏️ Edit & Delete Tests**

### **Inline Editing**
- [ ] Click pencil icon on any item
- [ ] Edit quantity → Save → Updates correctly
- [ ] Edit description → Save → Updates correctly
- [ ] Cancel edit → Reverts changes

### **Delete Item**
- [ ] Click trash icon → Confirmation dialog
- [ ] Confirm delete → Item removed
- [ ] Check item is gone from table

---

## **5. 🛒 Reorder Tests**

### **Reorder Dialog**
- [ ] Click "Reorder" on low stock item
- [ ] Dialog opens with:
  - [ ] Part information displayed
  - [ ] Quantity pre-filled with reorder point
  - [ ] Urgency dropdown works
  - [ ] Timeframe dropdown works
  - [ ] Notes field accepts text

### **Reorder Submission**
- [ ] Fill all required fields:
  - Quantity: "25"
  - Urgency: "Normal"
  - Timeframe: "1-2 weeks"
  - Your Name: "TestUser"
  - Notes: "Test reorder request"
- [ ] Click "Submit" → Success message
- [ ] **Check Slack** → Should receive formatted reorder notification

---

## **6. 🔔 Alert & Notification Tests**

### **Manual Low Stock Alert**
- [ ] Click "Send Alert Now" button
- [ ] Success message appears
- [ ] **Check Slack** → Should receive low stock alert with:
  - [ ] List of low stock items
  - [ ] Clickable link to low stock page
  - [ ] Proper formatting

### **Low Stock Page**
- [ ] Click "View Low Stock Page" → Opens in new tab
- [ ] Shows filtered view of only low stock items
- [ ] All low stock items visible

---

## **7. 🔍 Supplier Lookup Tests**

### **Supplier Search**
- [ ] Click "Supplier Lookup" button
- [ ] Dialog opens with search interface
- [ ] Search for "LM358N":
  - [ ] Results appear with Digi-Key data
  - [ ] Shows price, availability, datasheet links
  - [ ] Click result → Auto-fills Add Item form

### **Direct Digi-Key Integration**
- [ ] Test various part numbers:
  - [ ] "311-10KJRCT-ND" (resistor)
  - [ ] "1N4148" (diode)
  - [ ] "LM358N" (op-amp)
- [ ] Verify each returns proper data

---

## **8. ⚙️ Settings & Admin Tests**

### **Settings Dialog**
- [ ] Click "Settings" → Dialog opens
- [ ] Change default reorder point → Save → Applies to new items
- [ ] Toggle Slack notifications → Save → Setting persists

### **Database Sync**
- [ ] Click "Sync to Database" → Success message
- [ ] Refresh page → Data persists

### **Excel Export**
- [ ] Click "Download Excel" → File downloads
- [ ] Open file → Contains all inventory data with proper columns

---

## **9. 🐛 Debug & Advanced Tests**

### **Debug Pages**
- [ ] Visit `/debug-cron` → Manual alert testing works
- [ ] Visit `/low-stock` → Shows filtered low stock view
- [ ] Visit `/reorder-status` → Shows reorder requests

### **Error Handling**
- [ ] Try invalid part numbers in auto-lookup
- [ ] Try submitting forms with missing required fields
- [ ] Check console for any JavaScript errors

---

## **10. 📱 Responsive & Performance Tests**

### **Mobile/Tablet View**
- [ ] Resize browser → Layout adapts
- [ ] Touch interactions work on mobile
- [ ] Dialogs fit on smaller screens

### **Performance**
- [ ] Large inventory loads quickly
- [ ] Search/filter responses are fast
- [ ] No memory leaks during extended use

---

## **🚨 Expected Results Summary**

### **Should Work:**
- ✅ Auto-populate from Digi-Key
- ✅ Slack notifications for alerts and reorders
- ✅ Real-time duplicate checking
- ✅ Comprehensive reorder dialogs
- ✅ Excel export functionality
- ✅ Database persistence

### **Known Issues to Watch For:**
- ⚠️ Some Digi-Key parts may not have manufacturer part numbers
- ⚠️ Slack notifications require proper webhook configuration
- ⚠️ Auto-lookup requires valid Digi-Key API credentials

---

## **📝 Test Results Template**

```
TESTING COMPLETED: [DATE]
TESTER: [YOUR NAME]

✅ PASSED TESTS:
- [ ] Dashboard loads correctly
- [ ] Add item functionality
- [ ] Auto-populate from Digi-Key
- [ ] Reorder system with Slack
- [ ] Search and filtering
- [ ] Settings and sync

❌ FAILED TESTS:
- [ ] [List any failures here]

🐛 ISSUES FOUND:
- [ ] [Describe any bugs or problems]

📊 OVERALL SCORE: ___/10
```

---

**💡 Pro Tips:**
- Test with different browsers (Chrome, Firefox, Safari)
- Test with network throttling to simulate slow connections
- Keep browser console open to catch any JavaScript errors
- Test both desktop and mobile views
- Verify all Slack notifications are properly formatted
