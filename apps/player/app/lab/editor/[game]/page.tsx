"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { FaDiceD20 } from "react-icons/fa";
import { IoArrowBackOutline } from "react-icons/io5";
import { LuPanelLeftClose, LuPanelLeftOpen, LuChevronDown, LuChevronRight, LuEye, LuEyeOff } from "react-icons/lu";
import { HiOutlineVariable, HiOutlineCursorClick } from "react-icons/hi";

import * as TTT from "../../../../../../packages/d100-games/src/tictactoe";
import * as C4 from "../../../../../../packages/d100-games/src/connect4";
import * as POKER from "../../../../../../packages/d100-games/src/poker-nlh";

import { GameDefinition, applyMove, endTurn, getControls } from "../../../../../../packages/d100-core/src/runtime";
import { GameLayoutConfig, LayoutZone, GameState, BoardZone, StackZone, Zone } from "../../../../../../packages/d100-core/src/object-types";

type GameKey = "tictactoe" | "connect4" | "poker";

// Action types for UI elements
type ActionType = "boolean" | "number" | "text" | "select";

interface ElementAction {
  id: string;
  label: string;
  type: ActionType;
  defaultValue?: any;
  options?: string[]; // for select type
  min?: number; // for number type
  max?: number; // for number type
  step?: number; // for number type
}

interface ElementDefinition {
  id: string;
  label: string;
  description?: string;
  actions: ElementAction[];
}

// GameBox Element Categories - the four essential types you mentioned
type GameBoxElementCategory = "board" | "players" | "actions" | "metadata";

interface GameBoxElement {
  id: string;
  category: GameBoxElementCategory;
  type: string;
  source: "gamebox" | "layout" | "derived";
  data?: any;
}

// Extract all GameBox elements and categorize them
const extractGameBoxElements = (gameDef: GameDefinition, sampleState: GameState | null): GameBoxElement[] => {
  const elements: GameBoxElement[] = [];
  
  if (!sampleState) return elements;

  // 1. BOARD elements - from GameBox boards and zones
  const boardZones = Object.values(sampleState.zones).filter(z => z.kind === "board");
  boardZones.forEach(zone => {
    elements.push({
      id: zone.id,
      category: "board",
      type: "board",
      source: "gamebox",
      data: zone
    });
  });

  // 2. PLAYERS elements - from GameBox players
  Object.values(sampleState.players).forEach(player => {
    elements.push({
      id: `player-${player.id}`,
      category: "players", 
      type: "player",
      source: "gamebox",
      data: player
    });
  });

  // 3. ACTIONS elements - from GameDefinition controls
  if (gameDef.controls && sampleState.ctx.currentPlayer) {
    const controls = gameDef.controls(sampleState, sampleState.ctx.currentPlayer);
    controls.forEach(control => {
      elements.push({
        id: control.id,
        category: "actions",
        type: "control",
        source: "gamebox", 
        data: control
      });
    });
  }

  // Add generic actions container if no specific controls
  if (!gameDef.controls) {
    elements.push({
      id: "player-actions",
      category: "actions",
      type: "action-container",
      source: "derived"
    });
  }

  // 4. METADATA elements - from game context and settings
  elements.push({
    id: "game-status",
    category: "metadata",
    type: "status",
    source: "derived",
    data: { 
      currentPlayer: sampleState.ctx.currentPlayer,
      phase: sampleState.ctx.phase,
      turn: sampleState.ctx.turn
    }
  });

  elements.push({
    id: "game-info",
    category: "metadata", 
    type: "info",
    source: "derived",
    data: {
      name: gameDef.settings.name,
      players: sampleState.ctx.players,
      id: gameDef.settings.id
    }
  });

  // Add other zones as metadata (decks, stacks, etc.)
  const otherZones = Object.values(sampleState.zones).filter(z => z.kind !== "board");
  otherZones.forEach(zone => {
    elements.push({
      id: zone.id,
      category: "metadata",
      type: zone.kind,
      source: "gamebox",
      data: zone
    });
  });

  // Add dice if present
  if (Object.keys(sampleState.dice).length > 0) {
    elements.push({
      id: "dice-container",
      category: "metadata",
      type: "dice",
      source: "gamebox",
      data: sampleState.dice
    });
  }

  return elements;
};

// Generic actions based on element type
const getGenericActions = (elementId: string, elementType: string): ElementAction[] => {
  const baseActions: ElementAction[] = [
    { id: "visible", label: "Visible", type: "boolean", defaultValue: true },
    { id: "opacity", label: "Opacity", type: "number", defaultValue: 1, min: 0, max: 1, step: 0.1 },
  ];

  switch (elementType) {
    case "player":
      return [
        ...baseActions,
        { id: "show_name", label: "Show Name", type: "boolean", defaultValue: true },
        { id: "show_chips", label: "Show Chips", type: "boolean", defaultValue: true },
        { id: "compact_view", label: "Compact View", type: "boolean", defaultValue: false },
      ];
    
    case "board":
      return [
        ...baseActions,
        { id: "show_grid", label: "Show Grid", type: "boolean", defaultValue: false },
        { id: "highlight_moves", label: "Highlight Valid Moves", type: "boolean", defaultValue: true },
        { id: "animation_speed", label: "Animation Speed", type: "number", defaultValue: 300, min: 0, max: 1000, step: 50 },
      ];
    
    case "control":
      return [
        ...baseActions,
        { id: "button_size", label: "Button Size", type: "select", defaultValue: "medium", options: ["small", "medium", "large"] },
        { id: "show_labels", label: "Show Labels", type: "boolean", defaultValue: true },
      ];
    
    case "display":
      return [
        ...baseActions,
        { id: "font_size", label: "Font Size", type: "select", defaultValue: "medium", options: ["small", "medium", "large", "xl"] },
        { id: "auto_update", label: "Auto Update", type: "boolean", defaultValue: true },
      ];
    
    default:
      return baseActions;
  }
};

// Game registry
const GAMES: Record<GameKey, GameDefinition> = {
  tictactoe: TTT.TicTacToe as any,
  connect4: C4.Connect4 as any,
  poker: POKER.PokerNLH as any,
};

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const gameKey = params.game as GameKey;
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedZone, setSelectedZone] = useState<LayoutZone | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<GameBoxElementCategory>>(new Set(["board", "players", "actions", "metadata"]));
  
  // Drag and drop state
  const [draggedElement, setDraggedElement] = useState<GameBoxElement | null>(null);
  const [dropZoneHighlight, setDropZoneHighlight] = useState<LayoutZone | null>(null);
  
  // Get game definition
  const gameDef = GAMES[gameKey];
  const [layout, setLayout] = useState<GameLayoutConfig | null>(gameDef?.layout || null);
  
  // Layout planner state
  const [showFooter, setShowFooter] = useState(true);
  const [showRightbar, setShowRightbar] = useState(true);
  const [layoutAssignments, setLayoutAssignments] = useState<Record<string, { zone: LayoutZone; componentName?: string }>>(
    layout?.elements ? Object.fromEntries(
      Object.entries(layout.elements).map(([id, config]) => [id, { zone: config.zone }])
    ) : {}
  );
  
  // Create sample game state for rendering
  const [sampleState, setSampleState] = useState<GameState | null>(() => {
    if (!gameDef) return null;
    try {
      if (gameKey === "tictactoe") {
        return TTT.createMatch(["p1", "p2"]);
      } else if (gameKey === "connect4") {
        return C4.createMatch(["p1", "p2"]);
      } else if (gameKey === "poker") {
        return POKER.createMatch(["p1", "p2", "p3", "p4"]);
      }
    } catch (error) {
      console.warn("Could not create sample state:", error);
    }
    return null;
  });
  
  // Extract GameBox elements
  const gameBoxElements = gameDef ? extractGameBoxElements(gameDef, sampleState) : [];

  // Function to render actual UI elements generically
  const renderUIElement = (elementId: string) => {
    // Find element in GameBox elements to get its type
    const gameBoxElement = gameBoxElements.find((el: GameBoxElement) => el.id === elementId);
    const elementType = gameBoxElement?.type || "other";

    if (!sampleState) {
      return (
        <div className="text-xs p-2 bg-white/20 border border-blue-400/30 rounded text-blue-800 dark:text-blue-200">
          {elementId} ({elementType})
        </div>
      );
    }

    // Render based on element type (generic approach)
    switch (elementType) {
      case "board":
        const zones = Object.values(sampleState.zones) as Zone[];
        const boards = zones.filter((z): z is BoardZone => z.kind === "board");
        if (boards[0]) {
          return <BoardView key={elementId} zone={boards[0]} state={sampleState} />;
        }
        return (
          <div className="text-center p-3 bg-amber-100/80 rounded border border-amber-400">
            <div className="text-sm font-bold text-amber-800">Game Board</div>
            <div className="text-xs text-amber-600">{elementId}</div>
          </div>
        );

      case "player":
        return (
          <div className="text-center p-2 bg-blue-100/80 rounded border border-blue-400">
            <div className="text-xs font-medium text-blue-800">{elementId}</div>
            <div className="text-xs text-blue-600 mt-1">Player Info</div>
          </div>
        );

      case "control":
      case "action-container":
        return (
          <div className="flex gap-1 p-2">
            <button className="px-2 py-1 bg-green-600 text-white rounded text-xs">Action</button>
            <button className="px-2 py-1 bg-red-600 text-white rounded text-xs">Action</button>
          </div>
        );

      case "status":
      case "info":
      case "stack":
      case "pile":
      case "dice":
        return (
          <div className="text-center p-2 bg-purple-100/80 rounded border border-purple-400">
            <div className="text-xs font-medium text-purple-800">{elementId}</div>
            <div className="text-xs text-purple-600">{elementType}</div>
          </div>
        );

      default:
        return (
          <div className="text-xs p-2 bg-gray-100/80 border border-gray-400 rounded text-gray-800">
            {elementId} ({elementType})
          </div>
        );
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleElementExpansion = (elementId: string) => {
    setExpandedElements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(elementId)) {
        newSet.delete(elementId);
      } else {
        newSet.add(elementId);
      }
      return newSet;
    });
  };

  const toggleCategoryExpansion = (category: GameBoxElementCategory) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, element: GameBoxElement) => {
    setDraggedElement(element);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', element.id);
  };

  const handleDragEnd = () => {
    setDraggedElement(null);
    setDropZoneHighlight(null);
  };

  const handleDragOver = (e: React.DragEvent, zone: LayoutZone) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropZoneHighlight(zone);
  };

  const handleDragLeave = () => {
    setDropZoneHighlight(null);
  };

  const handleDrop = (e: React.DragEvent, zone: LayoutZone) => {
    e.preventDefault();
    if (draggedElement) {
      setLayoutAssignments(prev => ({
        ...prev,
        [draggedElement.id]: { zone, componentName: `${draggedElement.type}Component` }
      }));
    }
    setDropZoneHighlight(null);
    setDraggedElement(null);
  };

  const removeElementFromZone = (elementId: string) => {
    setLayoutAssignments(prev => {
      const newAssignments = { ...prev };
      delete newAssignments[elementId];
      return newAssignments;
    });
  };

  if (!gameDef) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🎮</div>
          <div className="text-xl font-semibold mb-2">Game Not Found</div>
          <div className="text-zinc-500 mb-4">"{gameKey}" is not a valid game</div>
          <button 
            onClick={() => router.push('/lab')}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
          >
            <IoArrowBackOutline className="w-4 h-4" />
            Back to Lab
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 text-zinc-900 dark:from-zinc-950 dark:to-zinc-900 dark:text-zinc-100">
      {/* Collapsed Floating Header */}
      {sidebarCollapsed && (
        <div className="fixed top-0 left-0 z-50 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-white/90 p-3 backdrop-blur dark:bg-zinc-900/90">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
              <FaDiceD20 className="h-5.5 w-5.5" aria-label="D20 logo" />
            </div>
            <span className="text-lg font-semibold tracking-wide">Layout Editor</span>
            <LuPanelLeftOpen 
              className="w-5 h-5 text-gray-400 dark:text-gray-300 cursor-pointer hover:text-gray-600 dark:hover:text-gray-100" 
              onClick={toggleSidebar}
            />
          </div>
        </div>
      )}

      {/* Left Sidebar: Tools & Properties */}
      {!sidebarCollapsed && (
        <aside className="flex w-80 flex-col border-r border-black/5 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-zinc-900/80">
          {/* Sidebar Header */}
          <div className="border-b border-black/5 p-4 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                <FaDiceD20 className="h-5.5 w-5.5" aria-label="D20 logo" />
              </div>
              <span className="text-lg font-semibold tracking-wide">Layout Editor</span>
              <div className="flex-1"></div>
              <LuPanelLeftClose 
                className="w-5 h-5 text-gray-400 dark:text-gray-300 cursor-pointer hover:text-gray-600 dark:hover:text-gray-100" 
                onClick={toggleSidebar}
              />
            </div>
            <div className="mt-3 space-y-3">
              <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Editing: <span className="text-zinc-900 dark:text-zinc-100 capitalize">{gameKey}</span>
              </div>
              
              {/* Layout Controls */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Layout Options</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFooter(!showFooter)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                      showFooter ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {showFooter ? <LuEye className="w-3 h-3" /> : <LuEyeOff className="w-3 h-3" />}
                    Footer
                  </button>
                  <button
                    onClick={() => setShowRightbar(!showRightbar)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                      showRightbar ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {showRightbar ? <LuEye className="w-3 h-3" /> : <LuEyeOff className="w-3 h-3" />}
                    Rightbar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Element Library */}
          <div className="flex-1 overflow-hidden">
            <div className="p-4 h-full flex flex-col">
              <h2 className="text-sm font-semibold mb-3">Element Library</h2>
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-2">
                  <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">GameBox Elements</div>
                  
                  {/* Render by category (folder structure) */}
                  {(["board", "players", "actions", "metadata"] as GameBoxElementCategory[]).map(category => {
                    const categoryElements = gameBoxElements.filter(el => el.category === category);
                    const isCategoryExpanded = expandedCategories.has(category);
                    
                    if (categoryElements.length === 0) return null;

                    return (
                      <div key={category} className="space-y-1">
                        {/* Category Header (Folder) */}
                        <div
                          className="flex items-center p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg border cursor-pointer transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          onClick={() => toggleCategoryExpansion(category)}
                        >
                          <button className="p-0.5 mr-2">
                            {isCategoryExpanded ? (
                              <LuChevronDown className="w-4 h-4" />
                            ) : (
                              <LuChevronRight className="w-4 h-4" />
                            )}
                          </button>
                          
                          <div className="flex-1">
                            <div className="text-sm font-semibold capitalize">
                              📁 {category}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {categoryElements.length} element{categoryElements.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>

                        {/* Category Elements (when expanded) */}
                        {isCategoryExpanded && (
                          <div className="ml-4 space-y-1">
                            {categoryElements.map(element => {
                              const isExpanded = expandedElements.has(element.id);
                              const actions = getGenericActions(element.id, element.type);
                              const hasActions = actions.length > 0;
                              
                              // Check if element is assigned in layout planner
                              const assignment = layoutAssignments[element.id];
                              const isAssigned = !!assignment;

                              return (
                                <div key={element.id} className="space-y-1">
                                  {/* Element */}
                                  <div
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, element)}
                                    onDragEnd={handleDragEnd}
                                    className={`flex items-center p-2 rounded-lg border cursor-move transition-colors ${
                                      draggedElement?.id === element.id
                                        ? "border-blue-500 bg-blue-100 dark:bg-blue-900/40 opacity-50"
                                        : selectedElement === element.id
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                        : isAssigned
                                        ? "border-green-300 bg-green-50 dark:bg-green-900/20"
                                        : "border-orange-300 bg-orange-50 dark:bg-orange-900/20"
                                    } hover:shadow-md`}
                                    onClick={() => setSelectedElement(element.id)}
                                  >
                                    {/* Expand/Collapse Button */}
                                    {hasActions && (
                                      <button
                                        className="p-0.5 mr-2 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleElementExpansion(element.id);
                                        }}
                                      >
                                        {isExpanded ? (
                                          <LuChevronDown className="w-3 h-3" />
                                        ) : (
                                          <LuChevronRight className="w-3 h-3" />
                                        )}
                                      </button>
                                    )}
                                    
                                    {/* Element Info */}
                                    <div className="flex-1">
                                      <div className="text-sm font-medium">
                                        {element.id}
                                      </div>
                                      <div className="text-xs text-zinc-500">
                                        {element.type} • {element.source}
                                        {assignment && ` → ${assignment.zone}`}
                                      </div>
                                      {assignment?.componentName && (
                                        <div className="text-xs text-blue-600 dark:text-blue-400">
                                          Component: {assignment.componentName}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Status indicator and actions */}
                                    <div className="flex items-center gap-2">
                                      {isAssigned && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeElementFromZone(element.id);
                                          }}
                                          className="text-xs text-red-500 hover:text-red-700 px-1"
                                          title="Remove from layout"
                                        >
                                          ✕
                                        </button>
                                      )}
                                      <div className="text-xs">
                                        {isAssigned ? "✅" : "📦"}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Actions/Attributes (Expanded) */}
                                  {hasActions && isExpanded && (
                                    <div className="ml-6 space-y-1">
                                      {actions.map((action) => (
                                        <div
                                          key={action.id}
                                          className="flex items-center justify-between p-2 bg-black/5 dark:bg-white/5 rounded border border-black/5 dark:border-white/5"
                                        >
                                          <div className="flex items-center gap-2">
                                            {action.type === "boolean" ? (
                                              <HiOutlineCursorClick className="w-3 h-3 text-blue-500" />
                                            ) : (
                                              <HiOutlineVariable className="w-3 h-3 text-green-500" />
                                            )}
                                            <span className="text-xs font-medium">{action.label}</span>
                                          </div>
                                          
                                          {/* Action Control */}
                                          <div className="flex items-center gap-2">
                                            {action.type === "boolean" && (
                                              <label className="flex items-center cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  defaultChecked={action.defaultValue}
                                                  className="w-3 h-3 rounded border-gray-300"
                                                />
                                              </label>
                                            )}
                                            
                                            {action.type === "number" && (
                                              <div className="flex items-center gap-1">
                                                <input
                                                  type="number"
                                                  defaultValue={action.defaultValue}
                                                  min={action.min}
                                                  max={action.max}
                                                  step={action.step}
                                                  className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded dark:bg-zinc-800 dark:border-zinc-600"
                                                />
                                                {action.min !== undefined && action.max !== undefined && (
                                                  <input
                                                    type="range"
                                                    defaultValue={action.defaultValue}
                                                    min={action.min}
                                                    max={action.max}
                                                    step={action.step}
                                                    className="w-12"
                                                  />
                                                )}
                                              </div>
                                            )}
                                            
                                            {action.type === "select" && (
                                              <select
                                                defaultValue={action.defaultValue}
                                                className="px-1 py-0.5 text-xs border border-gray-300 rounded dark:bg-zinc-800 dark:border-zinc-600"
                                              >
                                                {action.options?.map((option) => (
                                                  <option key={option} value={option}>
                                                    {option}
                                                  </option>
                                                ))}
                                              </select>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Properties Panel */}
          {selectedElement && (
            <div className="border-t border-black/5 p-4 dark:border-white/10">
              <h3 className="text-sm font-semibold mb-3">Element Properties</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Element ID</label>
                  <div className="text-sm font-mono bg-zinc-100 dark:bg-zinc-800 p-2 rounded">{selectedElement}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Zone</label>
                  <select className="w-full mt-1 p-2 border border-black/10 rounded dark:border-white/10 dark:bg-zinc-800">
                    <option value="board.center">board.center</option>
                    <option value="board.top">board.top</option>
                    <option value="board.bottom">board.bottom</option>
                    <option value="board.left">board.left</option>
                    <option value="board.right">board.right</option>
                    <option value="rightbar.top">rightbar.top</option>
                    <option value="rightbar.center">rightbar.center</option>
                    <option value="rightbar.bottom">rightbar.bottom</option>
                    <option value="footer.left">footer.left</option>
                    <option value="footer.center">footer.center</option>
                    <option value="footer.right">footer.right</option>
                    <option value="floating">floating</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Back to Lab Button */}
          <div className="border-t border-black/5 p-4 dark:border-white/10">
            <button 
              onClick={() => router.push('/lab')}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-3 py-2 text-sm font-semibold transition-colors"
            >
              <IoArrowBackOutline className="w-5 h-5" /> Back to Lab
            </button>
          </div>
        </aside>
      )}

      {/* Main Content: Layout Canvas */}
      <main className="flex flex-1 overflow-hidden">
        {layout ? (
          <LayoutCanvas 
            layout={layout}
            layoutAssignments={layoutAssignments}
            showFooter={showFooter}
            showRightbar={showRightbar}
            sampleState={sampleState}
            gameDefinition={gameDef}
            renderUIElement={renderUIElement}
            selectedZone={selectedZone}
            onZoneSelect={setSelectedZone}
            selectedElement={selectedElement}
            onElementSelect={setSelectedElement}
            dropZoneHighlight={dropZoneHighlight}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />
        ) : (
          <div className="flex flex-1 h-full items-center justify-center">
            <div className="text-center text-zinc-500">
              <div className="text-4xl mb-4">📐</div>
              <div className="text-lg font-medium mb-2">No Layout Configuration</div>
              <div className="text-sm">This game uses the default layout system</div>
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Create Layout
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* --------------------
 * Layout Canvas Component
 * Visual editor for game layouts
 * -------------------- */
function LayoutCanvas({
  layout,
  layoutAssignments,
  showFooter,
  showRightbar,
  sampleState,
  gameDefinition,
  renderUIElement,
  selectedZone,
  onZoneSelect,
  selectedElement,
  onElementSelect,
  dropZoneHighlight,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  layout: GameLayoutConfig;
  layoutAssignments: Record<string, { zone: LayoutZone; componentName?: string }>;
  showFooter: boolean;
  showRightbar: boolean;
  sampleState: GameState | null;
  gameDefinition: GameDefinition;
  renderUIElement: (elementId: string) => React.ReactNode;
  selectedZone: LayoutZone | null;
  onZoneSelect: (zone: LayoutZone | null) => void;
  selectedElement: string | null;
  onElementSelect: (element: string | null) => void;
  dropZoneHighlight: LayoutZone | null;
  onDragOver: (e: React.DragEvent, zone: LayoutZone) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, zone: LayoutZone) => void;
}) {
  const boardSize = layout.board.size === "auto" ? 400 : layout.board.size;
  
  // Default zone sizes
  const topHeight = layout.zoneSizes?.["board.top"] || 100;
  const bottomHeight = layout.zoneSizes?.["board.bottom"] || 100;
  const leftWidth = layout.zoneSizes?.["board.left"] || 110;
  const rightWidth = layout.zoneSizes?.["board.right"] || 110;
  const footerHeight = layout.zoneSizes?.["footer"] || 100;
  const rightbarWidth = layout.zoneSizes?.["rightbar"] || 250;

  const renderZone = (zoneName: LayoutZone, className: string, style: React.CSSProperties, label: string) => {
    const isSelected = selectedZone === zoneName;
    const isDropTarget = dropZoneHighlight === zoneName;
    const assignedElements = Object.entries(layoutAssignments).filter(([_, assignment]) => assignment.zone === zoneName);
    
    return (
      <div
        className={`${className} ${isSelected ? 'ring-2 ring-blue-400' : ''} ${
          isDropTarget ? 'ring-2 ring-green-400 bg-green-100/50' : ''
        } cursor-pointer transition-all hover:bg-blue-500/20 relative`}
        style={style}
        onClick={() => onZoneSelect(zoneName)}
        onDragOver={(e) => onDragOver(e, zoneName)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, zoneName)}
      >
        <div className="text-xs font-medium text-center mb-2 text-blue-800 dark:text-blue-200">{label}</div>
        
        {/* Drop zone indicator */}
        {isDropTarget && (
          <div className="absolute inset-0 border-2 border-dashed border-green-400 bg-green-100/20 flex items-center justify-center">
            <div className="text-green-600 font-medium">Drop here</div>
          </div>
        )}
        
        {/* Assigned elements */}
        {assignedElements.map(([elementId, assignment]) => (
          <div
            key={elementId}
            className={`mb-2 cursor-pointer transition-all p-2 border-2 border-dashed border-blue-300 bg-blue-50/50 rounded ${
              selectedElement === elementId
                ? 'ring-2 ring-blue-400 ring-opacity-60'
                : 'hover:ring-1 hover:ring-blue-300'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onElementSelect(elementId);
            }}
          >
            <div className="text-xs font-medium text-blue-700 mb-1">{elementId}</div>
            <div className="text-xs text-blue-600">Component: {assignment.componentName}</div>
          </div>
        ))}
        
        {/* Empty state */}
        {assignedElements.length === 0 && !isDropTarget && (
          <div className="text-xs text-gray-400 text-center py-4 border-2 border-dashed border-gray-200 rounded">
            Drop elements here
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Board Layout Area */}
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="grid grid-cols-3 grid-rows-3 gap-2" style={{
            gridTemplateColumns: `${leftWidth}px ${boardSize}px ${rightWidth}px`,
            gridTemplateRows: `${topHeight}px ${boardSize}px ${bottomHeight}px`
          }}>
            {/* Row 1 */}
            {renderZone("corner.top-left", "bg-blue-500/10 border-2 border-blue-500/30 backdrop-blur-sm rounded-lg flex items-center justify-center p-1", {}, "corner.top-left")}
            {renderZone("board.top", "bg-blue-500/10 border-2 border-blue-500/30 backdrop-blur-sm rounded-lg flex items-center justify-center p-2", {}, "board.top")}
            {renderZone("corner.top-right", "bg-blue-500/10 border-2 border-blue-500/30 backdrop-blur-sm rounded-lg flex items-center justify-center p-1", {}, "corner.top-right")}

            {/* Row 2 */}
            {renderZone("board.left", "bg-blue-500/10 border-2 border-blue-500/30 backdrop-blur-sm rounded-lg flex items-center justify-center p-2", {}, "board.left")}
            {renderZone("board.center", "bg-blue-600/15 border-4 border-blue-600/40 backdrop-blur-sm rounded-2xl flex items-center justify-center p-4", {}, "board.center")}
            {renderZone("board.right", "bg-blue-500/10 border-2 border-blue-500/30 backdrop-blur-sm rounded-lg flex items-center justify-center p-2", {}, "board.right")}

            {/* Row 3 */}
            {renderZone("corner.bottom-left", "bg-blue-500/10 border-2 border-blue-500/30 backdrop-blur-sm rounded-lg flex items-center justify-center p-1", {}, "corner.bottom-left")}
            {renderZone("board.bottom", "bg-blue-500/10 border-2 border-blue-500/30 backdrop-blur-sm rounded-lg flex items-center justify-center p-2", {}, "board.bottom")}
            {renderZone("corner.bottom-right", "bg-blue-500/10 border-2 border-blue-500/30 backdrop-blur-sm rounded-lg flex items-center justify-center p-1", {}, "corner.bottom-right")}
          </div>
        </div>

        {/* Footer - Full width against page bottom */}
        {showFooter && (
          <div className="flex border-t border-black/10 dark:border-white/10" style={{ height: footerHeight }}>
            {renderZone("footer.left", "flex-1 bg-blue-500/10 border-r border-blue-500/30 backdrop-blur-sm flex flex-col items-center justify-center p-2", {}, "footer.left")}
            {renderZone("footer.center", "flex-1 bg-blue-500/10 border-r border-blue-500/30 backdrop-blur-sm flex flex-col items-center justify-center p-2", {}, "footer.center")}
            {renderZone("footer.right", "flex-1 bg-blue-500/10 backdrop-blur-sm flex flex-col items-center justify-center p-2", {}, "footer.right")}
          </div>
        )}
      </div>

      {/* Right sidebar - Full height against page edge */}
      {showRightbar && (
        <div className="flex flex-col border-l border-black/10 dark:border-white/10" style={{ width: rightbarWidth }}>
          {renderZone("rightbar.top", "bg-blue-500/10 border-b border-blue-500/30 backdrop-blur-sm flex flex-col items-center justify-center p-4", {
            minHeight: "120px"
          }, "rightbar.top")}
          
          {renderZone("rightbar.center", "flex-1 bg-blue-500/10 border-b border-blue-500/30 backdrop-blur-sm flex flex-col items-center justify-center p-4", {}, "rightbar.center")}
          
          {renderZone("rightbar.bottom", "bg-blue-500/10 backdrop-blur-sm flex flex-col items-center justify-center p-4", {
            minHeight: "120px"
          }, "rightbar.bottom")}
        </div>
      )}
    </>
  );
}

/* --------------------
 * BoardView Component
 * Renders a game board
 * -------------------- */
function BoardView({ zone, state }: { zone: BoardZone; state: GameState }) {
  const rows = zone.rows;
  const cols = zone.cols;

  return (
    <div className="flex flex-col items-center justify-center">
      <div 
        className="grid gap-1 p-2 bg-white/50 rounded border border-gray-300"
        style={{ 
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`
        }}
      >
        {Array.from({ length: rows * cols }).map((_, idx) => {
          const pid = zone.cells[idx];
          const piece = pid ? state.pieces[pid] : undefined;
          
          const content = piece 
            ? (piece as any).symbol || piece.kind || "●"
            : "·";

          return (
            <button
              key={idx}
              className="w-8 h-8 flex items-center justify-center text-sm font-mono bg-white/70 hover:bg-white/90 border border-gray-200 rounded transition-colors"
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
