import { GameLayoutConfig } from "../../../d100-core/src/object-types";

export const pokerLayout: GameLayoutConfig = {
  // Board configuration - poker table
  board: {
    size: 400,
    aspectRatio: 1.6, // Oval poker table
  },


  // Simple element to zone mapping
  elements: {
    // Main game board
    "board": {
      zone: "board.center",
    },

    // Community cards
    "community-cards": {
      zone: "board.top",
      order: 1,
    },

    // Players positioned around the table
    "player-0": {
      zone: "board.bottom",
      order: 1,
    },

    "player-1": {
      zone: "board.left", 
      order: 1,
    },

    "player-2": {
      zone: "board.top",
      order: 2,
    },

    "player-3": {
      zone: "board.right",
      order: 1,
    },

    // Pot display (floating in center)
    "pot": {
      zone: "floating",
      coordinates: {
        x: "50%",
        y: "40%",
      },
    },

    // Game info (corner)
    "game-info": {
      zone: "corner.top-right",
    },

    // Action controls in footer
    "actions": {
      zone: "footer.right",
      order: 1,
    },

    // Game status in footer center
    "game-status": {
      zone: "footer.center",
      order: 1,
    },

    // Right sidebar elements
    "blind-levels": {
      zone: "rightbar.top",
      order: 1,
    },
  },
};
