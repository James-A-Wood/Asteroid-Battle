function Sparks(layer, tweenManager) {

    const log = console.log;
    let sparksArray = [];

    this.pause = () => sparksArray.forEach(tween => tween?.pause());
    this.resume = () => sparksArray.forEach(tween => tween?.play());

    this.newBatch = (obj = {}) => {
        sparksArray.length = 0;
        obj = $.extend({
            origin: null, // required
            layer: layer,
            numSparks: obj.numSparks ?? 25,
            fill: obj.fill ?? "yellow",
            radius: obj.sparkRadius ?? 2,
            duration: obj.durationSeconds ?? 1,
            distance: obj.distance ?? 125,
        }, obj);
        for (let i = 0; i < obj.numSparks; i++) newSpark(obj, tweenManager);
    };

    function newSpark(obj, tweenManager) {

        const spark = new Konva.Circle({
            x: obj.origin.x(),
            y: obj.origin.y(),
            radius: obj.radius,
            fill: obj.fill,
            listening: false,
        }).moveTo(obj.layer).cache();

        const heading = Math.random() * 2 * Math.PI;
        const distance = obj.distance * 0.75 + Math.random() * obj.distance * 0.5;
        const destX = spark.x() + Math.cos(heading) * distance;
        const destY = spark.y() + Math.sin(heading) * distance;
        const duration = obj.duration * 0.5 + Math.random() * obj.duration;

        let sparkTween = new Konva.Tween({
            node: spark,
            x: destX,
            y: destY,
            duration: duration,
            opacity: 0,
            easing: Konva.Easings.EaseOut,
            onFinish: () => spark.destroy(),
            name: "tween",
        }).play();

        tweenManager.register(sparkTween);

        sparksArray.push(sparkTween);
    }
}


export { Sparks };