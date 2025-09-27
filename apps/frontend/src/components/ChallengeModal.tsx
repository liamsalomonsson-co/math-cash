import { useState } from 'react';
import type { MathChallenge } from '@math-cash/shared';

// Temporary inline function until imports work
const formatChallenge = (operation: string, operands: number[]): string => {
  const [a, b] = operands;
  const symbols: Record<string, string> = {
    addition: '+',
    subtraction: '-',
    multiplication: '×',
    division: '÷',
  };
  return `${a} ${symbols[operation] || '?'} ${b} = ?`;
};

interface ChallengeModalProps {
  challenge: MathChallenge;
  isOpen: boolean;
  onSubmit: (answer: number) => void;
  onClose: () => void;
}

export default function ChallengeModal({ challenge, isOpen, onSubmit, onClose }: ChallengeModalProps) {
  const [answer, setAnswer] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const numericAnswer = parseFloat(answer.trim());
    
    if (isNaN(numericAnswer)) {
      alert('Please enter a valid number!');
      return;
    }

    setAttempts(prev => prev + 1);
    
    if (numericAnswer === challenge.correctAnswer) {
      onSubmit(numericAnswer);
      // Reset for next time
      setAnswer('');
      setAttempts(0);
      setShowHint(false);
    } else {
      // Show hint after 2 failed attempts
      if (attempts >= 1) {
        setShowHint(true);
      }
      // Give encouraging feedback
      const encouragements = [
        'Not quite right, try again! 🤔',
        'Close! Give it another shot! 💪',
        'You can do this! Think it through! 🧠',
      ];
      alert(encouragements[Math.min(attempts, encouragements.length - 1)]);
      setAnswer('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const getHint = () => {
    const { operation, operands } = challenge;
    switch (operation) {
      case 'addition':
        return `Hint: Add the numbers together! ${operands[0]} + ${operands[1]} = ?`;
      case 'subtraction':
        return `Hint: Take away the second number! ${operands[0]} - ${operands[1]} = ?`;
      case 'multiplication':
        return `Hint: Multiply the numbers! ${operands[0]} × ${operands[1]} = ?`;
      case 'division':
        return `Hint: Divide the first number by the second! ${operands[0]} ÷ ${operands[1]} = ?`;
      default:
        return 'Think about what operation you need to do!';
    }
  };

  const getDifficultyEmoji = () => {
    switch (challenge.difficulty) {
      case 'infant': return '🍼';
      case 'toddler': return '🧸';
      case 'beginner': return '🌱';
      case 'easy': return '⭐';
      case 'medium': return '🔥';
      case 'hard': return '💎';
      case 'expert': return '🏆';
      default: return '📚';
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <span style={{ fontSize: '24px' }}>
              {getDifficultyEmoji()} Math Challenge
            </span>
            <span style={{ 
              fontSize: '16px', 
              color: '#666',
              background: '#f0f0f0',
              padding: '4px 8px',
              borderRadius: '12px'
            }}>
              {challenge.difficulty}
            </span>
          </div>
          
          <div style={{ 
            fontSize: '14px', 
            color: '#666',
            marginBottom: '10px'
          }}>
            Reward: 💰 {challenge.reward} coins
          </div>
        </div>

        <div className="challenge-display">
          {formatChallenge(challenge.operation, challenge.operands)}
        </div>

        {showHint && (
          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '8px',
            padding: '12px',
            margin: '16px 0',
            fontSize: '14px',
            color: '#856404'
          }}>
            💡 {getHint()}
          </div>
        )}

        <input
          type="number"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyPress={handleKeyPress}
          className="answer-input"
          placeholder="Your answer..."
          autoFocus
        />

        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'center',
          marginTop: '20px'
        }}>
          <button 
            className="btn btn-success" 
            onClick={handleSubmit}
            disabled={!answer.trim()}
          >
            Submit Answer ✨
          </button>
          <button 
            className="btn"
            onClick={onClose}
            style={{ 
              background: '#e9ecef', 
              color: '#495057' 
            }}
          >
            Cancel
          </button>
        </div>

        {attempts > 0 && (
          <div style={{ 
            fontSize: '12px', 
            color: '#666', 
            textAlign: 'center',
            marginTop: '10px'
          }}>
            Attempts: {attempts}
          </div>
        )}
      </div>
    </div>
  );
}