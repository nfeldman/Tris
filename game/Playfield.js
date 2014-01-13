
function Playfield () {
    // using array constructors looks weird
    // but it makes sense when you know the
    // size of the array ahead of time.
    var row = new Array(10);
    this.field = new Array(22);

    for (var i = 0; i < 22; i++)
        this.field[i] = row.slice(0);
}