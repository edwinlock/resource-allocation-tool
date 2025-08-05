# Resource Allocation Tool

A Progressive Web App (PWA) for visualizing educational resource allocation scenarios and their impact on earnings outcomes.

## Project Overview

This is a client-side web application built with vanilla HTML, CSS, and JavaScript that simulates resource allocation between two entities (children) across different scenarios. The tool provides real-time feedback on how resource distribution affects earnings calculations.

## Technical Architecture

### Core Technologies
- **HTML5** - Semantic markup with PWA meta tags
- **CSS3** - Modern styling with CSS Grid and Flexbox
- **Vanilla JavaScript** - ES6+ features, no frameworks
- **Service Worker** - Offline functionality and caching
- **Web App Manifest** - PWA installation and behavior

### File Structure
```
├── index.html          # Main application HTML
├── script.js           # Application logic and calculations
├── styles.css          # Styling and responsive design
├── sw.js              # Service worker for offline functionality
├── manifest.json      # PWA configuration
└── DEPLOY.md          # Deployment instructions
```

## Application Features

### Resource Allocation System
- **Interactive Slider**: Allocates 15 resources between two children
- **Real-time Updates**: Live calculation of earnings based on allocation
- **Scenario Selection**: Eight different calculation models
- **Performance Metrics**: Fixed `performance' values with variable earnings

### Scenario Types
Each scenario has distinct parameters affecting earnings calculation:

- **Additive Linear**: Linear earnings with additive human capital production function
- **Additive Convex**: Convex (^2) earnings with additive human capital production function
- **Cobb-Douglas Linear**: Linear earnings with Cobb-Douglas (log form) human capital production function
- **Cobb-Douglas Convex**: Convex (^2) earnings with Cobb-Douglas (log form) human capital production function
- **CES -2 Linear**: Linear earnings with Constant Elasticity of Substitution (CES, sigma -2) human capital production function
- **CES -2 Convex**: Convex (^2) earnings with Constant Elasticity of Substitution (CES, sigma -2) human capital production function
- **CES -3 Linear**: Linear earnings with Constant Elasticity of Substitution (CES, sigma -3) human capital production function
- **CES -3 Convex**: Convex (^2) earnings with Constant Elasticity of Substitution (CES, sigma -4) human capital production function



### Calculation Engine
Located in `script.js`, the earnings calculation uses:
```javascript
childPerformance * scenario.earningsMultiplier + 
(allocation * scenario.performanceMultiplier * 10) + 
(allocation > scenario.diminishingPoint ? 
    (allocation - scenario.diminishingPoint) * scenario.diminishingRate * 50 : 0)
```

## PWA Implementation

### Service Worker (`sw.js`)
- **Cache Strategy**: Cache-first with network fallback
- **Cached Resources**: All static assets (HTML, CSS, JS, manifest)
- **Cache Management**: Version-based cache invalidation
- **Offline Support**: Full functionality when offline

### Manifest Configuration
- **App Identity**: Name, icons, theme colors
- **Display Mode**: Standalone (native app-like)
- **Start URL**: `/resource-allocation-tool/` (GitHub Pages path)
- **Icons**: SVG-based icons in multiple sizes (192x192, 512x512)
- **Orientation**: Portrait-primary for mobile

### iOS PWA Support
- Apple-specific meta tags for iOS Safari
- Apple Touch Icons in base64 SVG format
- Status bar styling and app title configuration

## Styling Architecture

### CSS Structure
- **System Fonts**: Apple system fonts with fallbacks
- **Responsive Design**: Mobile-first approach with media queries
- **Color Scheme**: Bootstrap-inspired color palette
- **Grid Layout**: CSS Grid for metrics display
- **Component Styling**: Card-based UI components

### Visual Design
- **Theme Colors**: Primary blue (#007bff) with semantic colors
- **Typography**: Modern sans-serif font stack
- **Spacing**: Consistent padding and margin system
- **Shadows**: Subtle box shadows for depth

## Development Guidelines

### Code Organization
- **Constants**: Fixed values defined at top of `script.js`
- **Configuration**: Scenario parameters in `SCENARIOS` object
- **Event Handling**: Centralized event listener setup
- **DOM Manipulation**: Direct DOM updates for performance

### Performance Considerations
- **Vanilla JS**: No framework overhead
- **Efficient Calculations**: Real-time updates without lag
- **Minimal Dependencies**: Self-contained application
- **Caching Strategy**: Aggressive caching for offline use

### Browser Compatibility
- **Modern Browsers**: ES6+ features (const, arrow functions, template literals)
- **PWA Support**: Service Worker and manifest support required
- **Mobile Optimization**: Touch-friendly interface
- **Responsive Design**: Works on all screen sizes

## Customization Points

### Adding New Scenarios
1. Add scenario configuration to `SCENARIOS` object in `script.js`
2. Update dropdown options in `index.html`
3. Ensure calculation parameters are properly defined

### Modifying Calculations
- Edit `calculateEarnings()` function in `script.js`
- Adjust scenario parameters (multipliers, diminishing points)
- Update performance constants if needed

### Styling Changes
- Modify CSS custom properties for theme colors
- Update grid layouts in `.metrics-grid`
- Adjust responsive breakpoints as needed

### PWA Configuration
- Update manifest.json for app metadata
- Modify service worker caching strategy
- Change app icons and theme colors

## Testing Considerations

### Manual Testing
- Test slider functionality across all scenarios
- Verify calculation accuracy
- Check responsive design on multiple devices
- Test PWA installation and offline functionality

### Browser Testing
- Chrome/Chromium browsers (primary target)
- Safari (iOS PWA testing)
- Firefox (service worker compatibility)
- Edge (Windows PWA support)

## Future Enhancement Ideas

### Functionality
- Data persistence (localStorage)
- Export/import scenarios
- Graphical visualization of earnings curves
- Multiple resource types
- Historical allocation tracking

### Technical Improvements
- TypeScript conversion
- Build system integration
- Automated testing
- Performance monitoring
- Analytics integration

## Maintenance Notes

### Cache Management
- Update `CACHE_NAME` in `sw.js` when deploying changes
- Clear browser cache during development
- Monitor cache size and performance

### Performance Monitoring
- Check calculation performance with complex scenarios
- Monitor service worker registration
- Test offline functionality regularly
