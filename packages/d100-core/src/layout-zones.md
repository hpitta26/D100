# D100 Layout Zones

## Standardized Layout System

The D100 framework provides predefined layout zones without prescribing what goes in them. Developers have complete freedom to assign any UI elements to any zone based on their game's needs.

## Available Zones

### Board-Adjacent Zones
These zones are **glued to the board** and maintain consistent relationships:

- **`board.center`** - Main game board area
- **`board.top`** - Same width as board, positioned above it
- **`board.bottom`** - Same width as board, positioned below it  
- **`board.left`** - Same height as board, positioned left of it
- **`board.right`** - Same height as board, positioned right of it

### Corner Zones
Fixed-size zones at the corners of the board layout:

- **`corner.top-left`**, **`corner.top-right`**, **`corner.bottom-left`**, **`corner.bottom-right`**

### Footer Zones
A customizable footer with three sections for controls and status:

- **`footer.left`** - Left section of footer
- **`footer.center`** - Center section of footer  
- **`footer.right`** - Right section of footer

### Floating Zone
- **`floating`** - Absolute positioned overlays with custom coordinates

## Usage Example

```typescript
export const gameLayout: GameLayoutConfig = {
  board: {
    size: 400,
    aspectRatio: 1.0,
  },
  
  zoneSizes: {
    "board.top": 100,
    "board.bottom": 80,
    "board.left": 140,
    "board.right": 140,
    "footer": 80,
  },
  
  elements: {
    // Assign any element to any zone - complete freedom
    "board": { zone: "board.center" },
    "player-0": { zone: "board.bottom", order: 1 },
    "player-1": { zone: "board.left", order: 1 },
    "community-cards": { zone: "board.top", order: 1 },
    "game-controls": { zone: "footer.right", order: 1 },
    "game-status": { zone: "footer.center", order: 1 },
    "pot": { 
      zone: "floating", 
      coordinates: { x: "50%", y: "40%" } 
    },
  },
};
```

## Design Philosophy

1. **Zone-First**: Provide consistent zones, let developers decide what goes where
2. **No Assumptions**: Framework doesn't assume what "players" or "controls" are
3. **Predictable**: Zones always behave the same way across all games
4. **Customizable**: Override zone sizes when needed for specific layouts
5. **Simple**: Just assign elements to zones - no complex positioning math
