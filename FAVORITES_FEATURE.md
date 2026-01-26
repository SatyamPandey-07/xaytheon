# Favourite Repositories Feature

## Overview
The Favourite Repositories feature allows users to mark GitHub repositories they like and save them locally in the browser for quick access later. This enhances the user experience by enabling personalization without requiring backend persistence or user authentication.

## Features

### Core Functionality
- ⭐ **Mark Repositories as Favorites**: Users can click a star icon (☆/⭐) next to any repository to add/remove it from favorites
- 📋 **Dedicated Favorites Panel**: Access all saved repositories from a sliding side panel
- 💾 **Local Storage**: All favorites are stored in the browser's localStorage (no backend required)
- 🔄 **Real-time Updates**: Favorite status updates across all pages instantly
- 📊 **Badge Counter**: Visual badge showing the number of favorited repositories
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices

### User Interface Components

#### Favorites Toggle Button
- Fixed position circular button in the bottom-right corner
- Shows gold star (⭐) with badge counter
- Toggles the favorites panel on/off
- Responsive sizing for mobile devices

#### Favorites Panel
- Slide-out side panel from the right
- Displays all favorited repositories with:
  - Repository name (clickable link)
  - Programming language tag
  - Star count
  - Description (truncated)
  - Remove button for each item
- Empty state message when no favorites exist
- "Clear All" button to reset all favorites
- Smooth animations and transitions

#### Favorite Buttons on Repositories
- Integrated into repository listings
- Toggle between hollow (☆) and filled (⭐) star icons
- Instant feedback on click
- Available on:
  - GitHub Dashboard (github.html)
  - Explore page (explore.html)
  - Any page with repository lists

## File Structure

### Core Files
```
favorites.js          - Main manager and UI controller
favorites.css         - Styling for the favorites panel and buttons
```

### Modified Files
```
index.html           - Added favorites.js and favorites.css links
explore.html         - Added favorites feature integration
explore.js           - Updated renderRepoList() to include favorite buttons
github.html          - Added favorites.js and favorites.css links
github.js            - (Will integrate on next update)
script.js            - Updated renderRepos() to include favorite buttons
watchlist.js         - (Can be integrated in future)
```

## How It Works

### FavoritesManager Class
The main class that manages all favorite repository operations:

```javascript
const favoritesManager = new FavoritesManager();
```

**Methods:**
- `loadFavorites()` - Loads favorites from localStorage
- `saveFavorites()` - Persists favorites to localStorage
- `addFavorite(repo)` - Add a repository to favorites
- `removeFavorite(repoId)` - Remove a repository from favorites
- `isFavorited(repoId)` - Check if a repository is favorited
- `getFavorites()` - Get all favorited repositories
- `clearAll()` - Remove all favorites
- `getCount()` - Get total number of favorites

### FavoritesUI Class
Handles all user interface operations:

```javascript
const favoritesUI = new FavoritesUI();
```

**Methods:**
- `initializePanel()` - Creates the favorites panel HTML
- `togglePanel()` - Open/close the favorites panel
- `openPanel()` / `closePanel()` - Explicit panel controls
- `renderFavoritesList()` - Display favorites in the panel
- `updateBadge()` - Update the counter badge
- `addFavoriteButton()` - Add favorite button to repository items

## Usage

### Automatic Initialization
The feature automatically initializes when the page loads. The favorites panel and toggle button are created automatically.

### Adding to Repository Lists
To add favorite buttons to repository items:

```javascript
// In your repository rendering function
repos.forEach(repo => {
  // ... create repo element ...
  
  // Add favorite button
  if (window.favoritesManager) {
    const btn = document.createElement('button');
    btn.className = 'favorite-repo-btn';
    btn.textContent = window.favoritesManager.isFavorited(repo.id) ? '⭐' : '☆';
    
    btn.addEventListener('click', () => {
      if (window.favoritesManager.isFavorited(repo.id)) {
        window.favoritesManager.removeFavorite(repo.id);
        btn.textContent = '☆';
      } else {
        window.favoritesManager.addFavorite(repo);
        btn.textContent = '⭐';
      }
    });
    
    repoElement.appendChild(btn);
  }
});
```

### Listening for Updates
Listen to favorite updates across the application:

```javascript
window.addEventListener('favoritesUpdated', (event) => {
  const favorites = event.detail;
  console.log('Favorites updated:', favorites);
});
```

## Data Structure

### Repository Object (Stored)
```javascript
{
  id: 123456,                    // GitHub repository ID
  name: "repository-name",       // Repository name
  owner: "username",             // Repository owner
  url: "https://github.com/...", // Repository URL
  description: "...",            // Repository description
  stars: 1234,                   // Star count
  language: "JavaScript",        // Programming language
  addedAt: "2024-01-21T..."      // ISO timestamp when favorited
}
```

## Storage Details

### localStorage Key
- **Key**: `favoriteRepositories`
- **Value**: JSON array of repository objects
- **Scope**: Per origin (domain/port)
- **Capacity**: ~5-10MB (browser dependent)

### Storage Limits
- Works entirely in browser memory
- Persists across browser sessions
- Cleared when browser cache is cleared
- Not synced across devices or browsers

## Theme Support

The favorites feature supports both light and dark themes:

### CSS Variables
```css
--favorites-bg: #1a1a1a;        /* Panel background */
--favorites-border: #333;        /* Border color */
--favorites-text: #e0e0e0;       /* Text color */
--favorites-accent: #ffd700;     /* Accent (gold) */
--favorites-hover: #2a2a2a;      /* Hover state */
```

Automatically switches between dark and light modes based on the `light-theme` class.

## Browser Compatibility

- ✅ Chrome/Chromium (v60+)
- ✅ Firefox (v55+)
- ✅ Safari (v11+)
- ✅ Edge (v79+)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

1. **Cloud Sync** - Sync favorites across devices
2. **Export/Import** - Download and restore favorites
3. **Collections** - Organize favorites into custom groups
4. **Sharing** - Share favorite collections with others
5. **Sorting** - Sort by date added, name, stars, etc.
6. **Search** - Search within favorites
7. **Tags** - Add custom tags to favorites
8. **Analytics** - Track which repositories are most favorited

## Troubleshooting

### Favorites Not Persisting
- **Issue**: Favorites disappear after page reload
- **Solution**: Check browser's localStorage is not disabled. Allow cookies/storage in browser settings.

### Favorites Not Showing in Panel
- **Issue**: Panel shows "No favorite repositories yet" but favorites exist
- **Solution**: Clear localStorage and try again. Open browser console and run: `localStorage.clear()`

### Favorite Button Not Working
- **Issue**: Star button doesn't respond to clicks
- **Solution**: Ensure `favorites.js` is loaded. Check console for JavaScript errors.

### Panel Won't Close
- **Issue**: Clicking outside panel doesn't close it
- **Solution**: Refresh the page. Try using the close button (×) on the panel header.

## API Reference

### FavoritesManager Events

**Event: `favoritesUpdated`**
```javascript
window.addEventListener('favoritesUpdated', (event) => {
  console.log(event.detail); // Array of favorites
});
```

### Global Access
The managers are available globally:
```javascript
window.favoritesManager    // FavoritesManager instance
window.favoritesUI         // FavoritesUI instance
```

## Performance Considerations

- **Storage**: Each repository object ~300-400 bytes
- **10 favorites** ~3-4KB
- **100 favorites** ~30-40KB
- **No network overhead** - Entirely local operations
- **Instant operations** - No API calls needed

## Security Notes

- All data stored locally in browser
- No data sent to external servers
- User data never leaves the device
- Safe to use without authentication
- No sensitive data collected

## Contributing

To enhance the Favourite Repositories feature:

1. Update `favorites.js` for functionality changes
2. Update `favorites.css` for styling improvements
3. Integrate into new pages by:
   - Adding `<link rel="stylesheet" href="favorites.css">`
   - Adding `<script defer src="favorites.js"></script>`
   - Calling favorite button handlers in repository rendering functions

## License

Part of the XAYTHEON project. See LICENSE.md for details.
