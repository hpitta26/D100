+------------------------+             +----------------------+
|   GameDefinition       |             |        Runtime       |
|  - settings            |   create    |  createMatch()       |
|  - box (GameBox)       |-----------> |  applyMove()         |
|  - phases[]            |   state     |  setPhase()/endTurn  |
|  - moves{}             | <-----------|  turns hooks (*)     |
|  - turns (*)           |   next      |                      |
+------------------------+             +----------------------+
         |                                         ^
         v                                         |
   +------------+   buildState()    +------------------------------+
   |  GameBox   |-----------------> | GameState (ctx, players,     |
   | players    |                   | zones, boards, decks, dice,  |
   | boards     |                   | pieces, log)                 |
   | zones      |                   +------------------------------+
   | decks      |                                  ^
   | pieces     |                                  |
   | dice       |        +-------------------------+------------------+
   +------------+        |   Ops (pure & deterministic)               |
                         |   - placeOnBoard / moveOnBoard / clearCell |
                         |   - pushToZone / popFromZone               |
                         |   - pushToPile / popFromPile / shufflePile |
                         |   - transferFromDeckToZone                 |
                         |   - setPieceAttr / incPieceAttr            |
                         |   - rollDiceByKind / rollDiceById          |
                         +--------------------------------------------+
