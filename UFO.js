function UFO(settings = {}) {

    let ufoMaster, ufoInterval, ufoFireInterval, ufoAnimation;

    const log = console.log;
    const stage = settings.stage;
    const layer = settings.layer;
    const centerShape = settings.centerShape;
    const pauser = settings.pauser;
    const isOffStage = settings.isOffStage;

    const ufoAppearanceInterval = settings.ufoAppearanceInterval ?? 10 * 1000; // new ufo every 30 seconds
    const ufoBulletFlightTime = settings.ufoBulletFlightTime ?? 5; // seconds to traverse stage width
    const ufoFlightTime = settings.ufoFlightTime ?? stage.width() / 15; // 15 seconds to traverse stage width

    Konva.Image.fromURL(settings.ufoImageURL ?? "images/asteroids/ufo.svg", ufoImage => {
        ufoMaster = ufoImage;
        ufoMaster.id("ufo");
        centerShape(ufoMaster);
    });

    this.target = null;

    this.beginAttacks = () => {
        ufoInterval = setInterval(this.new, ufoAppearanceInterval);
        setTimeout(this.new, 15 * 1000);
        return true;
    };

    this.stopAll = () => clearInterval(ufoInterval);

    this.onDestroy = () => undefined;
    this.onFire = () => undefined;
    this.onTargetHit = () => undefined;
    this.onMove = () => undefined;
    this.onStop = () => undefined;
    this.onUFOdestroy = () => undefined;

    this.destroyMe = (ufo) => {
        this.onUFOdestroy();
        ufo.remove();
        ufoAnimation.stop();
        this.onDestroy(ufo);
        clearInterval(ufoFireInterval);
    };

    const fire = ufo => {

        const target = this.target;

        if (pauser.isPaused() || target.isDestroyed || target.ghostMode) return false;

        this.onFire();

        const speed = stage.width() / ufoBulletFlightTime; // 3 seconds across the screen
        const radians = Math.atan2(ufo.x() - target.x(), ufo.y() - target.y());
        const ufoBullet = new Konva.Circle({
            radius: 3,
            fill: "white",
            x: ufo.x(),
            y: ufo.y(),
        }).moveTo(layer);

        const targetIsHit = () => !target.isDestroyed && !target.ghostMode && shapesTooClose(ufoBullet, target, 20);

        const moveUfoBullet = frame => {
            const newX = ufoBullet.x() - (frame.timeDiff / 1000 * speed) * Math.sin(radians);
            const newY = ufoBullet.y() - (frame.timeDiff / 1000 * speed) * Math.cos(radians);
            ufoBullet.x(newX).y(newY);
        };

        const slideUfoBullet = frame => {

            if (pauser.isPaused()) return false;

            moveUfoBullet(frame);

            if (isOffStage(ufoBullet, stage)) destroyBullet();

            if (!targetIsHit()) return;

            destroyBullet();
            this.onTargetHit();
            target.isHittable() && target.die(true);
        };

        const ufoBulletAnim = new Konva.Animation(slideUfoBullet, layer).start();

        function destroyBullet() {
            ufoBulletAnim.stop();
            ufoBullet.destroy();
            return true;
        }
    };

    this.new = () => {

        if (!ufoMaster) return window.requestAnimationFrame(this.new);
        if (this.get().length) return false;

        const heading = Math.random() < 0.5 ? {
            startX: -ufoMaster.width(),
            startY: stage.height() * Math.random(),
            direction: 1,
        } : {
            startX: stage.width() + ufoMaster.width(),
            startY: stage.height() * Math.random(),
            direction: -1,
        };

        const saucer = ufoMaster.clone({
            x: heading.startX,
            y: heading.startY,
        }).moveTo(layer);
        saucer.destroyMe = () => this.destroyMe(saucer);
        this.shape = saucer;

        ufoFireInterval = setInterval(() => fire(saucer), 3000);

        const slideUFO = frame => {
            if (pauser.isPaused()) return false;
            this.onMove();
            const newX = saucer.x() + (ufoFlightTime * frame.timeDiff / 1000) * heading.direction;
            saucer.x(newX);
            if (!isOffStage(saucer, stage, saucer.width())) return;
            this.onStop();
            ufoAnimation?.stop();
            saucer.destroy();
            clearInterval(ufoFireInterval);
        }
        ufoAnimation = new Konva.Animation(slideUFO, layer).start();
    }

    this.get = () => stage.find("#ufo") || [];
}

export { UFO };