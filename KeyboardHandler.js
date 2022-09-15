

function KeyboardHandler() {

    const log = console.log;

    let keysDown = {};
    ["keydown", "keyup"].forEach(event => {
        window.addEventListener(event, e => {
            e.type === "keydown" ? keysDown[e.which] = true : delete keysDown[e.which];
        });
    });

    function onKeyEvent(codes, func, eventType) {
        codes = $.isArray(codes) ? codes : [codes];
        $(window).on(eventType, e => codes.indexOf(e.which) !== -1 && func());
    }

    this.simulate = (key, value = false) => {
        value ? keysDown[key] = true : delete keysDown[key];
        const ev = $.Event(value ? "keydown" : "keyup");
        ev.which = key;
        $(document).trigger(ev);
    };

    this.onKeydown = (code, func) => onKeyEvent(code, func, "keydown");
    this.onKeyup = (code, func) => onKeyEvent(code, func, "keyup");
    this.getAllDown = () => Object.keys(keysDown);
    this.keyIsDown = code => keysDown[code];
    this.left = () => this.keyIsDown(37) && !this.keyIsDown(39);
    this.right = () => this.keyIsDown(39) && !this.keyIsDown(37);
    this.up = () => this.keyIsDown(38) && !this.keyIsDown(40);
    this.down = () => this.keyIsDown(40) && !this.keyIsDown(38);
    this.noArrowKeysDown = () => Object.keys(keysDown).length === 0;;
    this.clearAll = () => keysDown = {};
}

export { KeyboardHandler };
