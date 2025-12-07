import React from 'react';
import { LevelConfig } from '../types';
import { LEVELS } from '../data/levels';

interface MainMenuProps {
    onStartLevel: (level: LevelConfig) => void;
    onEnterEditor?: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartLevel, onEnterEditor }) => {
    const [completedLevels, setCompletedLevels] = React.useState<string[]>([]);

    React.useEffect(() => {
        try {
            const saved = localStorage.getItem('pixelTactics_completed');
            if (saved) {
                setCompletedLevels(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load progress", e);
        }
    }, []);

    const handleReset = () => {
        if (window.confirm("Are you sure you want to reset all mission progress?")) {
            localStorage.removeItem('pixelTactics_completed');
            setCompletedLevels([]);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4 font-pixel text-white">
            <h1 className="text-4xl md:text-6xl text-yellow-400 mb-12 drop-shadow-md text-center leading-relaxed">
                PIXEL TACTICS<br />
                <span className="text-lg md:text-2xl text-blue-300">COMMANDER'S LOG</span>
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
                {LEVELS.map(level => {
                    const isCompleted = completedLevels.includes(level.id);
                    return (
                        <div
                            key={level.id}
                            className={`border-4 p-6 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group
                                ${isCompleted
                                    ? 'bg-green-900/40 border-green-500 hover:bg-green-900/60'
                                    : 'bg-blue-900 border-white hover:bg-blue-800'
                                }`}
                            onClick={() => onStartLevel(level)}
                        >
                            {isCompleted && (
                                <div className="absolute top-0 right-0 bg-green-500 text-black text-xs font-bold px-2 py-1 shadow-md">
                                    MISSION ACCOMPLISHED
                                </div>
                            )}
                            <div>
                                <h2 className={`text-xl mb-2 ${isCompleted ? 'text-green-300' : 'text-yellow-400'}`}>
                                    {level.name}
                                </h2>
                                <p className="font-mono-retro text-lg text-blue-100 mb-4">{level.description}</p>
                            </div>
                            <div className="flex justify-between items-center text-xs text-neutral-400 font-mono">
                                <span>SIZE: {level.width}x{level.height}</span>
                                <span>TURNS: {level.maxTurns === 0 ? '∞' : level.maxTurns}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-8">
                <button
                    onClick={onEnterEditor}
                    className="border-2 border-yellow-600 bg-yellow-900/40 text-yellow-400 px-6 py-3 font-bold hover:bg-yellow-800 hover:text-white transition-all transform hover:scale-105"
                >
                    LAUNCH MAP EDITOR
                </button>
            </div>

            <button
                onClick={handleReset}
                className="mt-12 text-red-500 hover:text-red-400 text-xs font-mono tracking-widest opacity-50 hover:opacity-100 transition-opacity"
            >
                [ RESET ALL DATA ]
            </button>
        </div>
    );
};
