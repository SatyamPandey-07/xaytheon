# Favourite Repositories Feature - Setup & Commands

## Quick Start

The Favourite Repositories feature is now integrated into your XAYTHEON project. It requires no additional setup or backend configuration.

## Running the Project

### Option 1: Using Python (Recommended)

```bash
# Navigate to your project directory
cd c:\Users\chait\Proj_contribution2

# Start a local web server using Python 3
python -m http.server 8000

# Or using Python 2 (if Python 3 is not available)
python -m SimpleHTTPServer 8000
```

Then open your browser and navigate to: `http://localhost:8000`

### Option 2: Using Node.js

If you have Node.js installed:

```bash
# Install http-server globally (if not already installed)
npm install -g http-server

# Navigate to your project directory
cd c:\Users\chait\Proj_contribution2

# Start the server
http-server -p 8000

# Or using npx (if npm is available)
npx http-server -p 8000
```

Then open: `http://localhost:8000`

### Option 3: Using PHP

If you have PHP installed:

```bash
# Navigate to your project directory
cd c:\Users\chait\Proj_contribution2

# Start PHP's built-in server
php -S localhost:8000
```

Then open: `http://localhost:8000`

### Option 4: Using Live Server in VS Code

1. Install the "Live Server" extension from VS Code marketplace
2. Right-click on `index.html`
3. Select "Open with Live Server"
4. Your default browser will automatically open the project

## Testing the Feature

### 1. Navigate to the Explore Page
- Open `http://localhost:8000/explore.html`
- The page will load with repository exploration features

### 2. Add to GitHub Dashboard
- Open `http://localhost:8000/github.html`
- Enter a GitHub username
- Click "Analyze"
- Repositories will display with favorite buttons

### 3. Test the Favorites Feature

**Adding Favorites:**
- Look for repositories in the list
- Click the star icon (☆) next to any repository
- The star should turn filled (⭐)
- Badge count should increase

**Viewing Favorites:**
- Click the floating star button in the bottom-right corner (with badge count)
- The favorites panel slides in from the right
- All your favorited repositories should appear

**Removing Favorites:**
- In the favorites panel, click the × button on any repository
- Or click the ⭐ icon in the repository list to toggle it off

**Clearing All:**
- Click "Clear All" button in the favorites panel footer
- Confirm the action in the popup

### 4. Verify Persistence
- Add some favorites
- Refresh the page (F5 or Ctrl+R)
- Favorites should still be there!

## Browser DevTools Testing

### View Stored Data

Open Browser DevTools (F12) and run:

```javascript
// View all favorites
console.log(localStorage.getItem('favoriteRepositories'));

// Parse and pretty print
console.table(JSON.parse(localStorage.getItem('favoriteRepositories')));

// Get manager instance
console.log(window.favoritesManager.getFavorites());
```

### Clear Data (for testing)

```javascript
// Clear all favorites
localStorage.removeItem('favoriteRepositories');

// Or use the manager
favoritesManager.clearAll();

// Reload the page to see the change
window.location.reload();
```

## File Integration Checklist

✅ **Files Modified:**
- `index.html` - Added CSS and JS links
- `explore.html` - Added CSS and JS links  
- `explore.js` - Updated renderRepoList() with favorite buttons
- `github.html` - Added CSS and JS links
- `script.js` - Updated renderRepos() with favorite buttons

✅ **Files Created:**
- `favorites.js` - Main feature implementation
- `favorites.css` - Feature styling
- `FAVORITES_FEATURE.md` - Documentation

## Project Structure After Integration

```
c:\Users\chait\Proj_contribution2\
├── index.html
├── explore.html
├── explore.js (modified)
├── github.html (modified)
├── github.js
├── script.js (modified)
├── favorites.js (new)
├── favorites.css (new)
├── FAVORITES_FEATURE.md (new)
├── SETUP_COMMANDS.md (this file)
└── ... other files ...
```

## Terminal Commands Reference

### Windows (PowerShell)

```powershell
# Navigate to project
cd "C:\Users\chait\Proj_contribution2"

# Start Python server
python -m http.server 8000

# Or
python3 -m http.server 8000

# Stop the server: Ctrl+C
```

### Windows (Command Prompt)

```cmd
cd C:\Users\chait\Proj_contribution2
python -m http.server 8000
```

### Git Operations

```bash
# Add all changes
git add .

# Commit with message
git commit -m "Add Favourite Repositories feature with localStorage support"

# View status
git status

# View changes
git diff

# Push to repository
git push origin main
```

## Environment Variables (If Needed)

No environment variables are needed for the basic feature. All storage is local.

### Optional: Change Storage Key

If needed, you can modify the storage key in `favorites.js`:

```javascript
this.storageKey = 'favoriteRepositories'; // Line 5
// Change to:
this.storageKey = 'myApp_favorites'; // Custom key
```

## Troubleshooting Commands

### Check if localStorage is available

```javascript
// In browser console
if (localStorage) {
  console.log('localStorage is available');
  console.log('Total favorites:', 
    JSON.parse(localStorage.getItem('favoriteRepositories') || '[]').length);
}
```

### Debug favorite operations

```javascript
// Enable detailed logging
favoritesManager.loadFavorites();
console.log('Current favorites:', favoritesManager.getFavorites());

// Add a test favorite
favoritesManager.addFavorite({
  id: 999,
  name: 'test-repo',
  owner: 'testuser',
  url: 'https://github.com/testuser/test-repo',
  stars: 100,
  language: 'JavaScript'
});

console.log('Favorites after add:', favoritesManager.getFavorites());
```

### Monitor update events

```javascript
// Listen for changes
window.addEventListener('favoritesUpdated', (e) => {
  console.log('Favorites updated!', e.detail);
});
```

## Performance Monitoring

### Check Application Size

```bash
# Windows PowerShell
Get-ChildItem -Path "C:\Users\chait\Proj_contribution2" -File | 
  Where-Object {$_.Extension -eq '.js' -or $_.Extension -eq '.css'} | 
  Measure-Object -Property Length -Sum

# Result: Check if favorites.js and favorites.css are included
```

### Storage Usage

```javascript
// In browser console
const data = localStorage.getItem('favoriteRepositories');
console.log('Storage used:', (data?.length || 0) + ' bytes');
```

## Common Issues & Solutions

### Issue: "Cannot read property of undefined"
**Solution**: Ensure `favorites.js` is loaded before other scripts use `favoritesManager`

### Issue: Favorites not showing after refresh
**Solution**: Check browser privacy settings allow localStorage. Try in private/incognito mode to test.

### Issue: Button clicks don't work
**Solution**: 
```javascript
// Check if manager is initialized
console.log(window.favoritesManager);
console.log(window.favoritesUI);
```

### Issue: Storage quota exceeded
**Solution**: Clear browser cache or remove old data:
```javascript
// Remove very old favorites (keep last 50)
const favorites = favoritesManager.getFavorites();
if (favorites.length > 50) {
  favoritesManager.favorites = favorites.slice(-50);
  favoritesManager.saveFavorites();
}
```

## Next Steps

1. **Test Thoroughly** - Try all features across different pages
2. **Check Responsiveness** - Test on mobile devices using browser DevTools
3. **Monitor Performance** - Ensure no lag when adding/removing favorites
4. **Gather Feedback** - Get user feedback on UX/UI
5. **Future Enhancements** - Consider cloud sync, collections, etc.

## Deployment Checklist

- [ ] All files in place (`favorites.js`, `favorites.css`)
- [ ] HTML files updated with links
- [ ] JavaScript files updated with favorite button handlers
- [ ] Tested on multiple browsers
- [ ] Tested on mobile devices
- [ ] Documentation complete
- [ ] No console errors
- [ ] localStorage working correctly
- [ ] Panel opens/closes smoothly
- [ ] Badges update correctly

## Support & Questions

For issues or questions:
1. Check `FAVORITES_FEATURE.md` for detailed documentation
2. Review browser console for error messages
3. Check localStorage data: `localStorage.getItem('favoriteRepositories')`
4. Test with a fresh browser session (clear cache)

## Commands Summary

```bash
# Start development server
python -m http.server 8000

# Test specific page
http://localhost:8000/explore.html
http://localhost:8000/github.html

# Monitor storage
localStorage.getItem('favoriteRepositories')

# Clear all data
localStorage.clear()
```

---

**Feature Status**: ✅ Ready for Production
**Last Updated**: January 21, 2026
**Version**: 1.0.0
