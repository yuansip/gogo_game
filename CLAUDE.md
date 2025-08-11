# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hello Gogo is a web-based Go (Weiqi) game featuring:
- Player vs Player mode
- Player vs AI mode with difficulty levels
- Customizable board sizes (9x9, 13x13, 19x19)
- Tsumego (life and death problems) practice mode

## Architecture

### Technology Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Graphics**: Canvas API for board and stone rendering
- **No backend required** - Pure client-side implementation

### File Structure
```
css/
├── style.css          # Main styles and layout
└── components.css     # Component-specific styles

js/
├── game.js           # Core game logic (rules, board state, move validation)
├── ai.js             # AI algorithms for computer player
├── problems.js       # Tsumego problems and practice mode
└── ui.js             # User interface and DOM manipulation

assets/
└── sounds/           # Audio files for game sounds
```

## Development

### Running the Game
- Open `index.html` in a web browser
- No build process or server required

### Core Components

1. **Game Logic** (`js/game.js`):
   - Board representation and state management
   - Move validation and game rules
   - Capture detection and territory calculation

2. **AI Engine** (`js/ai.js`):
   - Monte Carlo Tree Search for stronger play
   - Pattern recognition for opening moves
   - Difficulty scaling through search depth and randomization

3. **Problem Engine** (`js/problems.js`):
   - Predefined tsumego positions
   - Solution validation
   - Hint system

### Game Rules Implementation
- **Ko Rule**: Prevents immediate recapture
- **Suicide Rule**: Prevents self-capture moves
- **Territory Scoring**: Japanese rules with komi
- **Pass Detection**: Game ends when both players pass

## Testing
- Manual testing through browser
- Unit tests can be added using a simple test framework
- Test different board sizes and game modes

## Browser Compatibility
- Modern browsers supporting Canvas API and ES6+
- Chrome, Firefox, Safari, Edge (latest versions)