'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDecorationStore } from '@/store/decorationStore';
import { DECORATIONS } from '@/types/decoration';
import { DecorationIcon } from '@/components/ui/DecorationIcon';

interface DecorationPlacementProps {
  scene: 'living' | 'garden';
  isOpen: boolean;
  onClose: () => void;
}

interface DragState {
  isDragging: boolean;
  decorationId: string | null;
  placedId: string | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface PreviewState {
  show: boolean;
  x: number;
  y: number;
  decorationId: string | null;
}

interface HistoryAction {
  type: 'place' | 'remove' | 'move';
  placedId?: string;
  decorationId?: string;
  x?: number;
  y?: number;
  prevX?: number;
  prevY?: number;
  scene?: 'living' | 'garden';
}

// Grid configuration
const GRID_SIZE = 20;
const MAX_HISTORY = 20;

/**
 * 装饰品放置组件
 * 
 * 功能:
 * - 拖拽放置装饰品
 * - 网格吸附
 * - 半透明预览
 * - 撤销/重做 (最多20步)
 * - 快捷键支持 (Ctrl+Z / Ctrl+Y)
 */
export default function DecorationPlacement({ scene, isOpen, onClose }: DecorationPlacementProps) {
  const { placedDecorations, ownedDecorations, placeDecoration, removeDecoration, updateDecorationPosition } = useDecorationStore();
  const [selectedDecoration, setSelectedDecoration] = useState<string | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  
  // Drag state
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    decorationId: null,
    placedId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });
  
  // Preview state
  const [previewState, setPreviewState] = useState<PreviewState>({
    show: false,
    x: 0,
    y: 0,
    decorationId: null,
  });
  
  // Undo/Redo history
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const sceneRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const dragElementRef = useRef<HTMLDivElement>(null);
  
  const scenePlaced = placedDecorations.filter(d => d.scene === scene);
  const availableDecorations = ownedDecorations.filter(d => d.quantity > 0);
  
  /**
   * Add action to history
   */
  const addToHistory = useCallback((action: HistoryAction) => {
    setHistory(prev => {
      // Remove any actions after current index (when doing new action after undo)
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(action);
      
      // Keep only last MAX_HISTORY actions
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
        return newHistory;
      }
      
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIndex]);
  
  /**
   * Undo last action
   */
  const undo = useCallback(() => {
    if (historyIndex < 0) return;
    
    const action = history[historyIndex];
    
    switch (action.type) {
      case 'place':
        // Remove the placed decoration
        if (action.placedId) {
          removeDecoration(action.placedId);
        }
        break;
        
      case 'remove':
        // Re-place the removed decoration
        if (action.decorationId && action.x !== undefined && action.y !== undefined && action.scene) {
          placeDecoration(action.decorationId, action.x, action.y, action.scene);
        }
        break;
        
      case 'move':
        // Move back to previous position
        if (action.placedId && action.prevX !== undefined && action.prevY !== undefined) {
          updateDecorationPosition(action.placedId, action.prevX, action.prevY);
        }
        break;
    }
    
    setHistoryIndex(prev => prev - 1);
  }, [history, historyIndex, removeDecoration, placeDecoration, updateDecorationPosition]);
  
  /**
   * Redo last undone action
   */
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    
    const action = history[historyIndex + 1];
    
    switch (action.type) {
      case 'place':
        // Re-place the decoration
        if (action.decorationId && action.x !== undefined && action.y !== undefined && action.scene) {
          placeDecoration(action.decorationId, action.x, action.y, action.scene);
        }
        break;
        
      case 'remove':
        // Remove again
        if (action.placedId) {
          removeDecoration(action.placedId);
        }
        break;
        
      case 'move':
        // Move to new position
        if (action.placedId && action.x !== undefined && action.y !== undefined) {
          updateDecorationPosition(action.placedId, action.x, action.y);
        }
        break;
    }
    
    setHistoryIndex(prev => prev + 1);
  }, [history, historyIndex, placeDecoration, removeDecoration, updateDecorationPosition]);
  
  /**
   * Keyboard shortcuts (Ctrl+Z / Ctrl+Y)
   */
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, undo, redo]);
  
  const snapToGrid = useCallback((value: number, containerSize: number): number => {
    const pixels = (value / 100) * containerSize;
    const snappedPixels = Math.round(pixels / GRID_SIZE) * GRID_SIZE;
    return (snappedPixels / containerSize) * 100;
  }, []);
  
  const getSnappedPosition = useCallback((x: number, y: number): { x: number; y: number } => {
    if (!sceneRef.current) return { x, y };
    
    const rect = sceneRef.current.getBoundingClientRect();
    const snappedX = snapToGrid(x, rect.width);
    const snappedY = snapToGrid(y, rect.height);
    
    return { x: snappedX, y: snappedY };
  }, [snapToGrid]);
  
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    if (!dragState.isDragging || !dragElementRef.current) return;
    
    const updatePosition = () => {
      if (dragElementRef.current) {
        dragElementRef.current.style.transform = `translate(${dragState.currentX}px, ${dragState.currentY}px)`;
      }
    };
    
    rafRef.current = requestAnimationFrame(updatePosition);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [dragState.isDragging, dragState.currentX, dragState.currentY]);
  
  /**
   * Update preview position during drag
   */
  useEffect(() => {
    if (!dragState.isDragging || !sceneRef.current) {
      setPreviewState({ show: false, x: 0, y: 0, decorationId: null });
      return;
    }
    
    const rect = sceneRef.current.getBoundingClientRect();
    const mouseX = dragState.startX + dragState.currentX;
    const mouseY = dragState.startY + dragState.currentY;
    
    // Check if mouse is over scene
    if (
      mouseX >= rect.left &&
      mouseX <= rect.right &&
      mouseY >= rect.top &&
      mouseY <= rect.bottom
    ) {
      const x = ((mouseX - rect.left) / rect.width) * 100;
      const y = ((mouseY - rect.top) / rect.height) * 100;
      const snapped = getSnappedPosition(x, y);
      
      setPreviewState({
        show: true,
        x: snapped.x,
        y: snapped.y,
        decorationId: dragState.decorationId,
      });
    } else {
      setPreviewState({ show: false, x: 0, y: 0, decorationId: null });
    }
  }, [dragState, getSnappedPosition]);
  
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!dragState.isDragging) return;
    
    setDragState(prev => ({
      ...prev,
      currentX: clientX - prev.startX,
      currentY: clientY - prev.startY,
    }));
  }, [dragState.isDragging]);
  
  const handleDragStart = useCallback((decorationId: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setDragState({
      isDragging: true,
      decorationId,
      placedId: null,
      startX: clientX,
      startY: clientY,
      currentX: 0,
      currentY: 0,
    });
    
    setSelectedDecoration(decorationId);
    setIsPlacing(false);
  }, []);
  
  const handlePlacedDragStart = useCallback((placedId: string, decorationId: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setDragState({
      isDragging: true,
      decorationId,
      placedId,
      startX: clientX,
      startY: clientY,
      currentX: 0,
      currentY: 0,
    });
  }, []);
  
  const handleDragEnd = useCallback(async (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragState.isDragging || !sceneRef.current) {
      setDragState(prev => ({ ...prev, isDragging: false }));
      return;
    }
    
    const clientX = 'touches' in e ? e.changedTouches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.changedTouches[0].clientY : e.clientY;
    
    const rect = sceneRef.current.getBoundingClientRect();
    
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      const snapped = getSnappedPosition(x, y);
      
      if (dragState.placedId) {
        // Moving existing decoration
        const placed = scenePlaced.find(p => p.id === dragState.placedId);
        if (placed) {
          await updateDecorationPosition(dragState.placedId, snapped.x, snapped.y);
          
          // Add to history
          addToHistory({
            type: 'move',
            placedId: dragState.placedId,
            x: snapped.x,
            y: snapped.y,
            prevX: placed.x,
            prevY: placed.y,
          });
        }
      } else if (dragState.decorationId) {
        // Placing new decoration
        const newPlaced = await placeDecoration(dragState.decorationId, snapped.x, snapped.y, scene);
        
        // Add to history
        if (newPlaced) {
          addToHistory({
            type: 'place',
            placedId: newPlaced.id,
            decorationId: dragState.decorationId,
            x: snapped.x,
            y: snapped.y,
            scene,
          });
        }
      }
    }
    
    setDragState({
      isDragging: false,
      decorationId: null,
      placedId: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });
    
    setSelectedDecoration(null);
    setIsPlacing(false);
  }, [dragState, placeDecoration, updateDecorationPosition, scene, getSnappedPosition, scenePlaced, addToHistory]);
  
  useEffect(() => {
    if (!dragState.isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      handleDragEnd(e as any);
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      handleDragEnd(e as any);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [dragState.isDragging, handleMove, handleDragEnd]);
  
  if (!isOpen) return null;
  
  const handlePlaceClick = async (x: number, y: number) => {
    if (!selectedDecoration || !isPlacing) return;
    
    const snapped = getSnappedPosition(x, y);
    const newPlaced = await placeDecoration(selectedDecoration, snapped.x, snapped.y, scene);
    
    // Add to history
    if (newPlaced) {
      addToHistory({
        type: 'place',
        placedId: newPlaced.id,
        decorationId: selectedDecoration,
        x: snapped.x,
        y: snapped.y,
        scene,
      });
    }
    
    setIsPlacing(false);
    setSelectedDecoration(null);
  };
  
  const handleRemove = async (placedId: string) => {
    const placed = scenePlaced.find(p => p.id === placedId);
    if (!placed) return;
    
    await removeDecoration(placedId);
    
    // Add to history
    addToHistory({
      type: 'remove',
      placedId,
      decorationId: placed.decorationId,
      x: placed.x,
      y: placed.y,
      scene: placed.scene,
    });
  };
  
  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;
  
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="pixel-panel w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b-2 border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-game-light pixel-text-shadow">
              🎨 装饰布置 - {scene === 'living' ? '客厅' : '庭院'}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {isPlacing ? '点击场景放置装饰品' : '拖拽装饰品到场景中'}
            </p>
          </div>
          
          {/* Undo/Redo buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={!canUndo}
              className={`pixel-btn text-sm px-3 py-1 ${
                canUndo ? 'pixel-btn-secondary hover:bg-slate-600' : 'opacity-50 cursor-not-allowed'
              }`}
              title="撤销 (Ctrl+Z)"
            >
              ↶ 撤销
            </button>
            
            <button
              onClick={redo}
              disabled={!canRedo}
              className={`pixel-btn text-sm px-3 py-1 ${
                canRedo ? 'pixel-btn-secondary hover:bg-slate-600' : 'opacity-50 cursor-not-allowed'
              }`}
              title="重做 (Ctrl+Y)"
            >
              ↷ 重做
            </button>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-game-light text-2xl ml-2"
            >
              ×
            </button>
          </div>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Available decorations */}
          <div className="w-64 border-r-2 border-slate-700 p-3 overflow-y-auto">
            <h3 className="text-sm font-bold text-gray-300 mb-2">可用装饰品</h3>
            
            {availableDecorations.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">
                暂无可用装饰品<br/>
                去商店购买吧！
              </p>
            ) : (
              <div className="space-y-2">
                {availableDecorations.map(owned => {
                  const decoration = DECORATIONS[owned.decorationId];
                  if (!decoration) return null;
                  
                  return (
                    <button
                      key={owned.decorationId}
                      onClick={() => {
                        setSelectedDecoration(owned.decorationId);
                        setIsPlacing(true);
                      }}
                      onMouseDown={(e) => handleDragStart(owned.decorationId, e)}
                      onTouchStart={(e) => handleDragStart(owned.decorationId, e)}
                      className={`w-full pixel-panel p-2 text-left transition-all cursor-move ${
                        selectedDecoration === owned.decorationId
                          ? 'bg-game-accent border-game-accent'
                          : 'hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <DecorationIcon
                          decorationId={decoration.id}
                          size={32}
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-game-light truncate">
                            {decoration.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            x{owned.quantity}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Right: Scene preview */}
          <div className="flex-1 p-4 overflow-auto">
            <div className="mb-2 flex justify-end">
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`pixel-btn text-xs px-3 py-1 ${
                  showGrid ? 'pixel-btn-primary' : 'pixel-btn-secondary'
                }`}
              >
                {showGrid ? '🔲 隐藏网格' : '⬜ 显示网格'}
              </button>
            </div>
            
            <div 
              ref={sceneRef}
              className="relative w-full h-full min-h-[400px] bg-gradient-to-b from-sky-300 to-green-300 rounded-lg border-4 border-slate-700 overflow-hidden"
            >
              {/* Grid overlay */}
              {showGrid && (
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                  }}
                />
              )}
              
              {/* Placement hint */}
              {isPlacing && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-game-accent text-white px-4 py-2 text-sm font-bold animate-bounce-in pixel-text-shadow rounded-lg">
                  点击场景放置装饰品
                </div>
              )}
              
              {/* Drag hint */}
              {dragState.isDragging && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-4 py-2 text-sm font-bold pixel-text-shadow rounded-lg">
                  拖拽到场景中放置装饰品
                </div>
              )}
              
              {/* Preview during drag */}
              {previewState.show && previewState.decorationId && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: `${previewState.x}%`,
                    top: `${previewState.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div className="opacity-60 animate-pulse">
                    <DecorationIcon
                      decorationId={previewState.decorationId}
                      size={48}
                    />
                  </div>
                </div>
              )}
              
              {/* Click area */}
              <div
                className="absolute inset-0 cursor-crosshair"
                onClick={(e) => {
                  if (!isPlacing) return;
                  
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  
                  handlePlaceClick(x, y);
                }}
              />
              
              {/* Placed decorations */}
              {scenePlaced.map(placed => {
                const decoration = DECORATIONS[placed.decorationId];
                if (!decoration) return null;
                
                const isBeingDragged = dragState.isDragging && dragState.placedId === placed.id;
                
                return (
                  <div
                    key={placed.id}
                    className={`absolute group transition-all duration-200 ${
                      isBeingDragged ? 'opacity-0' : 'opacity-100'
                    }`}
                    style={{
                      left: `${placed.x}%`,
                      top: `${placed.y}%`,
                      transform: 'translate(-50%, -50%)',
                      transition: isBeingDragged ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    <div 
                      className="cursor-move hover:scale-110 transition-transform"
                      onMouseDown={(e) => handlePlacedDragStart(placed.id, placed.decorationId, e)}
                      onTouchStart={(e) => handlePlacedDragStart(placed.id, placed.decorationId, e)}
                    >
                      <DecorationIcon decorationId={decoration.id} size={56} />
                    </div>
                    
                    <button
                      onClick={() => handleRemove(placed.id)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
            
            {/* Placed decorations list */}
            <div className="mt-4">
              <h3 className="text-sm font-bold text-gray-300 mb-2">
                已放置 ({scenePlaced.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {scenePlaced.map(placed => {
                  const decoration = DECORATIONS[placed.decorationId];
                  if (!decoration) return null;
                  
                  return (
                    <div
                      key={placed.id}
                      className="pixel-panel p-2 flex items-center gap-2"
                    >
                      <DecorationIcon decorationId={decoration.id} size={24} />
                      <span className="text-xs text-gray-300">{decoration.name}</span>
                      <button
                        onClick={() => handleRemove(placed.id)}
                        className="text-red-400 hover:text-red-300 text-xs ml-1"
                      >
                        移除
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="bg-slate-800 border-t-2 border-slate-700 p-3 flex justify-between items-center">
          <div className="text-xs text-gray-400">
            💡 提示：拖拽装饰品放置 | Ctrl+Z 撤销 | Ctrl+Y 重做
          </div>
          
          <button
            onClick={onClose}
            className="pixel-btn pixel-btn-primary px-4 py-2 text-sm"
          >
            完成布置
          </button>
        </div>
      </div>
      
      {/* Drag preview */}
      {dragState.isDragging && dragState.decorationId && (
        <div
          ref={dragElementRef}
          className="fixed pointer-events-none z-[10001]"
          style={{
            left: dragState.startX,
            top: dragState.startY,
            transform: `translate(${dragState.currentX}px, ${dragState.currentY}px)`,
            willChange: 'transform',
          }}
        >
          <div className="opacity-60 animate-pulse">
            <DecorationIcon decorationId={dragState.decorationId} size={56} />
          </div>
        </div>
      )}
    </div>
  );
}
