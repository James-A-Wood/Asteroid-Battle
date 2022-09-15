function AsteroidField(settings = {}) {

    const that = this;
    const log = console.log;
    const standardVelocity = settings.isMobile ? 25 : 50;
    const positionRandomly = settings.positionRandomly;

    this.onBreakup = () => undefined;
    this.layer = null; // required

    settings = $.extend({
        layer: null, // required
        numPoints: 6,
        radius: 40,
        stroke: "white",
        strokeWidth: 2,
        numBreakupFragments: 3,
        numBreakupGenerations: 3,
        numWrinkles: 3,
        asteroidRotationSpeed: 45,
        tension: 0.1,
        velocity: Math.random() * standardVelocity + standardVelocity,
        rotationSpeed: 45,
    }, settings);

    let allAsteroidsArray = [];

    this.getAllAsteroids = () => this.stage.find(".asteroid");

    const calculatePoints = (radius, numPoints) => {
        let array = [];
        for (let p = 0; p < numPoints; p++) {
            const radians = p * (Math.PI * 2) / numPoints;
            const x = Math.cos(radians) * radius + (Math.random() * radius / 3);
            const y = Math.sin(radians) * radius + (Math.random() * radius / 3);
            array.push(x, y);
        }
        return array;
    };

    this.clearAll = () => {
        this.getAllAsteroids().each(asteroid => asteroid.destroy());
        layer.batchDraw();
    };

    this.eachAsteroid = func => {
        this.getAllAsteroids().each(asteroid => func(asteroid));
    };

    const newAsteroid = (astSettings = {}) => {

        astSettings = $.extend({
            x: null,
            y: null,
            radius: null,
            heading: Math.random() * Math.PI * 2,
            generation: 1,
            mode: null, // may be "practice"
        }, astSettings);

        const radius = astSettings.radius ?? settings.radius;

        const group = new Konva.Group({
            x: astSettings.x,
            y: astSettings.y,
            name: "asteroid",
        }).moveTo(this.layer);

        // the body itself
        const asteroidBody = new Konva.Line({
            stroke: settings.stroke,
            strokeWidth: settings.strokeWidth,
            points: calculatePoints(radius, settings.numPoints),
            tension: settings.tension,
            closed: true,
            fill: "black",
        }).cache().moveTo(group);

        // adding wrinkles
        for (let i = 0; i < settings.numWrinkles; i++) {
            const segmentLength = radius / 6;
            const wrinkle = new Konva.Line({
                stroke: settings.stroke,
                strokeWidth: settings.strokeWidth,
                offsetX: Math.random() * radius / 3,
                offsetY: Math.random() * radius / 3,
                points: [-segmentLength, 0, 0, 0, segmentLength, -segmentLength],
                rotation: Math.random() * 360,
            }).moveTo(group);
        }

        if (!group.x() || !group.y()) {
            positionRandomly(group, { mode: astSettings.mode }); // basically passing in "practice" so the asteroid is stationary
            while (shapesTooClose(group, that.ship, Math.min(that.stage.height(), that.stage.width()) * 0.2)) positionRandomly(group);
        }

        allAsteroidsArray.push(group);

        group.generation = astSettings.generation;
        group.velocity = astSettings.velocity;
        group.rotationSpeed = astSettings.rotationSpeed || settings.rotationSpeed;
        group.heading = astSettings.heading;
        group.radius = astSettings.radius || settings.radius;

        group.breakup = () => {

            that.onBreakup(group);

            if (group.generation >= settings.numBreakupGenerations) return group.destroyMe();

            for (let i = 0; i < settings.numBreakupFragments; i++) {
                newAsteroid({
                    x: group.x(),
                    y: group.y(),
                    radius: group.radius / 2,
                    velocity: group.velocity * 2,
                    rotationSpeed: group.rotationSpeed * 1.5,
                    generation: group.generation + 1,
                });
            }

            allAsteroidsArray.splice(allAsteroidsArray.indexOf(group), 1);
            group.destroy();
        };

        group.destroyMe = function () {
            allAsteroidsArray.splice(allAsteroidsArray.indexOf(this), 1);
            group.destroy();
        }
    }
    this.newAsteroid = newAsteroid;
}

export { AsteroidField };