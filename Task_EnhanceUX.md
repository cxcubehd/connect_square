**Task: Enhance UX by addressing following points**

Design / Animations:

- fix animation of making a connection (e.g. placing a connection from right to left should make the line animate from right to left, not always left to right or top to bottom)
- fix square white + black outline appearing on dots (fix bad browser default)
- squares should have a diagonal stripe pattern that is moving very slowly
- dashed lines should have repeating "smooth easing move and then stop" animation pattern to emphasize that this is the current move. The move direction should depend from move origin point (e.g. lines to top point should have their movement pattern have in the top direction)
- square appearence animation should be from center of square and they should have round edges until they fill up the square
- the last move should be more emphasized (thicker line / dot)
- dependending on which player is moving their marked points should be in foreground
- fix gray dashed lines (there should only be one for possible connection; make them a bit thicker)

- update the theme to not be the typical "pastel blue AI-generated-like" theme

UX:

- the primary interaction should be "hover and drag" not click and click
- there should be assistance for hovering, when the cursor is in close range to points, the nearest point should be highlighted (HOWEVER NOT ALWAYS THE NEAREST (e.g. cursor is IN THE MIDDLE OF A SQUARE))
- the existing interaction way should still be supported, but only when user clicks the points with `ctrl` held (e.g. `ctrl+click` selects the hoverted point, `ctrl+click` on another point should make the connection, pressing with just `click` should unselect (still able to drag))
- when dragging (making connection) draw and animate the intended option (origin to destination point), do don't really draw intended option if the option is not clear

-> making connections should feel satisfying for the user

Verify all changes by using e2e testing.

Do not use comments unless needed, rely on clean naming and structure instead!

FOLLOW LATEST RECOMMENDED CLEAN CODE GUIDELINES.
