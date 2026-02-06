**Task: Create a SvelteKit application for "Connect, Square!"**

**HIGHLY FOCUS on great UX!**

The game should be nicely animated and the user response feedback must be very good as well!

Similar to Chess.com, the user must have the option to be able to play against bots, to be able to play against himself, to make two bots be able to play against each other, and to set changes ingame (e.g. edit the board, assign bots, etc.).

The player must be able to configure the board size (limited 3..=10 squares) and the colors (predefined colors).

Support both white and dark mode using `mode-watcher`.

Leave the implementation for the bot logic open - just design a smart interface for later.

Highly focus on asthetics, to give a "pen drawing like look".

Fully ensure that the implement is working by implementing e2e tests.

Use Bun. Do not use comments unless needed, rely on clean naming and structure instead!

FOLLOW LATEST RECOMMENDED CLEAN CODE GUIDELINES.

---

Gamebook of "Connect, Square!"

# Connect, Square!

**A Game of Territory and Connections**

### **1. Game Overview**

**Connect, Square!** is a strategy game played on a grid of points. Players compete to capture squares by drawing connections between points. The game combines path-building mechanics with territory capture. The player who owns the most squares at the end of the game wins.

### **2. Components & Setup**

- **Players:** 2 or more (Default: 2 players, Red vs. Blue).
- **The Board:** A **6x6 grid of squares**, defined by a grid of **7x7 points** (dots).
- **Starting Positions:**
- Players start at diagonally opposite corners of the board (e.g., Top-Left and Bottom-Right).
- These starting corner points are considered **Marked** (owned) by their respective players at the start of the game.

### **3. Turn Structure**

Players take turns drawing **Connections**. A turn consists of drawing a single line between two points.

#### **A. How to Place a Connection**

To place a valid connection, you must follow these rules:

1. **Origin:** The line must start from a point that is already **Marked** as yours.
2. **Destination:** You must connect to a direct neighbor (horizontal, vertical, or diagonal).

- _Result:_ If the destination point was not previously marked by you, it becomes **Marked** as yours.

3. **Vacancy:** The connection line itself must not already be drawn. (Lines cannot be overwritten).

#### **B. Line Restrictions**

- **Exclusivity:** A line belongs to the player who drew it. Lines cannot be shared or removed.
- **Crossing:** Diagonal lines are allowed to cross each other (forming an 'X').
- **The Filled Square Rule:** You cannot draw a diagonal line inside a square that has already been **Filled** (captured).

#### **C. The Bonus Turn**

If your move results in the capture of one or more **Filled Squares**, you **must** immediately take another turn. This continues until you make a move that does not capture a square.

### **4. Scoring: Filling Squares**

The goal is to capture squares.

- **How to Fill:** A square is considered **Filled** when all four of its orthogonal borders (Top, Bottom, Left, Right) are drawn.
- **Capturing:** The player who draws the **fourth and final border line** captures the square.
- **Ownership:**
- The captured square is permanently marked with that player's color.
- A filled square cannot be stolen, shared, or overwritten.

- **Diagonal Note:** Diagonal lines do **not** count toward filling a square; only the vertical and horizontal borders count.

### **5. Important Concepts**

- **Shared Points:** Points (dots) can be marked and used by multiple players simultaneously. You can connect to a point even if an opponent is already there.
- **Exclusive Lines:** While points are shared, the **lines** connecting them are not. Once a line is drawn, that specific path is blocked for opponents.

### **6. Endgame & Victory**

#### **Elimination**

If a player cannot make a valid move (e.g., they are surrounded by opponent lines or filled squares and have no empty connections available from their marked points), they are eliminated from play. They stop taking turns and must wait for the scoring phase.

#### **The "Last Survivor" Bonus**

If only one player remains who can still make valid moves, that player automatically claims **all remaining unowned squares** on the board.

#### **Winning**

Once all squares are owned:

1. Count the total number of filled squares for each player.
2. The player with the highest count wins.
