# Reception Landing Page Design

## Overview
A calm, information-rich landing page for Reception AI SaaS featuring:
- Monochrome content-first aesthetic with material depth
- Warm off-white palette (`#fbfbf9`) with emerald green `#0b8f61` for AI/live status
- Inter for UI, JetBrains Mono for numeric displays

## Components to Integrate

### Ridgeline Dither Footer
A quiet, airy site footer with:
- Animated mountain ridges in ordered dither pattern
- Brand and link columns
- Social icons (X, Instagram, LinkedIn, GitHub, YouTube)
- Theme-aware (evergreen/night presets)

### Logo Burst
Hair-line tentacle burst animation for hero section:
- Dark/light mode aware
- Click to replay
- Can be overlaid with brand mark

## File Locations
- `/src/components/ui/ridgeline-dither-footer.tsx` - Footer component
- `/src/components/ui/logo-burst.tsx` - Animation component
- These are pure React components with no external dependencies beyond React

## Integration Strategy
The components are self-contained and will enhance the existing landing page design with:
1. Animated hero section using LogoBurst
2. Enhanced footer with Ridgeline Dither effect