import React, { useEffect, useState } from 'react';
import { Faction } from '../types';

interface TurnBannerProps {
    turn: number;
    maxTurns: number;
    activeFaction: Faction;
}

export const TurnBanner: React.FC<TurnBannerProps> = ({ turn, maxTurns, activeFaction }) => {
    const [visible, setVisible] = useState(false);
    const [exiting, setExiting] = useState(false);
    const [displayText, setDisplayText] = useState("");
    const [isEnemy, setIsEnemy] = useState(false);

    useEffect(() => {
        // Trigger on Turn Change (Player) OR Faction Change (Enemy)
        // We only show banner for:
        // 1. Player Turn Start (activeFaction === PLAYER)
        // 2. Enemy Turn Start (activeFaction === ENEMY)

        let text = "";
        let enemy = false;

        if (activeFaction === Faction.ENEMY) {
            text = "ENEMY TURN";
            enemy = true;
        } else {
            // activeFaction === PLAYER
            // Only show if turn > 0
            if (turn > 0) {
                const isFinal = maxTurns > 0 && turn === maxTurns;
                text = isFinal ? "FINAL TURN" : `TURN ${turn}`;
                enemy = isFinal; // Reuse red styling for final turn
            } else {
                return; // Don't show for turn 0/init
            }
        }

        setDisplayText(text);
        setIsEnemy(enemy);
        setVisible(true);
        setExiting(false);

        const exitTimer = setTimeout(() => {
            setExiting(true);
        }, 1000);

        const removeTimer = setTimeout(() => {
            setVisible(false);
            setExiting(false);
        }, 2000);

        return () => {
            clearTimeout(exitTimer);
            clearTimeout(removeTimer);
        };
    }, [turn, activeFaction, maxTurns]);

    if (!visible) return null;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none ${exiting ? 'turn-banner-exit' : 'turn-banner-enter'}`}
        >
            <div className={`bg-black/80 border-y-4 ${isEnemy ? 'border-red-500' : 'border-yellow-500'} py-8 w-full text-center shadow-2xl backdrop-blur-sm`}>
                <h2 className={`text-6xl font-pixel ${isEnemy ? 'text-red-500' : 'text-yellow-400'} drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] tracking-widest`}>
                    {displayText}
                </h2>
                <div className={`w-full h-1 bg-gradient-to-r from-transparent ${isEnemy ? 'via-red-500' : 'via-yellow-200'} to-transparent mt-2 opacity-50`} />
            </div>
        </div>
    );
};
