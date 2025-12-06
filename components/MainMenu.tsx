import React from 'react';
import { LevelConfig } from '../data/levels';
import { LEVELS } from '../data/levels';

interface MainMenuProps {
    onStartLevel: (level: LevelConfig) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartLevel }) => {
    return (
        <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4 font-pixel text-white">
            <h1 className="text-4xl md:text-6xl text-yellow-400 mb-12 drop-shadow-md text-center leading-relaxed">
                PIXEL TACTICS<br />
                <span className="text-lg md:text-2xl text-blue-300">COMMANDER'S LOG</span>
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
                {LEVELS.map(level => (
                    <div
                        key={level.id}
                        className="bg-blue-900 border-4 border-white p-6 hover:bg-blue-800 transition-colors cursor-pointer flex flex-col justify-between"
                        onClick={() => onStartLevel(level)}
                    >
                        <div>
                            <h2 className="text-xl text-yellow-400 mb-2">{level.name}</h2>
                            <p className="font-mono-retro text-lg text-blue-100 mb-4">{level.description}</p>
                        </div>
                        <div className="flex justify-between items-center text-xs text-neutral-400 font-mono">
                            <span>SIZE: {level.width}x{level.height}</span>
                            <span>TURNS: {level.maxTurns === 0 ? '∞' : level.maxTurns}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
