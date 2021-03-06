module.exports = {
    "controls": {
        "rotate_left": 68, // D
        "rotate_right": 70, // F
        "left": 37, // left arrow
        "right": 39, // right arrow
        "soft_drop": 40, // down arrow
        "hard_drop": 32, // space 
        "play_toggle": 80, // P
        "up_turns_right": true,
        "down_inverse_of_up": false
    },
    // @see <http://tetrisconcept.net/wiki/Scoring>
    "scoring": {
        // score == level * number of rows * multiplier
        "line_multipliers": [40, 100, 300, 800],
        // bonuses
        "soft_drop": 1, // adds one point  per row
        "hard_drop": 2  // adds two points per row
    },
    "cellsize": 25,
    "cols": 10,
    "rows": 20,
    "preview": {
        "show": 3
    },
    "start_level": 5,
    "slide_fast": false,
    "use_crazy_piece": false,
    "use_keyboard_entropy": false,
    // @see <http://tetrisconcept.net/wiki/Random_Generator>
    "use_the_random_generator": true,
    "bag_size": 7,
    "max_level": -1,
    "version": {
        "major": 1,
        "minor": 2,
        "point": 0
    },
    "version_string": "1.2.0"
};