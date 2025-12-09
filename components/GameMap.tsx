/// <reference types="vite/client" />
import React, { useState, useRef, useEffect } from 'react';
import { TileData, Unit, Position, TerrainType, Faction, UnitType, Spell } from '../types';
import { getTilesInRange, getReachableTiles } from '../services/gameLogic';

const TILE_SIZE = 96; // px - SCALED UP
const VIEWPORT_WIDTH = 10; // tiles (Adjusted for larger tiles fitting 1920 but constrained)
const VIEWPORT_HEIGHT = 8; // tiles

interface CombatVisualState {
    shakingUnitId: string | null;
    dyingUnitIds: string[];
    attackerId: string | null;
    attackOffset: { x: number; y: number };
    attackTarget: Position | null; // Added for effects
    effectType?: string;
    castingUnitId?: string | null;
    cameraFocus?: Position | null;
}

interface GameMapProps {
    map: TileData[][];
    units: Unit[];
    selectedUnitId: string | null;
    reachableTiles: Position[];
    attackRange: Position[]; // Visual range
    actionTargets: Position[]; // Valid click targets
    onTileClick: (pos: Position) => void;
    onHover?: (pos: Position | null) => void;
    onRightClick?: () => void;
    combatState: CombatVisualState;
    interactionMode?: string;
    selectedSpell?: Spell | null;
}

export const GameMap: React.FC<GameMapProps> = ({
    map,
    units,
    selectedUnitId,
    reachableTiles,
    attackRange,
    actionTargets,
    onTileClick,
    onHover,
    onRightClick,
    combatState,

    interactionMode,
    selectedSpell
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [camera, setCamera] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1); // Zoom Level
    const lastHoverPos = useRef<Position | null>(null);

    // Drag Panning Refs
    const isMouseDownRef = useRef(false);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const camStartRef = useRef({ x: 0, y: 0 });
    const clickBlockerRef = useRef(false);

    // Loading State
    const [isLoading, setIsLoading] = useState(true);

    const width = map[0]?.length || 0;
    const height = map.length || 0;

    // Viewport Limits (Fixed Window)
    const viewportWidthPx = VIEWPORT_WIDTH * TILE_SIZE;
    const viewportHeightPx = VIEWPORT_HEIGHT * TILE_SIZE;

    // Max scroll is: TotalWorldSize - VisibleWorldSize
    // VisibleWorldSize = ViewportPx / Scale
    const maxScrollX = Math.max(0, (width * TILE_SIZE) - (viewportWidthPx / scale));
    const maxScrollY = Math.max(0, (height * TILE_SIZE) - (viewportHeightPx / scale));

    // Calculate Centering Offset
    const mapPixelWidth = width * TILE_SIZE * scale;
    const mapPixelHeight = height * TILE_SIZE * scale;
    const centeringOffsetX = mapPixelWidth < viewportWidthPx ? Math.floor((viewportWidthPx - mapPixelWidth) / 2) : 0;
    const centeringOffsetY = mapPixelHeight < viewportHeightPx ? Math.floor((viewportHeightPx - mapPixelHeight) / 2) : 0;

    // Assets
    const alaricSprite = useRef<HTMLImageElement | null>(null);
    const alaricWalkSprite = useRef<HTMLImageElement | null>(null);
    const archerSprite = useRef<HTMLImageElement | null>(null);
    const enemyGuardSprite = useRef<HTMLImageElement | null>(null);
    const enemyArcherSprite = useRef<HTMLImageElement | null>(null);
    const enemyCaptainSprite = useRef<HTMLImageElement | null>(null);
    const wizardSprite = useRef<HTMLImageElement | null>(null);
    const wizardCastingSprite = useRef<HTMLImageElement | null>(null);
    const dummySprite = useRef<HTMLImageElement | null>(null);
    const fireballSprite = useRef<HTMLImageElement | null>(null);

    // Load Sprites with Processing
    useEffect(() => {
        const processImage = async (filename: string, ref: React.MutableRefObject<HTMLImageElement | null>) => {
            const img = new Image();
            img.src = `${import.meta.env.BASE_URL}${filename}`;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = resolve; // Continue even if fail
            });

            // Create processing canvas
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // 1. Chroma Key (Assume Top-Left pixel is background)
            const rBg = data[0];
            const gBg = data[1];
            const bBg = data[2];
            const tol = 10;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];

                if (a === 0) continue;

                if (Math.abs(r - rBg) < tol && Math.abs(g - gBg) < tol && Math.abs(b - bBg) < tol) {
                    data[i + 3] = 0; // Transparent
                }
            }

            ctx.putImageData(imageData, 0, 0);

            // Create final image from canvas (No Cropping)
            const finalImg = new Image();
            finalImg.src = canvas.toDataURL();
            await new Promise((resolve) => { finalImg.onload = resolve; });
            ref.current = finalImg;
        };

        const loadDirect = async (filename: string, ref: React.MutableRefObject<HTMLImageElement | null>) => {
            const img = new Image();
            img.src = `${import.meta.env.BASE_URL}${filename}`;
            await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
            ref.current = img;
        };

        const loadAll = async () => {
            await Promise.all([
                processImage('alaric.png', alaricSprite),
                processImage('alaric_walk.png', alaricWalkSprite),
                processImage('archer.png', archerSprite),
                processImage('wizard.png', wizardSprite),
                loadDirect('enemy_guard.png', enemyGuardSprite),
                loadDirect('enemy_archer.png', enemyArcherSprite),
                loadDirect('enemy_captain.png', enemyCaptainSprite),
                loadDirect('dummy.png', dummySprite),
                loadDirect('fireball.png', fireballSprite)
                // wizard_casting.png (cutscene) loads on demand or we can preload it here too? 
                // The user specifically complained about "unit icons (idle_1)", so the main sprites are critical.
            ]);
            setIsLoading(false);
        };

        loadAll();
    }, []);

    // State for Animations
    const displayedHp = useRef<{ [id: string]: number }>({});
    const displayedPos = useRef<{ [id: string]: { x: number, y: number } }>({});

    // State for Hover Prediction
    const [hoverMoveTiles, setHoverMoveTiles] = useState<Position[]>([]);
    const [hoverAttackTiles, setHoverAttackTiles] = useState<Position[]>([]);

    // VFX Timing
    const effectStartTime = useRef<number>(0);
    // prevEffectType removed as we use lazy init


    // Camera Snap for Active Enemy & Spell Focus
    useEffect(() => {
        // Priority 1: Combat Focus (Spells)
        if (combatState.cameraFocus) {
            const targetWorldX = combatState.cameraFocus.x * TILE_SIZE + TILE_SIZE / 2;
            const targetWorldY = combatState.cameraFocus.y * TILE_SIZE + TILE_SIZE / 2;

            const viewW = VIEWPORT_WIDTH * TILE_SIZE;
            const viewH = VIEWPORT_HEIGHT * TILE_SIZE;

            const camX = targetWorldX - (viewW / (2 * scale));
            const camY = targetWorldY - (viewH / (2 * scale));

            setCamera({
                x: Math.round(Math.max(0, Math.min(camX, maxScrollX))),
                y: Math.round(Math.max(0, Math.min(camY, maxScrollY)))
            });
            return;
        }

        // Priority 2: Selected Enemy
        if (!selectedUnitId) return;
        const unit = units.find(u => u.id === selectedUnitId);

        // Only snap for enemies
        if (unit && unit.faction === Faction.ENEMY) {
            const targetWorldX = unit.position.x * TILE_SIZE + TILE_SIZE / 2;
            const targetWorldY = unit.position.y * TILE_SIZE + TILE_SIZE / 2;

            const viewW = VIEWPORT_WIDTH * TILE_SIZE;
            const viewH = VIEWPORT_HEIGHT * TILE_SIZE;

            // Center: WorldPos - (ViewSize/2)/Scale
            const camX = targetWorldX - (viewW / (2 * scale));
            const camY = targetWorldY - (viewH / (2 * scale));

            setCamera({
                x: Math.round(Math.max(0, Math.min(camX, maxScrollX))),
                y: Math.round(Math.max(0, Math.min(camY, maxScrollY)))
            });
        }
    }, [selectedUnitId, units, scale, maxScrollX, maxScrollY, combatState.cameraFocus]);

    // Cutscene Asset Loading
    // Cutscene Asset Loading
    const cutsceneSprite = useRef<HTMLImageElement | null>(null);
    useEffect(() => {
        if (combatState.castingUnitId) {
            const unit = units.find(u => u.id === combatState.castingUnitId);
            if (unit && unit.castingPortrait) {
                const img = new Image();
                img.src = `${import.meta.env.BASE_URL}${unit.castingPortrait}`;
                img.onload = () => { cutsceneSprite.current = img; };
            }
        } else {
            cutsceneSprite.current = null;
        }
    }, [combatState.castingUnitId, units]);

    // RENDER LOOP
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.imageSmoothingEnabled = false; // Pixel Art key!

        let animationFrameId: number;

        const render = () => {
            if (!ctx || !canvas) return;

            // Clear Background
            ctx.fillStyle = '#0c0a09'; // Very dark/black
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.save();

            // Apply Centering
            ctx.translate(centeringOffsetX, centeringOffsetY);

            // Apply Scale & Camera
            ctx.scale(scale, scale);
            ctx.translate(-camera.x, -camera.y);

            // 1. Draw Map
            map.forEach((row, y) => {
                row.forEach((tile, x) => {
                    const px = x * TILE_SIZE;
                    const py = y * TILE_SIZE;

                    if (tile.terrain === TerrainType.CLOSED) {
                        ctx.fillStyle = '#292524';
                        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                        ctx.strokeStyle = '#0c0a09';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
                        ctx.fillStyle = '#1c1917';
                        ctx.beginPath();
                        ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 12, 0, Math.PI * 2); // Scaled dot
                        ctx.fill();
                    } else {
                        ctx.fillStyle = '#064e3b';
                        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                        ctx.strokeStyle = '#022c22';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
                    }
                });
            });

            // 2. Highlights
            if (reachableTiles.length > 0) {
                ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
                ctx.strokeStyle = 'rgba(147, 197, 253, 0.8)';
                ctx.lineWidth = 4;
                reachableTiles.forEach(p => {
                    ctx.fillRect(p.x * TILE_SIZE, p.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    ctx.strokeRect(p.x * TILE_SIZE, p.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                });
            }
            if (attackRange.length > 0) {
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)'; // Unified with ActionTargets
                ctx.lineWidth = 4;
                attackRange.forEach(p => {
                    ctx.strokeRect(p.x * TILE_SIZE, p.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                });
            }

            // Enemy Hover Range (Red Dashed?) - Using same style as attackRange but maybe distinct?
            // User requested: "same kind of highlight as the attack indicator for players"
            // Hover: Blue Move Tiles
            if (hoverMoveTiles.length > 0) {
                ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
                ctx.strokeStyle = 'rgba(147, 197, 253, 0.6)';
                ctx.lineWidth = 4;
                hoverMoveTiles.forEach(p => {
                    ctx.fillRect(p.x * TILE_SIZE, p.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    ctx.strokeRect(p.x * TILE_SIZE, p.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                });
            }

            // Hover: Red Attack Tiles (Potential)
            if (hoverAttackTiles.length > 0) {
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
                ctx.lineWidth = 4;
                hoverAttackTiles.forEach(p => {
                    ctx.strokeRect(p.x * TILE_SIZE, p.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                });
            }

            if (actionTargets.length > 0) {
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
                ctx.lineWidth = 4;
                actionTargets.forEach(p => {
                    ctx.strokeRect(p.x * TILE_SIZE, p.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                });
            }

            // ... rest of render ...


            // Hover Box
            if (lastHoverPos.current) {
                const { x, y } = lastHoverPos.current;
                let isAOE = false;
                if (interactionMode === 'TARGETING_SPELL' && selectedSpell) {
                    const isHoverValid = actionTargets.some(p => p.x === x && p.y === y);
                    if (isHoverValid) {
                        ctx.fillStyle = 'rgba(168, 85, 247, 0.6)';
                        const radius = selectedSpell.radius;
                        for (let ry = -radius; ry <= radius; ry++) {
                            for (let rx = -radius; rx <= radius; rx++) {
                                if (Math.abs(rx) <= radius && Math.abs(ry) <= radius) {
                                    const tx = x + rx;
                                    const ty = y + ry;
                                    if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
                                        ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                                    }
                                }
                            }
                        }
                        isAOE = true;
                    }
                }
                if (!isAOE) {
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            }

            // 3. Draw Units
            units.forEach(unit => {
                if (combatState.dyingUnitIds.includes(unit.id)) {
                    ctx.globalAlpha = 0.5;
                }

                // HP Interpolation
                if (displayedHp.current[unit.id] === undefined) {
                    displayedHp.current[unit.id] = unit.hp;
                } else {
                    const diff = unit.hp - displayedHp.current[unit.id];
                    if (Math.abs(diff) > 0.01) {
                        displayedHp.current[unit.id] += diff * 0.1;
                    } else {
                        displayedHp.current[unit.id] = unit.hp;
                    }
                }

                // Pos Interpolation
                const targetX = unit.position.x * TILE_SIZE;
                const targetY = unit.position.y * TILE_SIZE;

                if (!displayedPos.current[unit.id]) {
                    displayedPos.current[unit.id] = { x: targetX, y: targetY };
                }

                const dx = targetX - displayedPos.current[unit.id].x;
                const dy = targetY - displayedPos.current[unit.id].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                const speed = 15; // Speed of movement

                let isMoving = false;
                if (dist > 1) {
                    isMoving = true;
                    const moveDist = Math.min(dist, speed);
                    const angle = Math.atan2(dy, dx);
                    displayedPos.current[unit.id].x += Math.cos(angle) * moveDist;
                    displayedPos.current[unit.id].y += Math.sin(angle) * moveDist;
                } else {
                    displayedPos.current[unit.id].x = targetX;
                    displayedPos.current[unit.id].y = targetY;
                }

                let drawX = displayedPos.current[unit.id].x;
                let drawY = displayedPos.current[unit.id].y;

                // Lunge Offset
                if (unit.id === combatState.attackerId && (combatState as any).attackTarget) {
                    const target = (combatState as any).attackTarget;
                    const lungeDx = (target.x - unit.position.x) * (TILE_SIZE * 0.5);
                    const lungeDy = (target.y - unit.position.y) * (TILE_SIZE * 0.5);
                    drawX += lungeDx;
                    drawY += lungeDy;
                }

                if (unit.id === combatState.shakingUnitId) {
                    drawX += (Math.random() * 8 - 4); // Scaled Shake
                    drawY += (Math.random() * 8 - 4);
                }

                // --- RENDER UNIT ---
                const padding = 4; // SCALED
                const innerSize = TILE_SIZE - padding * 2;
                const drawX_Inner = drawX + padding;
                const drawY_Inner = drawY + padding;

                // Combined HP & Name Bar (Bottom) - Defined early for layout
                const barHeight = 24;

                // Check Sprite
                const isAlaric = (unit.name === 'Sir Alaric' || unit.name === 'Alaric');
                const isArcher = (unit.type === UnitType.ARCHER && unit.faction === Faction.PLAYER);
                const isWizard = (unit.type === UnitType.WIZARD && unit.faction === Faction.PLAYER);

                // Determine if Walking: Actually moving OR (Selected AND Movement Phase AND Not Exhausted)
                // We check interactionMode to ensure we stop walking when in Action Phase (ACTION_SELECT/TARGETING)
                const isSelectedForMovement = (unit.id === selectedUnitId && interactionMode === 'MOVEMENT' && !unit.hasMoved);
                const shouldUseWalkAnim = isMoving || isSelectedForMovement;

                // Priority: Walking Sprint -> Idle Sprite (or fallback)
                let spriteToUse = null;
                if (isAlaric) {
                    if (shouldUseWalkAnim && alaricWalkSprite.current) {
                        spriteToUse = alaricWalkSprite.current;
                    } else if (alaricSprite.current) {
                        spriteToUse = alaricSprite.current;
                    }
                } else if (isArcher && archerSprite.current) {
                    spriteToUse = archerSprite.current;
                } else if (isWizard && wizardSprite.current) {
                    spriteToUse = wizardSprite.current;
                } else if (unit.type === UnitType.ARCHER && unit.faction === Faction.ENEMY && enemyArcherSprite.current) {
                    spriteToUse = enemyArcherSprite.current;
                } else if (unit.name === 'Captain' && enemyCaptainSprite.current) {
                    spriteToUse = enemyCaptainSprite.current;
                } else if (unit.name === 'Guard' && enemyGuardSprite.current) {
                    spriteToUse = enemyGuardSprite.current;
                } else if (unit.type === UnitType.DUMMY && dummySprite.current) {
                    spriteToUse = dummySprite.current;
                }

                if (spriteToUse) {
                    // Frame Logic
                    const now = Date.now();
                    // Faster animation for walking
                    const animSpeed = shouldUseWalkAnim ? 200 : 500;
                    // If exhausted and not moving, freeze on frame 0
                    const frame = (unit.hasMoved && !isMoving) ? 0 : Math.floor(now / animSpeed) % 2;

                    if (unit.hasMoved && !isMoving) {
                        ctx.filter = 'grayscale(100%) brightness(70%)';
                    }

                    const img = spriteToUse;

                    // Fixed Frame Logic (96x96 with Gap support)
                    const frameSize = 96;
                    // Detect frame count based on width (approximate for gap)
                    // Width = (Count * 96) + ((Count - 1) * 4)
                    // Count = (Width + 4) / 100
                    const frameCount = Math.round((img.width + 4) / 100);

                    let gap = 0;
                    if (frameCount > 1) {
                        gap = (img.width - (frameSize * frameCount)) / (frameCount - 1);
                    }

                    // Recalculate frame based on actual count
                    const animFrame = (unit.hasMoved && !isMoving) ? 0 : Math.floor(now / animSpeed) % frameCount;

                    // Source Rect
                    const sx = animFrame * (frameSize + gap);
                    const sy = 0;
                    const sw = frameSize;
                    const sh = img.height;

                    // Layout Logic: Fit ABOVE the bar
                    const availableHeight = innerSize - barHeight;

                    // Aspect Ratio Logic
                    const ratio = Math.min(innerSize / sw, availableHeight / sh);
                    const dstW = Math.floor(sw * ratio);
                    const dstH = Math.floor(sh * ratio);

                    // Center it horizontally
                    const dstX = Math.floor(drawX_Inner + (innerSize - dstW) / 2);
                    // Align to bottom of available space (just above bar)
                    const dstY = Math.floor(drawY_Inner + availableHeight - dstH);

                    ctx.save();
                    if (unit.facing === 'LEFT') {
                        // Flip horizontally around the center of the unit's box
                        ctx.translate(dstX + dstW / 2, dstY);
                        ctx.scale(-1, 1);
                        ctx.translate(-(dstX + dstW / 2), -dstY);
                    }

                    ctx.drawImage(
                        img,
                        sx, sy, sw, sh,
                        dstX, dstY, dstW, dstH
                    );

                    ctx.restore();

                    ctx.filter = 'none';

                    if (unit.id === selectedUnitId) {
                        ctx.strokeStyle = '#facc15';
                        ctx.lineWidth = 4;
                        ctx.strokeRect(drawX_Inner, drawY_Inner, innerSize, innerSize);
                    }
                } else {
                    // Card Fallback
                    ctx.fillStyle = unit.faction === Faction.PLAYER ? '#2563eb' : '#b91c1c';
                    if (unit.hasMoved) ctx.fillStyle = '#52525b';
                    ctx.fillRect(drawX_Inner, drawY_Inner, innerSize, innerSize);

                    if (unit.id === selectedUnitId) {
                        ctx.strokeStyle = '#facc15';
                        ctx.lineWidth = 4;
                        ctx.strokeRect(drawX_Inner, drawY_Inner, innerSize, innerSize);
                    }

                    // Symbol
                    // Center Y = (BarBottom + NameTop) / 2
                    const barHeightForCalc = 20;
                    const nameHeightForCalc = 20;
                    const nameYForCalc = drawY_Inner + innerSize - nameHeightForCalc;
                    const centerY = (drawY_Inner + barHeightForCalc + nameYForCalc) / 2;

                    ctx.font = 'bold 36px monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = 'white';
                    ctx.shadowColor = 'black';
                    ctx.shadowBlur = 3;
                    let symbol = '?';
                    if (unit.type === UnitType.ARCHER) symbol = 'A';
                    if (unit.type === UnitType.WIZARD) symbol = 'W';
                    if (unit.type === UnitType.MAGE) symbol = 'M';
                    ctx.fillText(symbol, drawX_Inner + innerSize / 2, centerY);
                    ctx.shadowBlur = 0;
                }

                const nameY = drawY_Inner + innerSize - barHeight;
                const hpPct = Math.max(0, displayedHp.current[unit.id] / unit.maxHp);

                // 1. Background (Missing Health - Dark Red)
                ctx.fillStyle = '#7f1d1d';
                ctx.fillRect(drawX_Inner, nameY, innerSize, barHeight);

                // 2. Foreground (Current Health - Green)
                ctx.fillStyle = '#16a34a';
                ctx.fillRect(drawX_Inner, nameY, innerSize * hpPct, barHeight);

                // 3. Text (Name overlay)
                ctx.font = 'bold 16px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'white';
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 4;
                ctx.fillText(unit.name, drawX_Inner + innerSize / 2, nameY + barHeight / 2);
                ctx.shadowBlur = 0;

                ctx.globalAlpha = 1.0;
            });

            // 4. VFX (Fireball)
            if (combatState.effectType === 'FIREBALL' && (combatState as any).attackTarget && fireballSprite.current) {
                if (effectStartTime.current === 0) {
                    effectStartTime.current = Date.now();
                }

                const target = (combatState as any).attackTarget;
                const tx = target.x * TILE_SIZE;
                const ty = target.y * TILE_SIZE;

                // Centered 3x3 Area
                const centerX = tx + TILE_SIZE / 2;
                const centerY = ty + TILE_SIZE / 2;

                const size = TILE_SIZE * 3;
                const drawX = centerX - size / 2;
                const drawY = centerY - size / 2;

                // Animate
                const frameCount = 5;
                const duration = 600; // Matches engine wait
                const now = Date.now();
                const elapsed = now - effectStartTime.current;

                // Clamp to last frame if exceeded (One-shot animation)
                let frame = Math.floor((elapsed / duration) * frameCount);
                if (frame >= frameCount) frame = frameCount - 1;

                const sx = frame * 100; // 96 + 4 gap

                ctx.drawImage(
                    fireballSprite.current,
                    sx, 0, 96, 96,
                    drawX, drawY, size, size
                );
            } else {
                effectStartTime.current = 0; // Reset
            }

            // 5. Cutscene Overlay (Separate Step)
            if (combatState.castingUnitId && cutsceneSprite.current) {
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0); // Screen Space

                const pImg = cutsceneSprite.current;
                const targetHeight = canvas.height * 0.6;
                const pScale = targetHeight / pImg.height;

                const pW = pImg.width * pScale;
                const pH = pImg.height * pScale;
                const pX = canvas.width - pW; // Right aligned
                const pY = canvas.height - pH; // Bottom aligned

                ctx.drawImage(pImg, pX, pY, pW, pH);
                ctx.restore();
            }

            ctx.restore();

            animationFrameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameId);

    }, [map, units, selectedUnitId, reachableTiles, attackRange, actionTargets, combatState, camera, interactionMode, selectedSpell, hoverMoveTiles, hoverAttackTiles]);

    // --- INPUT HANDLING ---

    const getTileFromEvent = (clientX: number, clientY: number) => {
        if (!canvasRef.current) return null;
        const rect = canvasRef.current.getBoundingClientRect();

        // Adjust for Centering
        const mouseX = clientX - rect.left - centeringOffsetX;
        const mouseY = clientY - rect.top - centeringOffsetY;

        // Apply visual scale and camera
        const worldX = (mouseX / scale) + camera.x;
        const worldY = (mouseY / scale) + camera.y;

        const tx = Math.floor(worldX / TILE_SIZE);
        const ty = Math.floor(worldY / TILE_SIZE);
        return { x: tx, y: ty };
    };

    const handleWheel = (e: React.WheelEvent) => {
        // e.preventDefault(); // React synthetic event might not support this same way for passive? 
        // standard onWheel is fine.

        const zoomIntensity = 0.1;
        const delta = -Math.sign(e.deltaY);
        const newScale = Math.min(Math.max(0.5, scale + delta * zoomIntensity), 2);

        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();

        // We use clientX directly here but logic inside must align
        const mouseX = e.clientX - rect.left - centeringOffsetX;
        const mouseY = e.clientY - rect.top - centeringOffsetY;

        // World Pos before zoom
        const worldX = (mouseX / scale) + camera.x;
        const worldY = (mouseY / scale) + camera.y;

        // Calculate Max Scroll for New Scale
        const newMaxScrollX = Math.max(0, (width * TILE_SIZE) - (viewportWidthPx / newScale));
        const newMaxScrollY = Math.max(0, (height * TILE_SIZE) - (viewportHeightPx / newScale));

        const newCamX = worldX - (mouseX / newScale);
        const newCamY = worldY - (mouseY / newScale);

        setScale(newScale);
        setCamera({
            x: Math.round(Math.max(0, Math.min(newCamX, newMaxScrollX))),
            y: Math.round(Math.max(0, Math.min(newCamY, newMaxScrollY)))
        });
    };

    // Refactored Hover Logic
    const updateHoverState = (pos: Position | null) => {
        if (!pos) {
            if (lastHoverPos.current) {
                lastHoverPos.current = null;
                if (onHover) onHover(null);
                setHoverMoveTiles([]);
                setHoverAttackTiles([]);
            }
            return;
        }

        // Boundary Check for safety
        if (pos.x < 0 || pos.x >= width || pos.y < 0 || pos.y >= height) {
            if (lastHoverPos.current) {
                lastHoverPos.current = null;
                if (onHover) onHover(null);
                setHoverMoveTiles([]);
                setHoverAttackTiles([]);
            }
            return;
        }

        // Logic
        lastHoverPos.current = pos;
        if (onHover) onHover(pos);

        // Hover Prediction Check
        const hoveredUnit = units.find(u => u.position.x === pos.x && u.position.y === pos.y);

        // Disable hover for selected unit
        if (hoveredUnit && hoveredUnit.id !== selectedUnitId) {
            // 1. Calculate Move Tiles (Blue)
            const moves = getReachableTiles(hoveredUnit, units, map);
            setHoverMoveTiles(moves);

            // 2. Calculate Potential Attacks (Red) from ALL move tiles
            const attackSet = new Set<string>();
            moves.forEach(m => {
                const rangeTiles = getTilesInRange(m, hoveredUnit.attackRangeMin, hoveredUnit.attackRangeMax, width, height);
                rangeTiles.forEach(rt => {
                    const key = `${rt.x},${rt.y}`;
                    attackSet.add(key);
                });
            });

            // Convert Set to Array and Filter out Moves
            const attacks: Position[] = [];
            attackSet.forEach(key => {
                const [ax, ay] = key.split(',').map(Number);
                // Check if in moves
                const isMove = moves.some(m => m.x === ax && m.y === ay);
                if (!isMove) {
                    attacks.push({ x: ax, y: ay });
                }
            });

            setHoverAttackTiles(attacks);
        } else {
            setHoverMoveTiles([]);
            setHoverAttackTiles([]);
        }
    };

    // Reactive Hover Update (Fix for 0-tile move or state changes)
    useEffect(() => {
        if (lastHoverPos.current) {
            updateHoverState(lastHoverPos.current);
        }
    }, [units, selectedUnitId, interactionMode]); // Re-evaluate when these change

    const handleMouseMove = (e: React.MouseEvent | MouseEvent) => {
        // Drag Logic
        if (isMouseDownRef.current) {
            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;

            if (!isDraggingRef.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
                isDraggingRef.current = true;
                document.body.style.cursor = 'grabbing';
            }

            if (isDraggingRef.current) {
                // Dragging moves camera
                // Since we are dragging *screen pixels*, and camera is *world pixels*:
                // WorldDelta = ScreenDelta / Scale
                const wDx = dx / scale;
                const wDy = dy / scale;

                const newX = camStartRef.current.x - wDx;
                const newY = camStartRef.current.y - wDy;

                setCamera({
                    x: Math.round(Math.max(0, Math.min(newX, maxScrollX))),
                    y: Math.round(Math.max(0, Math.min(newY, maxScrollY)))
                });
            }
        }

        // Hover Logic
        // We use the same event for hover calc, but relative to canvas
        const pos = getTileFromEvent(e.clientX, e.clientY);
        updateHoverState(pos);
    };

    const handleMouseUp = (e: React.MouseEvent | MouseEvent) => {
        if (isDraggingRef.current) {
            clickBlockerRef.current = true;
            setTimeout(() => clickBlockerRef.current = false, 50);
            document.body.style.cursor = 'default';
        }
        isMouseDownRef.current = false;
        isDraggingRef.current = false;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // Left click only for nav

        isMouseDownRef.current = true;
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        camStartRef.current = { x: camera.x, y: camera.y };
        isDraggingRef.current = false;
    };

    const handleClick = (e: React.MouseEvent) => {
        if (clickBlockerRef.current) return;
        const pos = getTileFromEvent(e.clientX, e.clientY);
        if (pos && pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height) {
            onTileClick(pos);
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onRightClick) onRightClick();
    };

    // Global event listeners for drag up/zoom outside canvas
    useEffect(() => {
        const globalMove = (e: MouseEvent) => handleMouseMove(e);
        const globalUp = (e: MouseEvent) => handleMouseUp(e);

        window.addEventListener('mousemove', globalMove);
        window.addEventListener('mouseup', globalUp);
        return () => {
            window.removeEventListener('mousemove', globalMove);
            window.removeEventListener('mouseup', globalUp);
        };
    }, [camera, units, map, hoverMoveTiles, hoverAttackTiles, interactionMode]);

    return (
        <div
            className="relative shadow-2xl rounded overflow-hidden border-4 border-gray-800"
            style={{
                width: viewportWidthPx,
                height: viewportHeightPx
            }}
            onContextMenu={handleContextMenu}
        >
            {isLoading && (
                <div className="absolute inset-0 bg-stone-900 flex items-center justify-center z-50 text-white font-mono text-2xl">
                    Loading Assets...
                </div>
            )}
            <canvas
                ref={canvasRef}
                width={viewportWidthPx}
                height={viewportHeightPx}
                className="block cursor-pointer"
                onMouseDown={handleMouseDown}
                onClick={handleClick}
                onWheel={handleWheel}
                onMouseMove={(e) => { }}
            />
        </div>
    );
};
