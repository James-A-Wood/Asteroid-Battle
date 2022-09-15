import { UFO } from "../asteroids/UFO.js";
import { KeyboardHandler } from "./KeyboardHandler.js";
import { AsteroidField } from "./AsteroidField.js";
import { Sparks } from "./Sparks.js";

import * as exports from './tools.js';
Object.entries(exports).forEach(([name, exported]) => window[name] = exported); // unpacking tools


const isMobile = typeof window.orientation !== "undefined";
const log = console.log;


$(function () {


    // helps with very large canvases on retina screens
    if (isMobile) Konva.pixelRatio = 1;


    let ship, gun, anim, clip;
    const pauser = new PauseManager();
    const tweenManager = new TweenManager();

    const keyboardHandler = new KeyboardHandler();
    const asteroids = new AsteroidField({
        isMobile,
        positionRandomly,
        shapesTooClose,
    });
    asteroids.onBreakup = asteroid => {
        soundEffects.play("explosion");
        sparks.newBatch({ origin: asteroid, });
    };


    /*
     *
     *      Allows playing and pausing of all Tweens in application, necessary
     *      because Tweens can't be referenced by tag, name, or id
     *
     *
     */
    function TweenManager() {

        let tweensArray = [];

        const doToAllTweens = verb => tweensArray.forEach(tween => tween && tween[verb]());

        this.register = tween => tweensArray.push(tween)
        this.pauseAll = () => doToAllTweens("pause");
        this.playAll = () => doToAllTweens("play");
        this.clearAll = () => tweensArray.length = 0;
    }


    const stage = new Konva.Stage({
        container: "konva-holder",
        width: window.innerWidth,
        height: window.innerHeight,
    });


    const layer = new Konva.Layer({
        listening: false,
    }).moveTo(stage);
    const controlsLayer = new Konva.Layer().moveTo(stage);
    const sparksLayer = new Konva.Layer({
        listening: false,
    }).moveTo(stage);


    asteroids.stage = stage;
    asteroids.layer = layer;


    const konvaHolder = document.querySelector("#konva-holder");

    const fireSound = new Howl({ src: ["sounds/asteroids/fire.mp3"], });
    const soundEffects = new SoundEffects({
        fire: new Howl({ src: ["sounds/asteroids/fire.mp3"], onplayerror: () => log("Playing?") }),
        ufoFire: new Howl({ src: ["sounds/asteroids/ufoFire.mp3"], }),
        ufoDie: new Howl({ src: ["sounds/asteroids/ufoDie.mp3"], }),
        explosion: new Howl({ src: ["sounds/asteroids/explosion.mp3"], }),
        spaceBackgroundNoise: new Howl({
            src: ["sounds/asteroids/spaceBackgroundNoise.mp3"],
            autoplay: true,
            loop: true,
        }),
        thrust: new Howl({
            src: ["sounds/asteroids/thrust.mp3"],
            autoplay: true,
            loop: true,
            volume: 0,
        }).mute(true).volume(1),
        ufo: new Howl({
            src: ["sounds/asteroids/ufo.mp3"],
            autoplay: true,
            loop: true,
            volume: 0,
        }).mute(true).volume(0.03),
    });


    const sparks = new Sparks(sparksLayer, tweenManager);


    function Mouse() {

        let mouseHideTimeout = null;

        const addCursorHidingTimeout = time => {
            konvaHolder.classList.remove("no-cursor");
            clearTimeout(mouseHideTimeout);
            mouseHideTimeout = setTimeout(() => konvaHolder.classList.add("no-cursor"), time);
        }

        this.hideCursor = (time = 2000) => window.addEventListener("mousemove", () => addCursorHidingTimeout(time));

        this.showCursor = () => {
            konvaHolder.classList.remove("no-cursor");
            clearTimeout(mouseHideTimeout);
            window.removeEventListener("mousemove", addCursorHidingTimeout);
        };
    }
    const mouse = new Mouse();
    mouse.hideCursor();

    const ufo = new UFO({
        stage,
        centerShape,
        layer,
        pauser,
        isOffStage,
    });
    ufo.onDestroy = () => {
        soundEffects.stop("ufo");
        soundEffects.play("ufoDie");
        soundEffects.play("explosion");
        sparks.newBatch({ origin: ufo.shape, });
    };
    ufo.onFire = () => {
        soundEffects.play("ufoFire");
    };
    ufo.onTargetHit = () => {
        soundEffects.play("explosion");
    };
    ufo.onMove = () => {
        // soundEffects.play("ufo");
    };
    ufo.onStop = () => {
        soundEffects.stop("ufo");
    };


    const starryBackground = (function () {

        const starColorsArray = ["white", "orange", "pink", "yellow"];

        let starsArray = [];

        function newStar() {
            const $newStar = $("<div class='star'></div>").css({
                left: Math.random() * 100 + "%",
                top: Math.random() * 100 + "%",
                backgroundColor: chooseOneFrom(starColorsArray),
                opacity: 0.6 + Math.random() * 0.3,
            });
            $newStar.appendTo("#stars-holder");
            starsArray.push($newStar);
        }

        for (let i = 0; i < 200; i++) newStar();

        // blinking
        setInterval(() => {
            const $star = chooseOneFrom(starsArray);
            $star.css({ visibility: "hidden", });
            setTimeout(() => $star.css("visibility", "visible"), 1000);
        }, 400);
    }());


    function PauseManager(settings = {}) {


        let paused = false;
        let pauseLayer = null;
        let events = {
            onPause: {}, // functions to be executed on the pause event
            onResume: {},
        };


        function executeFunctions(object) {
            for (const key in object) typeof object[key] === "function" && object[key]();
            return true;
        }


        function addFunctionality(newEvents, targetObject) {
            for (const key in newEvents) targetObject[key] = newEvents[key];
            return this;
        }


        this.onPause = function (obj) {
            addFunctionality(obj, events.onPause);
            return this;
        }


        this.onResume = function (obj) {
            addFunctionality(obj, events.onResume);
            return this;
        }


        this.removeEvent = function (eventLabel) {
            delete events.onPause[eventLabel];
            delete events.onResume[eventLabel];
            return this;
        };


        this.isPaused = function () {
            return paused;
        }


        this.togglePause = function () {
            paused = !paused;
            executeFunctions(paused ? events.onPause : events.onResume);
            return this;
        }
    }


    const pauseLayerManager = (function () {


        let pauseLayer = null;


        function create() {


            pauseLayer = (new Konva.Layer()).moveTo(stage);


            const grayBackground = new Konva.Rect({
                x: 0,
                y: 0,
                width: stage.width(),
                height: stage.height(),
                fill: "gray",
                opacity: 0.5,
            }).moveTo(pauseLayer).on("click touchend", pauser.togglePause).cache();
            const pausedText = new Konva.Text({
                text: "Paused",
                fill: "white",
                fontSize: 128,
                x: stage.width() / 2,
                y: stage.height() / 2,
            }).moveTo(pauseLayer).on("click touchend", pauser.togglePause).cache();
            centerShape(pausedText);


            while (isWiderThanStage(pausedText, stage)) {
                shrinkToFitStage(pausedText, stage);
            }

            pauseLayer.batchDraw();
        }


        function destroy() {
            pauseLayer && pauseLayer.destroy();
            return this;
        }


        return {
            create,
            destroy,
        }
    }());


    pauser.onPause({
        createNewPauseLayer: pauseLayerManager.create,
        pauseAllTweens: tweenManager.pauseAll,
    }).onResume({
        destroyPauseLayer: pauseLayerManager.destroy,
        resumeAllTweens: tweenManager.playAll,
    });


    function SoundEffects(soundFiles = {}) {

        let userHasInteracted = false;
        $(window).on("keyup keydown touchstart mousemove", () => userHasInteracted = true);

        function setPlayState(soundName, doPlay) {
            if (!userHasInteracted) return false;
            const howl = soundFiles[soundName];
            howl.mute(!doPlay);
            if (howl._loop) return;
            howl.stop();
            if (doPlay) howl.play();
        }

        this.play = soundName => setPlayState(soundName, true);
        this.stop = soundName => setPlayState(soundName, false);
        this.setVolume = (value = 1) => Howler.volume(value);
    }


    window.addEventListener("keydown", function (e) {

        if (e.key === "p") {
            pauser.togglePause();
            soundEffects.setVolume(pauser.isPaused() ? 0 : 1);
            pauser.isPaused() ? sparks.pause() : sparks.resume();
        }

        if (e.key === "f") {
            allElements.saveAllPositions();
            screenfull.isEnabled && screenfull.request($("#full-screen-holder")[0]);
        }
    });


    // adjusting stage width & height
    $(window).resize(function () {
        stage.height(konvaHolder.clientHeight);
        stage.width(konvaHolder.clientWidth);
        allElements.restoreAllPositions();
    });


    const allElements = (function () {

        // simply calls a function on every shape in the app
        function forEachElement(doThis) {
            stage.getChildren().each(layer => {
                layer.getChildren().each(shape => doThis(shape));
            });
            return this;
        }

        function savePositionFor(shape) {
            shape.relativePosition = {
                x: shape.x() / stage.width(),
                y: shape.y() / stage.height(),
            };
            return this;
        }

        function restorePositionFor(shape) {
            if (!shape.relativePosition) return this;
            shape.x(shape.relativePosition.x * stage.width());
            shape.y(shape.relativePosition.y * stage.height());
            return this;
        }

        function saveAllPositions() {
            forEachElement(shape => savePositionFor(shape));
            return this;
        }

        function restoreAllPositions() {
            forEachElement(shape => restorePositionFor(shape));
            stage.batchDraw();
            return this;
        }

        return {
            forEachElement,
            saveAllPositions,
            restoreAllPositions,
            savePositionFor,
            restorePositionFor,
        };
    }());


    function newGame(settings = {}) {

        settings = $.extend({
            numAsteroids: 6,
            asteroidVelocity: 9,
            mode: null,
        }, settings);

        if (anim) anim.stop();
        allElements.forEachElement(shape => shape.destroy());

        ship = new Ship({
            layer: layer,
            onSpawn: function () {
                clip.refill();
                ship.shields.spawnShields();
            }
        });
        ufo.target = ship;
        asteroids.ship = ship;
        gun = new Gun();

        clip = Clip({ layer: layer, });

        for (let i = 0; i < settings.numAsteroids; i++) {
            asteroids.newAsteroid({
                layer: layer,
                velocity: settings.asteroidVelocity,
                mode: settings.mode,
            });
        }

        if (settings.mode !== "practice") ufo.beginAttacks();

        if (settings.mode === "practice") {

            const hints = isMobile ? [
                "指で宇宙船の向きを変えます",
                "右下のボタンで前に進みます",
                "左下のボタンでゲーム・ポーズ",
                "中央下のボタンでシールドを上げます",
                "画面をタップして撃ちます",
                "小惑星をぜんぶ粉々にして戦いましょう！<br />Do your best!",
            ] : [
                "左右のアローキーで曲がります",
                "上・下のアローキーで前・後ろに進みます",
                "スペースバー = 撃つ<br />S = シールド<br />P = ポーズ<br />",
                "隕石をぜんぶ粉々にして戦いましょう！<br />Do your best!",
            ];
            const arrayLength = hints.length;
            let counter = 0;

            showHint(hints.shift());

            function showHint(text) {
                const numbering = `${++counter} / ${arrayLength}<br />`;
                const $div = $(`<div class='hint'>${numbering} ${text}</div>`).appendTo("body");
                $div.fadeIn("fast");
                const $buttonHolder = $("<div></div>").appendTo($div);
                const $button = $("<button>OK</button>").appendTo($buttonHolder);
                $button.on("click", function () {
                    $div.fadeOut(function () {
                        hints.length && showHint(hints.shift());
                    });
                });
            }
        }

        allElements.saveAllPositions();

        anim = new Konva.Animation(mainAnimation, layer).start();
        const controls = Controls(stage);
    }


    function Clip(obj) {

        obj = $.extend({
            layer: null, // required
            clipHeight: 5,
            clipWidth: stage.width(),
            replenishRate: 1, // 1 bullet per second
            capacity: 30,
            warningLevel: 0.25, // 25% of bullets remaining
            barFillStandard: "yellow",
            barFillWarning: "red",
            position: "bottom",
        }, obj);

        let numBulletsLeft = obj.capacity;
        let clipInterval = setInterval(addBullets, 1000 / obj.replenishRate);
        // let clipTween = null;
        let dotsArray = [];

        const dotMaster = new Konva.Circle({
            fill: "yellow",
            name: "bulletDot",
            radius: 6,
        });
        const spacing = (stage.width() - obj.capacity * dotMaster.radius() * 2) / obj.capacity;
        dotMaster.y(dotMaster.radius() + spacing / 4);

        for (let i = 0; i < obj.capacity; i++) {
            const dot = dotMaster.clone({
                x: (spacing / 2) + (i * spacing) + dotMaster.radius() + (i * dotMaster.radius() * 2),
            }).moveTo(layer);
            dotsArray.push(dot);
            layer.batchDraw();
        }

        function adjustBulletDots() {
            stage.find(".bulletDot").each((dot, index) => {
                const opacity = index < numBulletsLeft ? 1 : 0.2;
                dot.opacity(opacity).fill(getFillColor());
            });
            layer.batchDraw();
        }

        function changeNumberRemaining(n) {
            if (pauser.isPaused()) return false;
            numBulletsLeft += n;
            numBulletsLeft = Math.min(obj.capacity, Math.max(0, numBulletsLeft)); // keeping it in bounds
            adjustBulletDots();
            return this;
        }

        function getFillColor() {
            return numBulletsLeft < obj.capacity * obj.warningLevel ? obj.barFillWarning : obj.barFillStandard;
        }

        function stop() {
            clearInterval(clipInterval);
            return this;
        }

        function removeBullets(n = -1) {
            changeNumberRemaining(n);
            return this;
        }

        function removeOne() {
            removeBullets();
            return this;
        }

        function addBullets(n = 1) {
            changeNumberRemaining(n);
            return this;
        }

        function isEmpty() {
            return numBulletsLeft === 0;
        }

        function refill() {
            addBullets(obj.capacity);
            return this;
        }

        function remove() {
            stop();
        }

        return {
            stop,
            // removeBullets,
            removeOne,
            isEmpty,
            refill,
            remove,
        };
    }


    function Gun(obj = {}) {

        obj = $.extend({
            layer: layer,
            bulletsPerSecond: 10,
            origin: ship,
            bulletVelocity: 400,
            bulletRadius: 2,
            bulletFill: "white",
            bulletLifeSeconds: 4000,
        }, obj);

        const allBulletsArray = [];
        let fireInterval = null;
        let isFiring = false;
        let isArmed = true;

        const bulletPrototype = obj.bulletPrototype ?? new Konva.Circle({
            radius: obj.bulletRadius,
            fill: obj.bulletFill,
        });

        keyboardHandler.onKeydown(32, () => {
            if (isFiring) return true;
            fireInterval = setInterval(fire, 1000 / obj.bulletsPerSecond);
            fire();
            isFiring = true;
        });
        keyboardHandler.onKeyup(32, () => {
            clearInterval(fireInterval);
            allElements.saveAllPositions();
            isFiring = false;
        });

        function fire(shooter) {

            shooter = shooter ?? obj.origin;
            if (clip.isEmpty() || shooter.isDestroyed || !isArmed) return;
            soundEffects.play("fire");
            clip.removeOne();

            const bullet = bulletPrototype.clone({
                x: shooter.x(),
                y: shooter.y(),
            }).cache();

            obj.layer.add(bullet).batchDraw();
            bullet.moveToBottom();
            bullet.velocity = obj.bulletVelocity;
            bullet.heading = ship.rotation() * (Math.PI / 180);
            bullet.momentum = {
                x: ship.momentum.x,
                y: ship.momentum.y,
            };

            const destroyBulletTimeout = setTimeout(() => bullet.destroyMe(), obj.bulletLifeSeconds); // so slow-moving bullets don't hand around forever

            bullet.destroyMe = function () {
                bullet.x(stage.width() + 1);
                bullet.destroy();
                if (allBulletsArray.includes(bullet)) allBulletsArray.splice(allBulletsArray.indexOf(bullet), 1); // why doesn't this work?
                obj.layer.batchDraw();
                clearTimeout(destroyBulletTimeout);
            };

            allBulletsArray.push(bullet);
        }

        function eachBullet(func) {
            allBulletsArray.forEach(bullet => bullet && func(bullet));
        }

        this.fire = fire;
        this.eachBullet = eachBullet;
    };


    function mainAnimation(frame) {

        if (pauser.isPaused()) return false;

        const time = frame.timeDiff / 1000;
        const shipRotation = ship.rotation();

        animateShip(frame, ship, time, shipRotation);
        animateAsteroids(time);
        animateBullets(time);
    }


    function animateBullets(time) {

        gun.eachBullet(bullet => {

            if (!bullet) return;

            bullet.x(bullet.x() + Math.sin(bullet.heading) * time * bullet.velocity + bullet.momentum.x);
            bullet.y(bullet.y() + -Math.cos(bullet.heading) * time * bullet.velocity + bullet.momentum.y);

            if (bullet && isOffStage(bullet, stage)) return bullet.destroyMe();

            asteroids.eachAsteroid(asteroid => {
                if (!shapesTooClose(bullet, asteroid, asteroid.radius)) return;
                asteroid.breakup(bullet);
                bullet.destroyMe();
            });

            ufo.get().forEach(ufo => {
                if (shapesTooClose(bullet, ufo, ufo.width() / 2)) ufo.destroyMe();
            });
        });
    }


    function animateAsteroids(time) {

        asteroids.eachAsteroid(function (asteroid) {

            const newX = asteroid.x() + Math.sin(asteroid.heading) * (asteroid.velocity * time);
            const newY = asteroid.y() + Math.cos(asteroid.heading) * (asteroid.velocity * time);
            asteroid.x(newX).y(newY);
            keepOnStage(asteroid, stage);
            const newRotation = asteroid.rotation() + (asteroid.rotationSpeed) * time;
            asteroid.rotation(newRotation);

            if (!ship.isDestroyed && !ship.ghostMode && shapesTooClose(ship, asteroid, asteroid.radius + 15)) {
                ship.setGhostMode();
                asteroid.breakup(ship);
                sparks.newBatch({
                    origin: ship,
                    numSparks: 50,
                    fill: "orange",
                    radius: 3,
                    duration: 4,
                    distance: 500,
                });
                !ship.shields.areUp() && ship.die(true);
            }
        });
    }


    function animateShip(frame, ship, time, rotation) {

        if (ship.isDestroyed) return false;

        if (keyboardHandler.left()) ship.rotation(rotation - ship.rotationSpeed * time);
        if (keyboardHandler.right()) ship.rotation(rotation + ship.rotationSpeed * time);

        if (keyboardHandler.up() || keyboardHandler.down()) {
            const forwardOrBackward = keyboardHandler.up() ? 1 : -1;
            ship.burn(true, forwardOrBackward);
            changeSpeed(ship, frame, forwardOrBackward);
        } else {
            ship.burn(false);
        }

        ship.x(ship.x() + ship.momentum.x);
        ship.y(ship.y() + ship.momentum.y);

        ufo.get().each(ufo => {
            if (!shapesTooClose(ship, ufo, ufo.width() / 2)) return false;
            ship.die(true);
            ufo.destroyMe();
        });

        keepOnStage(ship, stage);
    }


    function changeSpeed(shape, frame, forwardOrBackward) {

        const time = frame.timeDiff / 1000; // around 0.016
        const rotationRadians = shape.rotation() * (Math.PI / 180);

        const newX = Math.sin(rotationRadians) * forwardOrBackward;
        const newY = -Math.cos(rotationRadians) * forwardOrBackward;

        shape.momentum.x += newX * shape.acceleration * time;
        shape.momentum.y += newY * shape.acceleration * time;

        return true;
    }


    function positionRandomly(shape, opt = {}) {
        if (opt.mode === "practice") {
            shape.x(stage.width() / 2);
            shape.y(stage.height() / 4);
        } else {
            shape.x(Math.random() * stage.width());
            shape.y(Math.random() * stage.height());
        }
    }


    function LivesDisplay(obj = {}) {

        obj = $.extend({
            layer: null, // required!
            icon: null, // required!
            spacing: obj.spacing ?? 30,
            opacity: obj.opacity ?? 0.4,
            scale: obj.scale ?? 1,
            bufferX: obj.bufferX ?? 60,
            bufferY: obj.bufferY ?? 60,
            stroke: obj.stroke ?? "yellow",
        }, obj);

        let iconsArray = [];

        for (let i = 0; i < obj.numLives - 1; i++) {
            const icon = obj.icon.clone({
                x: obj.bufferX + i * obj.spacing,
                y: obj.bufferY,
                stroke: obj.stroke,
            }).cache().moveTo(obj.layer);
            iconsArray.push(icon);
        }

        function removeOne() {
            if (!iconsArray.length) return true;
            iconsArray.pop().destroy();
            obj.layer.batchDraw();
        }

        return {
            removeOne,
        };
    }


    function Ship(shipSettings = {}) {

        shipSettings = $.extend({
            image: null, // NEW TEST
            startX: stage.width() / 2,
            startY: stage.height() / 2,
            fill: "black",
            stroke: "white",
            strokeWidth: isMobile ? 2 : 1,
            shipWidth: 20,
            shipHeight: 30,
            burnTriangleOpacity: 1,
            burnTriangleFill: "yellow",
            numLives: 3,
            mainShieldDuration: 20, // seconds
            spawnShieldDuration: 3,
            ghostModeDuration: 200,
            onSpawn: function () {
                //
            },
        }, shipSettings);

        function spawn() {
            keyboardHandler.clearAll();
            shipGroup.x(shipSettings.startX);
            shipGroup.y(shipSettings.startY);
            shipGroup.rotation(0);
            shipGroup.moveTo(shipSettings.layer);
            shipGroup.isDestroyed = false;
            livesDisplay.removeOne();
            shipSettings.onSpawn();
            shipGroup.momentum = { x: 0, y: 0, };
        }

        // keyboardHandler.onKeydown(66, () => {
        //     const timeToStop = 2; // seconds
        //     const decelerationX = shipGroup.momentum.x / (60 * timeToStop);
        //     const decelerationY = shipGroup.momentum.y / (60 * timeToStop);
        //     let brakeInterval = setInterval(() => {
        //         shipGroup.momentum.x -= decelerationX;
        //         shipGroup.momentum.y -= decelerationY;
        //         shipGroup.momentum.x = Math.max(shipGroup.momentum.x, 0);
        //         shipGroup.momentum.y = Math.max(shipGroup.momentum.y, 0);
        //         if (shipGroup.momentum.y === 0) clearInterval(brakeInterval);
        //     }, 20);
        // });

        const shipGroup = new Konva.Group({
            x: shipSettings.startX,
            y: shipSettings.startY,
            listening: false,
        }).moveTo(shipSettings.layer);

        const shipBody = new Konva.Line({
            fill: shipSettings.fill,
            stroke: shipSettings.stroke,
            strokeWidth: shipSettings.strokeWidth,
            points: [0, 0, shipSettings.shipWidth, 0, shipSettings.shipWidth / 2, -shipSettings.shipHeight],
            closed: true,
            listening: false,
        });
        shipBody.offsetX(shipSettings.shipWidth / 2).offsetY(-shipSettings.shipHeight / 2).cache().moveTo(shipGroup);

        const livesDisplay = LivesDisplay({
            numLives: shipSettings.numLives,
            icon: shipBody,
            layer: controlsLayer,
        });

        const mainShieldCircle = new Konva.Circle({
            radius: shipSettings.shipWidth * 1.1,
            opacity: 0.4,
            visible: false,
            fill: "rgba(245, 245, 245, 0.4)",
            listening: false,
        }).cache().moveTo(shipGroup);

        const mainShieldRing = new Konva.Arc({
            innerRadius: shipSettings.shipWidth * 1.05,
            outerRadius: shipSettings.shipWidth * 1.25,
            fill: "yellow",
            visible: false,
            opacity: 0.5,
            angle: 360,
            listening: false,
        }).moveTo(shipGroup);

        const spawnShieldRing = mainShieldRing.clone().moveTo(shipGroup);

        const burnTriangle = shipBody.clone({
            fill: shipSettings.burnTriangleFill,
            rotation: 180,
            offsetY: shipBody.height() * 1.3,
            scaleY: 0.5,
            scaleX: 0.8,
            opacity: 0,
        }).cache().moveTo(shipGroup);

        // preventing too many consecutive asteroid collisions when shielded
        shipGroup.setGhostMode = function () {
            ship.ghostMode = true;
            setTimeout(() => ship.ghostMode = false, shipSettings.ghostModeDuration);
        };

        shipGroup.isHittable = function () {
            return !shipGroup.shields.areUp() && !shipGroup.isDestroyed && !shipGroup.ghostMode;
        };

        shipGroup.shields = (function () {

            let mainShieldsUp = false;
            let spawnShieldsUp = false;
            let mainShieldsRemaining = true;
            let spawnTimeout = null;

            $(window).on("keydown", e => {
                e.key === "s" && toggleMainShields();
            });

            const mainShieldsTween = new Konva.Tween({
                node: mainShieldRing,
                angle: 0,
                duration: shipSettings.mainShieldDuration,
                onFinish: () => {
                    mainShieldsUp = false;
                    mainShieldsRemaining = false;
                    mainShieldCircle.visible(false);
                    mainShieldRing.visible(false);
                },
            }); // not playing yet

            function toggleMainShields() {
                if (!mainShieldsRemaining) return;
                mainShieldsUp = !mainShieldsUp;
                mainShieldCircle.visible(mainShieldsUp);
                mainShieldRing.visible(mainShieldsUp);
                mainShieldsTween[mainShieldsUp ? "play" : "pause"]();
                return this;
            }

            function shipIsShielded() {
                return mainShieldsUp || spawnShieldsUp;
            }

            return {
                areUp: shipIsShielded,
                toggleMainShields,
                spawnShields: () => {
                    spawnShieldsUp = true;
                    spawnShieldRing.visible(true).outerRadius(mainShieldRing.outerRadius()).to({
                        outerRadius: spawnShieldRing.innerRadius(),
                        duration: shipSettings.spawnShieldDuration,
                        onFinish: () => {
                            spawnShieldRing.visible(false);
                            spawnShieldsUp = false;
                        }
                    });
                }
            };
        }());

        shipGroup.burn = function (value, direction) {
            burnTriangle.opacity(value && direction === 1 ? shipSettings.burnTriangleOpacity : 0);
            soundEffects[value ? "play" : "stop"]("thrust");
        };

        shipGroup.die = function (doUseSparks) {
            shipGroup.isDestroyed = true;
            soundEffects.stop("thrust");
            shipGroup.numLives -= 1;
            doUseSparks && sparks.newBatch({
                origin: shipGroup,
                numSparks: 50,
                fill: "orange",
                radius: 3,
                duration: 4,
                distance: 500,
            });
            if (shipGroup.numLives <= 0) {
                shipGroup.destroy();
                clip.remove();
                gameEnd();
            } else {
                shipGroup.remove();
                setTimeout(spawn, 2000);
            }
        }

        shipGroup.rotationSpeed = 180; // 90 degrees per second
        shipGroup.acceleration = 6; // accelerates 10mph per second
        shipGroup.maxVelocity = 10;
        // shipGroup.friction = 10;
        shipGroup.numLives = shipSettings.numLives;
        shipGroup.momentum = {
            x: 0,
            y: 0,
        };

        return shipGroup;
    }

    // function blastCircle(obj = {}) {
    //     obj = $.extend({
    //         radius: 10,
    //         stroke: "white",
    //         strokeWidth: 2,
    //         blastDuration: 1,
    //         endRadius: 80,
    //         onFinish: function () {
    //             //
    //         },
    //     }, obj);
    //     const blastCircle = new Konva.Circle({
    //         x: obj.x,
    //         y: obj.y,
    //         radius: obj.radius,
    //         stroke: obj.stroke,
    //         strokeWidth: obj.strokeWidth,
    //         listening: false,
    //     }).moveTo(layer);
    //     blastCircle.to({
    //         duration: obj.blastDuration,
    //         radius: obj.endRadius,
    //         opacity: 0,
    //         easing: Konva.Easings.EaseOut,
    //         onFinish: function () {
    //             blastCircle.destroy();
    //             obj.onFinish();
    //         }
    //     });
    // }

    function Controls(stage) {

        const steer = (function () {

            let startRotation = null;
            let shipStartRotation = null;

            // private
            function getAngle() {
                const v1 = ship.x() - stage.getPointerPosition().x;
                const v2 = ship.y() - stage.getPointerPosition().y;
                return Math.atan2(v1, v2) * (180 / Math.PI); // radians to degrees
            }

            function beginSteering(e) {
                startRotation = getAngle();
                shipStartRotation = ship.rotation();
            }

            function dragMove(e) {
                const diffRotation = getAngle() - startRotation;
                const newRotation = shipStartRotation - diffRotation;
                ship.rotation(newRotation);
            }

            return {
                beginSteering,
                dragMove,
            };
        }());

        let steeringStart = 0;
        let topBottomBuffer = 0.2;
        let sousaArea = new Konva.Rect({
            x: 0,
            y: 0,
            width: stage.width(),
            height: stage.height(),
            draggable: true,
            dragBoundFunc: pos => { // keeping it stationary
                return {
                    x: sousaArea.x(),
                    y: sousaArea.y(),
                };
            },
        }).cache()
            .moveTo(controlsLayer)
            .on("dragmove", steer.dragMove)
            .on("dragstart", steer.beginSteering)
            .on("click tap", function () {
                keyboardHandler.simulate(32, true);
                keyboardHandler.simulate(32, false); // turning off immediately so we fire only one bullet
            });

        function controlButton(obj = {}) {

            if (!isMobile) return {};

            obj = $.extend({
                image: null, // required
                x: null, // required
                y: null, // required
                layer: controlsLayer,
                radius: 30,
                fill: "skyblue",
                opacity: 1,
                width: 0.7,
                onClick: () => {
                    //
                },
                onTouchstart: () => {
                    //
                },
                onTouchend: () => {
                    //
                },
            }, obj);


            const group = new Konva.Group({
                x: obj.x,
                y: obj.y,
            }).moveTo(obj.layer);


            const circle = new Konva.Circle({
                radius: obj.radius,
                fill: obj.fill,
                opacity: obj.opacity,
            }).moveTo(group);


            obj.image.setAttrs({
                width: obj.radius * 2 * obj.width,
                height: obj.radius * 2 * obj.width,
            });
            centerShape(obj.image);
            obj.image.moveTo(group);


            group.cache().on("click tap", obj.onClick)
                .on("mousedown touchstart", obj.onTouchstart)
                .on("mouseup touchend", obj.onTouchend);


            obj.layer.batchDraw();


            return group;
        }


        let fireButton, leftButton, rightButton, forwardButton, backButton, pauseButton, shieldsButton;


        const buffer = 30;
        const spacing = (stage.width() - buffer * 2) / 6;


        function calculateX(num) {
            return spacing * num + buffer;
        }


        function calculateY() {
            return stage.height() - 30 - 15;
        }


        Konva.Image.fromURL("images/asteroids/triangle.svg", image => {
            image.rotate(180).scaleX(1.3).scaleY(1.3);
            leftButton = controlButton({
                image: image,
                x: calculateX(0),
                y: calculateY(),
                fill: "orange",
                onTouchstart: () => keyboardHandler.simulate(37, true),
                onTouchend: () => keyboardHandler.simulate(37, false),
            });
        });


        Konva.Image.fromURL("images/asteroids/triangle.svg", image => {
            image.rotate(90).scaleX(1.3).scaleY(1.3);
            backButton = controlButton({
                image: image,
                x: calculateX(1),
                y: calculateY(),
                onTouchstart: () => keyboardHandler.simulate(40, true),
                onTouchend: () => keyboardHandler.simulate(40, false),
            });
        });


        Konva.Image.fromURL("images/asteroids/shields-button.svg", image => {
            shieldsButton = controlButton({
                image: image,
                fill: "green",
                width: 0.6,
                x: calculateX(2),
                y: calculateY(),
                onClick: ship.shields.toggle,
            });
        });


        Konva.Image.fromURL("images/asteroids/star.svg", image => {
            fireButton = controlButton({
                image: image,
                fill: "red",
                x: calculateX(3),
                y: calculateY(),
                onTouchstart: () => keyboardHandler.simulate(32, true),
                onTouchend: () => keyboardHandler.simulate(32, false),
            });
        });


        Konva.Image.fromURL("images/asteroids/pause.svg", image => {
            pauseButton = controlButton({
                image: image,
                fill: "green",
                width: 0.5,
                x: calculateX(4),
                y: calculateY(),
                onClick: pauser.togglePause,
            });
        });


        Konva.Image.fromURL("images/asteroids/triangle.svg", image => {
            image.rotate(270).scaleX(1.3).scaleY(1.3);
            backButton = controlButton({
                image: image,
                x: calculateX(5),
                y: calculateY(),
                onTouchstart: () => keyboardHandler.simulate(38, true),
                onTouchend: () => keyboardHandler.simulate(38, false),
            });
        });


        Konva.Image.fromURL("images/asteroids/triangle.svg", image => {
            image.scaleX(1.3).scaleY(1.3);
            rightButton = controlButton({
                image: image,
                x: calculateX(6),
                y: calculateY(),
                fill: "orange",
                onTouchstart: () => keyboardHandler.simulate(39, true),
                onTouchend: () => keyboardHandler.simulate(39, false),
            });
        });


        controlsLayer.batchDraw();


        return {
            //
        };
    }


    function gameEnd() {
        setTimeout(function () {
            $("#end-screen").removeClass("my-template").find("#try-again").on("click tap", () => {
                location.reload();
            });
        }, 2000);
    }



    /////////  Start-screen stuff  ///////////////////////////////////////////




    $(".start-button").click(function () {
        const numAsteroids = $(this).data("numasteroids");
        const asteroidVelocity = $(this).data("asteroidvelocity");
        const mode = $(this).data("mode");
        $("#start-screen").remove();
        newGame({
            numAsteroids,
            asteroidVelocity,
            mode,
        })
    });
});
